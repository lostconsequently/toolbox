const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

const router = express.Router();

const { resolveDataPath, ensureDir } = require("../utils/dataPaths");
const { dbPath, closeDatabase } = require("../database/db");
const {
  getSetupStatus,
  isSetupComplete,
  markSetupComplete,
  updateOrgDefaults,
} = require("../services/setupService");
const { applyCategoryPreset } = require("../services/setupSeedService");
const { requireAdmin } = require("./auth");
const {
  isSqliteDatabase,
  verifySqliteIntegrity,
  tryAcquireDbLock,
  releaseDbLock,
  reopenDatabase,
  getBackupDir,
} = require("./backup");
const {
  logInfo,
  logError,
  logWarning,
} = require("../services/logService");

const tempDir = resolveDataPath(process.env.TEMP_DIR, "temp");

ensureDir(tempDir);

const MAX_RESTORE_FILE_SIZE = 500 * 1024 * 1024;

const upload = multer({
  dest: tempDir,
  limits: { fileSize: MAX_RESTORE_FILE_SIZE },
});

// Pending wizard uploads, keyed by a one-time token. Unlike backup.js's own
// restore flow, /prepare here does NOT touch the live database or the lock
// at all - the wizard's summary/settings steps can sit for as long as the
// admin needs before the actual restore runs in /complete, and holding the
// DB lock across that whole window would block the automatic-backup timer
// and any other request needlessly.
const pendingSetupRestores = new Map();

const RESTORE_SESSION_TTL_MS = 10 * 60 * 1000;

function cleanupExpiredRestores() {
  const now = Date.now();

  for (const [token, session] of pendingSetupRestores.entries()) {
    if (session.expiresAt < now) {
      pendingSetupRestores.delete(token);

      try {
        fs.unlinkSync(session.tempFilePath);
      } catch {
        // Already gone - fine.
      }
    }
  }
}

setInterval(cleanupExpiredRestores, 60 * 1000).unref();

async function requireSetupIncomplete(req, res, next) {
  if (await isSetupComplete()) {
    return res.status(403).json({
      success: false,
      error: "Setup has already been completed.",
      code: "setup.alreadyComplete",
    });
  }

  next();
}

// Always reachable, even after setup completes - the frontend route gate
// polls this to decide whether to show the wizard at all.
router.get("/status", async (req, res, next) => {
  try {
    const status = await getSetupStatus();

    res.json(status);
  } catch (err) {
    next(err);
  }
});

// Lets an admin change the org-wide language/timezone/theme defaults after
// setup, from Admin Center's General tab - unlike everything else in this
// file, reachable regardless of whether setup is complete (it always is,
// by the time an admin can even reach Admin Center) and gated by the
// regular requireAdmin instead of requireSetupIncomplete.
router.put("/defaults", requireAdmin, async (req, res, next) => {
  try {
    const {
      language,
      timezone,
      theme,
      timeFormat,
      timeMode,
      timeOffsetMinutes,
      fontFamily,
    } = req.body || {};

    if (
      timeMode !== undefined &&
      timeMode !== null &&
      timeMode !== "" &&
      timeMode !== "auto" &&
      timeMode !== "manual"
    ) {
      return res.status(400).json({
        success: false,
        error: "Time mode must be 'auto' or 'manual'.",
        code: "setup.invalidTimeMode",
      });
    }

    let offset;

    if (timeOffsetMinutes !== undefined && timeOffsetMinutes !== null) {
      offset = Number(timeOffsetMinutes);

      // A manual date/time entry can legitimately be far off if the
      // server's own clock is badly wrong (wrong year, dead RTC battery,
      // etc.) - a year in either direction is generous enough to cover a
      // real correction while still rejecting obvious garbage input.
      const ONE_YEAR_MINUTES = 365 * 24 * 60;

      if (!Number.isInteger(offset) || Math.abs(offset) > ONE_YEAR_MINUTES) {
        return res.status(400).json({
          success: false,
          error: `Time offset must be a whole number of minutes between -${ONE_YEAR_MINUTES} and ${ONE_YEAR_MINUTES}.`,
          code: "setup.invalidTimeOffset",
        });
      }
    }

    const status = await updateOrgDefaults({
      language,
      timezone,
      theme,
      timeFormat,
      timeMode,
      timeOffsetMinutes: offset,
      fontFamily,
    });

    res.json(status);
  } catch (err) {
    next(err);
  }
});

function handleUpload(req, res, next) {
  upload.single("database")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        error: "The file is too large to restore.",
        code: "setup.fileTooLarge",
      });
    }

    if (err) {
      return next(err);
    }

    next();
  });
}

router.post(
  "/restore/prepare",
  requireSetupIncomplete,
  handleUpload,
  async (req, res) => {
    const uploadedFile = req.file?.path;

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
        code: "setup.noFile",
      });
    }

    const cleanupUpload = () => {
      try {
        fs.unlinkSync(uploadedFile);
      } catch {
        // Already gone - fine.
      }
    };

    if (!isSqliteDatabase(uploadedFile)) {
      cleanupUpload();

      return res.status(400).json({
        success: false,
        error: "Not a valid SQLite database file.",
        code: "setup.invalidDatabase",
      });
    }

    const integrityOk = await verifySqliteIntegrity(uploadedFile);

    if (!integrityOk) {
      cleanupUpload();

      return res.status(400).json({
        success: false,
        error:
          "The uploaded file failed the SQLite integrity check and is likely corrupted.",
        code: "setup.integrityFailed",
      });
    }

    const stat = fs.statSync(uploadedFile);
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + RESTORE_SESSION_TTL_MS;

    pendingSetupRestores.set(token, {
      tempFilePath: uploadedFile,
      expiresAt,
    });

    logInfo({
      category: "security",
      eventType: "setup.restore_prepared",
      source: "SETUP",
      message: "First Startup Wizard: a backup file was validated for restore.",
    });

    res.json({
      success: true,
      token,
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
    });
  },
);

router.post("/restore/cancel", requireSetupIncomplete, (req, res) => {
  const { token } = req.body || {};

  const session = pendingSetupRestores.get(token);

  if (session) {
    pendingSetupRestores.delete(token);

    try {
      fs.unlinkSync(session.tempFilePath);
    } catch {
      // Already gone - fine.
    }
  }

  res.json({ success: true });
});

router.post("/complete", requireSetupIncomplete, async (req, res, next) => {
  const { language, timezone, theme, timeFormat, restoreToken, seedOption } =
    req.body || {};

  let session = null;

  if (restoreToken) {
    session = pendingSetupRestores.get(restoreToken);

    if (!session) {
      return res.status(400).json({
        success: false,
        error: "Unknown or expired restore session. Start the restore again.",
        code: "setup.unknownSession",
      });
    }
  }

  if (session) {
    // Re-validate right before the destructive action (TOCTOU-safe): the
    // uploaded file could in theory have been altered or removed between
    // /prepare and this call.
    if (
      !fs.existsSync(session.tempFilePath) ||
      !isSqliteDatabase(session.tempFilePath) ||
      !(await verifySqliteIntegrity(session.tempFilePath))
    ) {
      pendingSetupRestores.delete(restoreToken);

      return res.status(400).json({
        success: false,
        error: "The backup could not be re-validated. Setup was not completed.",
        code: "setup.revalidationFailed",
      });
    }

    if (!tryAcquireDbLock()) {
      return res.status(409).json({
        success: false,
        error: "The database is busy. Try again shortly.",
        code: "setup.busy",
      });
    }

    const backupDir = getBackupDir();
    const safetyBackupPath = path.join(
      backupDir,
      `setup-safety-backup-${Date.now()}.db`,
    );

    try {
      fs.copyFileSync(dbPath, safetyBackupPath);

      await closeDatabase();

      fs.copyFileSync(session.tempFilePath, dbPath);

      await reopenDatabase();

      const restoredOk = await verifySqliteIntegrity(dbPath);

      if (!restoredOk) {
        throw new Error("The restored database failed its integrity check.");
      }
    } catch (err) {
      try {
        await closeDatabase();
        fs.copyFileSync(safetyBackupPath, dbPath);
        await reopenDatabase();
      } catch (rollbackErr) {
        logError({
          category: "error",
          eventType: "setup.rollback_failed",
          source: "SETUP",
          message:
            "First Startup Wizard: rollback to the safety backup also failed - the live database may be in a broken state",
          error: rollbackErr,
        });
      }

      logError({
        category: "error",
        eventType: "setup.restore_failed",
        source: "SETUP",
        message: "First Startup Wizard: restore failed, rolled back.",
        error: err,
      });

      releaseDbLock();

      // Deliberately NOT deleting the session/temp file here: the source
      // backup already passed re-validation above, so whatever failed was
      // on the live-DB side (copy/reopen/integrity), which a plain retry
      // with the same token may well succeed at on a second attempt. The
      // wizard's "Try again" button resubmits the same restoreToken - if it
      // pointed at a session that no longer existed, every retry would
      // immediately fail with an unrelated "unknown session" error instead
      // of actually retrying anything. The TTL sweep still reaps it if the
      // admin abandons the wizard instead of retrying.
      return res.status(500).json({
        success: false,
        error:
          "Restore failed. The database was automatically rolled back to its previous state.",
        code: "setup.restoreFailedRolledBack",
      });
    }

    pendingSetupRestores.delete(restoreToken);

    try {
      fs.unlinkSync(session.tempFilePath);
    } catch {
      // Already gone - fine.
    }

    releaseDbLock();
  } else {
    // Fresh-environment path: the database was already initialized at boot
    // (schema.sql). Optionally seed a starter set of categories/subcategories
    // (and, for "categoriesAndTools", one representative tool per
    // subcategory) before the final integrity sanity check.
    if (seedOption === "categories" || seedOption === "categoriesAndTools") {
      // Guards against two concurrent /complete calls (a second browser
      // tab, a client retry, or - in dev - React StrictMode's double effect
      // invoke) both passing the eligibility check and seeding the preset
      // twice before either has finished writing.
      if (!tryAcquireDbLock()) {
        return res.status(409).json({
          success: false,
          error: "The database is busy. Try again shortly.",
          code: "setup.busy",
        });
      }

      try {
        await applyCategoryPreset({
          includeTools: seedOption === "categoriesAndTools",
        });
      } catch (err) {
        logError({
          category: "error",
          eventType: "setup.preset_seed_failed",
          source: "SETUP",
          message: "First Startup Wizard: seeding the starter preset failed.",
          error: err,
        });

        return res.status(err.code === "setup.notEligibleForPreset" ? 409 : 500).json({
          success: false,
          error: err.message,
          code: err.code || "setup.presetSeedFailed",
        });
      } finally {
        releaseDbLock();
      }
    }

    const ok = await verifySqliteIntegrity(dbPath);

    if (!ok) {
      logWarning({
        category: "error",
        eventType: "setup.integrity_check_failed",
        source: "SETUP",
        message:
          "First Startup Wizard: the freshly-initialized database failed its integrity check.",
      });

      return res.status(500).json({
        success: false,
        error: "The database failed its integrity check.",
        code: "setup.integrityFailed",
      });
    }
  }

  try {
    const status = await markSetupComplete({
      language,
      timezone,
      theme,
      timeFormat,
    });

    logInfo({
      category: "system",
      eventType: "setup.completed",
      source: "SETUP",
      message: "First Startup Wizard completed.",
      details: { restored: Boolean(session), language, timezone, theme },
    });

    res.json({ success: true, status });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
