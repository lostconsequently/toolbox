const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const { resolveDataPath, ensureDir } = require("../utils/dataPaths");
const { createRateLimiter } = require("../utils/rateLimiter");
const { validate, validationError } = require("../utils/validate");
const {
  getBackupConfig,
  setBackupConfig,
} = require("../services/backupConfigService");
const {
  logInfo,
  logWarning,
  logError,
  logCritical,
} = require("../services/logService");

const router = express.Router();

// tempDir and backupDir default under backend/ (matching today's behavior)
// but can be pointed at mounted volumes independently via env vars.
const tempDir = resolveDataPath(process.env.TEMP_DIR, "temp");

ensureDir(tempDir);

function getBackupDir() {
  const backupDir = resolveDataPath(process.env.BACKUP_DIR, "database/backups");

  ensureDir(backupDir);

  return backupDir;
}

const MAX_RESTORE_FILE_SIZE = 500 * 1024 * 1024;

const upload = multer({
  dest: tempDir,
  limits: {
    fileSize: MAX_RESTORE_FILE_SIZE,
  },
});

const {
  dbPath,
  closeDatabase,
  openDatabase,
  initializeDatabase,
  dbReady,
} = require("../database/db");

// A restored backup can predate a schema change (e.g. a backup made before the
// script library existed has no scripts/script_fields tables). The schema is
// otherwise only applied at process start, so every route that swaps the live
// database file has to re-apply it - all statements are IF NOT EXISTS, so this
// never touches restored data.
async function reopenDatabase() {
  await openDatabase();
  await initializeDatabase();
}

// A single in-memory lock covering every operation that touches the live
// database file on disk (automatic backups, upload-based restore, and the
// restore-from-backup flow below). Without this, two admins - or an admin
// and the daily backup timer - could interleave a close/copy/reopen with
// another one and corrupt the live database or a backup mid-write.
let dbBusy = false;

function tryAcquireDbLock() {
  if (dbBusy) {
    return false;
  }

  dbBusy = true;
  return true;
}

function releaseDbLock() {
  dbBusy = false;
}

// Exposed so app.js can answer every other in-flight request with a clean
// "come back shortly" instead of letting it hit getDatabase() while `db` is
// null during the close/copy/reopen window and fall through to a generic 500.
function isDatabaseBusy() {
  return dbBusy;
}

// Pending restore-from-backup sessions, keyed by a one-time random token.
// A session is created by /prepare (which also makes the safety backup) and
// only /commit or /cancel can resolve it. Sessions expire on their own so an
// admin abandoning the flow (closing the tab before the second confirm)
// can't leave the database locked indefinitely.
const pendingRestores = new Map();

const RESTORE_SESSION_TTL_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();

  for (const [token, session] of pendingRestores.entries()) {
    if (session.expiresAt < now) {
      pendingRestores.delete(token);
      releaseDbLock();

      logWarning({
        category: "security",
        eventType: "backup.restore_session_expired",
        source: "BACKUP",
        message: `Restore session ${token.slice(0, 8)}... expired without confirmation - lock released.`,
      });

      logRestoreAudit({
        action: "restore-from-backup-expired",
        status: "expired",
        restoredFile: session.filename,
        safetyBackupFile: session.safetyBackupFile,
      });
    }
  }
}, 60 * 1000).unref();

async function createAutomaticBackup() {
  if (!tryAcquireDbLock()) {
    logWarning({
      category: "system",
      eventType: "backup.skipped",
      source: "BACKUP",
      message:
        "Automatic backup skipped: the database is busy with another backup/restore action.",
    });
    return;
  }

  try {
    const backupDir = getBackupDir();

    const backupFile = path.join(backupDir, `daily-backup-${Date.now()}.db`);

    fs.copyFileSync(dbPath, backupFile);

    // A plain file copy can race a concurrent write to the live database and
    // land mid-transaction - verify the copy is actually restorable before
    // trusting it, the same way every restore path already does. A silently
    // corrupt daily backup would only be discovered during an actual
    // emergency, which is the worst possible time.
    const integrityOk = await verifySqliteIntegrity(backupFile);

    if (!integrityOk) {
      logError({
        category: "error",
        eventType: "backup.failed",
        source: "BACKUP",
        message:
          "Automatic backup failed its integrity check and was discarded",
        details: { backupFile: path.basename(backupFile) },
      });

      try {
        fs.unlinkSync(backupFile);
      } catch (cleanupErr) {
        logError({
          category: "error",
          eventType: "backup.cleanup_failed",
          source: "BACKUP",
          message: "Could not remove the corrupt automatic backup",
          details: { backupFile: path.basename(backupFile) },
          error: cleanupErr,
        });
      }

      return;
    }

    await cleanupOldBackups(backupDir);
  } finally {
    releaseDbLock();
  }
}

// Automatic daily backups and restore/safety backups used to share one
// global cap - a short burst of restores (each making its own safety
// backup) could evict the only recent legitimate daily backups, since every
// file competed for the same slots regardless of type. Each type now gets
// its own retention count. "automatic" is admin-configurable (Admin
// Center's Backup tab); "restore-safety" stays fixed - those are meant as a
// short-lived undo net around a single restore, not a long-term schedule.
const RESTORE_SAFETY_RETENTION = 5;

async function cleanupOldBackups(backupDir) {
  const { maxBackups } = await getBackupConfig();

  const retentionByType = {
    automatic: maxBackups,
    "restore-safety": RESTORE_SAFETY_RETENTION,
  };

  const backups = fs
    .readdirSync(backupDir)
    .filter((file) => file.endsWith(".db"))
    .map((file) => ({
      file,
      path: path.join(backupDir, file),
      mtime: fs.statSync(path.join(backupDir, file)).mtimeMs,
      type: getBackupType(file),
    }));

  const byType = new Map();

  for (const backup of backups) {
    const list = byType.get(backup.type) || [];
    list.push(backup);
    byType.set(backup.type, list);
  }

  for (const [type, list] of byType.entries()) {
    const keepCount = retentionByType[type];

    // An unrecognized filename pattern is never auto-deleted - better to
    // leave an unexpected file alone than guess wrong and lose it.
    if (!keepCount) continue;

    const oldBackups = list.sort((a, b) => b.mtime - a.mtime).slice(keepCount);

    for (const backup of oldBackups) {
      try {
        fs.unlinkSync(backup.path);

        logInfo({
          category: "system",
          eventType: "backup.deleted",
          source: "BACKUP",
          message: `Old backup deleted: ${backup.file}`,
        });
      } catch (err) {
        logError({
          category: "error",
          eventType: "backup.cleanup_failed",
          source: "BACKUP",
          message: `Could not delete backup: ${backup.file}`,
          error: err,
        });
      }
    }
  }
}

const SQLITE_HEADER_MAGIC = "SQLite format 3" + String.fromCharCode(0);

// Reads only the 16-byte magic header instead of the whole file - this now
// runs on every prepare/commit (including a re-check at commit time), and a
// backup can be up to MAX_RESTORE_FILE_SIZE (500MB); reading the full file
// just to look at its first 16 bytes would needlessly block the event loop.
function isSqliteDatabase(filePath) {
  let fd;

  try {
    fd = fs.openSync(filePath, "r");

    const buffer = Buffer.alloc(16);

    fs.readSync(fd, buffer, 0, 16, 0);

    return buffer.toString("utf8") === SQLITE_HEADER_MAGIC;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore
      }
    }
  }
}

// A valid SQLite header only proves the first 16 bytes look right - a
// truncated or partially-corrupted backup file can still pass that check.
// Opening it read-only and running PRAGMA integrity_check catches internal
// corruption before we ever copy the file over the live database.
function verifySqliteIntegrity(filePath) {
  return new Promise((resolve) => {
    const testDb = new sqlite3.Database(
      filePath,
      sqlite3.OPEN_READONLY,
      (err) => {
        if (err) {
          resolve(false);
          return;
        }

        testDb.get("PRAGMA integrity_check", (pragmaErr, row) => {
          testDb.close();

          if (pragmaErr) {
            resolve(false);
            return;
          }

          resolve(row?.integrity_check === "ok");
        });
      },
    );
  });
}

const BACKUP_FILENAME_PATTERN = /^[A-Za-z0-9_.-]+\.db$/;

// Combines three independent defenses against path traversal / escaping the
// backup directory: (1) a strict filename charset+extension allowlist, (2)
// resolving the joined path and requiring it stay inside the backup dir,
// and (3) resolving symlinks (realpath) before that containment check, so a
// symlinked file can't be used to point outside the backup directory either.
function resolveSafeBackupPath(filename) {
  if (
    typeof filename !== "string" ||
    !BACKUP_FILENAME_PATTERN.test(filename) ||
    filename.includes("..")
  ) {
    throw new Error("Invalid filename.");
  }

  const backupDir = getBackupDir();
  const candidatePath = path.join(backupDir, filename);

  if (!fs.existsSync(candidatePath) || !fs.statSync(candidatePath).isFile()) {
    const notFound = new Error("Backup file not found.");
    notFound.notFound = true;
    throw notFound;
  }

  const realBackupDir = fs.realpathSync(backupDir);
  const realCandidatePath = fs.realpathSync(candidatePath);

  if (!realCandidatePath.startsWith(realBackupDir + path.sep)) {
    throw new Error("The file is not in the official backup directory.");
  }

  return realCandidatePath;
}

function getBackupType(filename) {
  if (filename.startsWith("daily-backup-")) {
    return "automatic";
  }

  if (
    filename.startsWith("safety-backup-") ||
    filename.startsWith("restore-backup-")
  ) {
    return "restore-safety";
  }

  return "unknown";
}

// Restore/backup actions are privileged and destructive, so every outcome
// (prepared, cancelled, expired, succeeded, failed) is logged under the
// 'security' category - this used to hand-roll its own JSON-line file
// (restore-audit.log, unbounded growth, bypassed Docker's log rotation
// entirely); now it's just another event_log row via the shared logger,
// subject to the same retention/export/purge as everything else.
function logRestoreAudit({
  action,
  status,
  restoredFile,
  safetyBackupFile,
  error,
  ip,
  tokenFingerprint,
}) {
  const details = { restoredFile, safetyBackupFile, tokenFingerprint };

  // Accept either a plain message (older call sites) or a real Error - the
  // latter also gets its stack trace captured for the Logging UI's detail
  // drawer, not just the one-line message.
  const errorObj = error instanceof Error ? error : null;

  if (error) details.error = errorObj ? errorObj.message : error;

  const logFn = status === "failure" ? logError : logInfo;

  logFn({
    category: "security",
    eventType: `backup.${action}`,
    source: "BACKUP",
    message: `Restore ${action.replace(/-/g, " ")}: ${status}`,
    details,
    ip,
    error: errorObj || undefined,
  });
}

// There is no per-admin user account in this app (one shared admin
// password, session tokens only) - a hash fragment of the session token
// plus the request IP is the closest available "who" for audit purposes
// without ever writing the raw admin token to a log file on disk.
function getRequesterFingerprint(req) {
  const token = req.headers["x-admin-token"] || "";
  const hash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex")
    .slice(0, 12);

  return {
    ip: req.ip || req.connection?.remoteAddress || "unknown",
    tokenFingerprint: hash,
  };
}

router.get("/backups", (req, res) => {
  const backupDir = getBackupDir();

  const backups = fs
    .readdirSync(backupDir)
    .filter((file) => file.endsWith(".db"))
    .map((file) => {
      const fullPath = path.join(backupDir, file);

      const stats = fs.statSync(fullPath);

      return {
        name: file,
        size: stats.size,
        created: stats.mtime,
        type: getBackupType(file),
      };
    })
    .sort((a, b) => new Date(b.created) - new Date(a.created));

  res.json({
    backups,
  });
});

router.get("/database", (req, res) => {
  res.download(dbPath, `toolbox-${new Date().toISOString().split("T")[0]}.db`);
});

// Downloads one specific backup file from the official backup directory -
// used both for the per-backup "Download" action in the list, and to hand
// the auto-created safety backup to the admin's browser before a restore.
router.get("/download-backup/:filename", (req, res) => {
  let safePath;

  try {
    safePath = resolveSafeBackupPath(req.params.filename);
  } catch (err) {
    return res.status(err.notFound ? 404 : 400).json({
      success: false,
      error: err.message,
    });
  }

  res.download(safePath, path.basename(safePath));
});

function handleUpload(req, res, next) {
  upload.single("database")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        error: "The file is too large to restore.",
        code: "backup.fileTooLarge",
      });
    }

    if (err) {
      return next(err);
    }

    next();
  });
}

const restoreLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

router.post("/restore", restoreLimiter, handleUpload, async (req, res) => {
  const uploadedFile = req.file?.path;
  const requester = getRequesterFingerprint(req);

  if (!uploadedFile) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded",
      code: "backup.noFile",
    });
  }

  const cleanupUpload = () => {
    if (uploadedFile && fs.existsSync(uploadedFile)) {
      try {
        fs.unlinkSync(uploadedFile);
      } catch (cleanupError) {
        logWarning({
          category: "error",
          eventType: "backup.temp_cleanup_failed",
          source: "BACKUP",
          message: "Could not delete temporary restore upload file",
          error: cleanupError,
        });
      }
    }
  };

  if (!isSqliteDatabase(uploadedFile)) {
    cleanupUpload();

    return res.status(400).json({
      success: false,
      error: "Not a valid SQLite database file",
      code: "backup.invalidDatabase",
    });
  }

  const integrityOk = await verifySqliteIntegrity(uploadedFile);

  if (!integrityOk) {
    cleanupUpload();

    return res.status(400).json({
      success: false,
      error:
        "The uploaded file failed the SQLite integrity check and is likely corrupted.",
      code: "backup.integrityFailed",
    });
  }

  if (!tryAcquireDbLock()) {
    cleanupUpload();

    return res.status(409).json({
      success: false,
      error: "A backup or restore is already running. Try again shortly.",
      code: "backup.busy",
    });
  }

  const backupDir = getBackupDir();
  const backupFile = path.join(backupDir, `restore-backup-${Date.now()}.db`);

  try {
    fs.copyFileSync(dbPath, backupFile);

    await cleanupOldBackups(backupDir);

    await closeDatabase();

    fs.copyFileSync(uploadedFile, dbPath);

    await reopenDatabase();

    const restoredOk = await verifySqliteIntegrity(dbPath);

    if (!restoredOk) {
      throw new Error("The restored database failed its integrity check.");
    }

    logRestoreAudit({
      action: "restore-from-upload",
      status: "success",
      restoredFile: path.basename(uploadedFile),
      safetyBackupFile: path.basename(backupFile),
      ...requester,
    });

    res.json({
      success: true,
      message: "Database restored successfully",
      safetyBackupFile: path.basename(backupFile),
      restoredAt: new Date().toISOString(),
    });
  } catch (err) {
    // Never leave a broken database live: roll back to the safety backup we
    // made just before touching anything.
    try {
      await closeDatabase();
      fs.copyFileSync(backupFile, dbPath);
      await reopenDatabase();
    } catch (rollbackErr) {
      logCritical({
        category: "error",
        eventType: "restore.rollback_failed",
        source: "BACKUP",
        message:
          "Rollback to the safety backup also failed - the live database may be in a broken state",
        error: rollbackErr,
      });
    }

    logRestoreAudit({
      action: "restore-from-upload",
      status: "failure",
      restoredFile: path.basename(uploadedFile),
      safetyBackupFile: path.basename(backupFile),
      error: err,
      ...requester,
    });

    res.status(500).json({
      success: false,
      error:
        "Restore failed. The database was automatically rolled back to its previous state.",
      code: "backup.restoreFailedRolledBack",
    });
  } finally {
    cleanupUpload();
    releaseDbLock();
  }
});

// --- Restore from an existing backup already in the backup directory ---
//
// Split into prepare/commit so the UI can show the required two-step
// confirmation (warn -> make+download safety backup -> second confirm ->
// actually restore) without ever trusting the client for which file gets
// restored: the server holds the session, the client only ever passes back
// an opaque token.

router.post(
  "/restore-from-backup/prepare",
  restoreLimiter,
  async (req, res) => {
    const { filename } = req.body || {};
    const requester = getRequesterFingerprint(req);

    let safePath;

    try {
      safePath = resolveSafeBackupPath(filename);
    } catch (err) {
      return res.status(err.notFound ? 404 : 400).json({
        success: false,
        error: err.message,
      });
    }

    if (!isSqliteDatabase(safePath)) {
      return res.status(400).json({
        success: false,
        error: "The selected file is not a valid SQLite database file.",
        code: "backup.selectedInvalidDatabase",
      });
    }

    const integrityOk = await verifySqliteIntegrity(safePath);

    if (!integrityOk) {
      return res.status(400).json({
        success: false,
        error:
          "The selected backup failed the integrity check and cannot be restored.",
        code: "backup.selectedIntegrityFailed",
      });
    }

    if (!tryAcquireDbLock()) {
      return res.status(409).json({
        success: false,
        error: "A backup or restore is already running. Try again shortly.",
        code: "backup.busy",
      });
    }

    try {
      const backupDir = getBackupDir();
      const safetyBackupFile = path.join(
        backupDir,
        `safety-backup-${Date.now()}.db`,
      );

      fs.copyFileSync(dbPath, safetyBackupFile);

      const restoreToken = crypto.randomUUID();

      pendingRestores.set(restoreToken, {
        filename: path.basename(safePath),
        sourcePath: safePath,
        safetyBackupFile: path.basename(safetyBackupFile),
        expiresAt: Date.now() + RESTORE_SESSION_TTL_MS,
      });

      logRestoreAudit({
        action: "restore-from-backup-prepared",
        status: "pending",
        restoredFile: path.basename(safePath),
        safetyBackupFile: path.basename(safetyBackupFile),
        ...requester,
      });

      res.json({
        success: true,
        restoreToken,
        safetyBackupFile: path.basename(safetyBackupFile),
        expiresAt: new Date(Date.now() + RESTORE_SESSION_TTL_MS).toISOString(),
      });
    } catch (err) {
      releaseDbLock();

      logError({
        category: "error",
        eventType: "backup.failed",
        source: "BACKUP",
        message: "Could not create a safety backup before restore",
        error: err,
        req,
      });

      res.status(500).json({
        success: false,
        error: "Could not create a safety backup. Restore cancelled.",
        code: "backup.safetyBackupFailed",
      });
    }
  },
);

router.post("/restore-from-backup/cancel", (req, res) => {
  const { restoreToken } = req.body || {};

  const session = pendingRestores.get(restoreToken);

  if (session) {
    pendingRestores.delete(restoreToken);
    releaseDbLock();

    logRestoreAudit({
      action: "restore-from-backup-cancelled",
      status: "cancelled",
      restoredFile: session.filename,
      safetyBackupFile: session.safetyBackupFile,
      ...getRequesterFingerprint(req),
    });
  }

  res.json({ success: true });
});

router.post("/restore-from-backup/commit", async (req, res) => {
  const { restoreToken } = req.body || {};
  const requester = getRequesterFingerprint(req);

  const session = pendingRestores.get(restoreToken);

  if (!session) {
    return res.status(400).json({
      success: false,
      error: "Unknown or expired restore session. Start the restore again.",
      code: "backup.unknownSession",
    });
  }

  pendingRestores.delete(restoreToken);

  // Re-validate right before the destructive action (TOCTOU-safe): the
  // backup file could in theory have changed or been removed between
  // /prepare and this call.
  let sourcePath;

  try {
    sourcePath = resolveSafeBackupPath(session.filename);

    if (
      !isSqliteDatabase(sourcePath) ||
      !(await verifySqliteIntegrity(sourcePath))
    ) {
      throw new Error("The backup file is no longer valid.");
    }
  } catch (err) {
    releaseDbLock();

    logRestoreAudit({
      action: "restore-from-backup",
      status: "failure",
      restoredFile: session.filename,
      safetyBackupFile: session.safetyBackupFile,
      error: err,
      ...requester,
    });

    return res.status(400).json({
      success: false,
      error:
        "The backup could not be re-validated. Restore aborted, no changes were made.",
      code: "backup.revalidationFailed",
    });
  }

  const backupDir = getBackupDir();
  const safetyBackupPath = path.join(backupDir, session.safetyBackupFile);

  try {
    await closeDatabase();

    fs.copyFileSync(sourcePath, dbPath);

    await reopenDatabase();

    const restoredOk = await verifySqliteIntegrity(dbPath);

    if (!restoredOk) {
      throw new Error("The restored database failed its integrity check.");
    }

    await cleanupOldBackups(backupDir);

    const restoredAt = new Date().toISOString();

    logRestoreAudit({
      action: "restore-from-backup",
      status: "success",
      restoredFile: session.filename,
      safetyBackupFile: session.safetyBackupFile,
      ...requester,
    });

    res.json({
      success: true,
      restoredBackup: session.filename,
      safetyBackupFile: session.safetyBackupFile,
      restoredAt,
    });
  } catch (err) {
    // Never leave a broken database live: roll back to the safety backup
    // made in /prepare, right before we touched anything.
    try {
      await closeDatabase();
      fs.copyFileSync(safetyBackupPath, dbPath);
      await reopenDatabase();
    } catch (rollbackErr) {
      logCritical({
        category: "error",
        eventType: "restore.rollback_failed",
        source: "BACKUP",
        message:
          "Rollback to the safety backup also failed - the live database may be in a broken state",
        error: rollbackErr,
      });
    }

    logRestoreAudit({
      action: "restore-from-backup",
      status: "failure",
      restoredFile: session.filename,
      safetyBackupFile: session.safetyBackupFile,
      error: err,
      ...requester,
    });

    res.status(500).json({
      success: false,
      error:
        "Restore failed. The database was automatically rolled back to its previous state.",
      code: "backup.restoreFailedRolledBack",
    });
  } finally {
    releaseDbLock();
  }
});

// A self-rescheduling setTimeout (rather than one setInterval fixed at boot)
// so an admin changing the interval in Admin Center's Backup tab takes
// effect on the very next run, not just after a server restart - the config
// is re-read from the database at the start of every cycle.
let backupTimer = null;

async function scheduleNextBackup() {
  if (backupTimer) {
    clearTimeout(backupTimer);
    backupTimer = null;
  }

  const { intervalHours } = await getBackupConfig();
  const intervalMs = Math.max(1, intervalHours) * 60 * 60 * 1000;

  backupTimer = setTimeout(async () => {
    try {
      await createAutomaticBackup();

      logInfo({
        category: "system",
        eventType: "backup.created",
        source: "BACKUP",
        message: "Automatic database backup created",
      });
    } catch (err) {
      logError({
        category: "error",
        eventType: "backup.failed",
        source: "BACKUP",
        message: "Automatic backup failed",
        error: err,
      });
    } finally {
      scheduleNextBackup();
    }
  }, intervalMs);

  backupTimer.unref();
}

// Wait for the schema (including backup_config, which may be new to an
// existing database on this boot) to actually exist before the first read -
// calling this straight away raced ahead of initializeDatabase() on a fresh
// or upgrading deploy and crashed the process with "no such table:
// backup_config" before the migration in db.js had a chance to run.
dbReady.then(() => scheduleNextBackup());

const backupConfigSchema = {
  intervalHours: {
    type: "number",
    label: "Backup interval (hours)",
    required: true,
    min: 1,
    max: 168,
  },
  maxBackups: {
    type: "number",
    label: "Maximum automatic backups",
    required: true,
    min: 1,
    max: 100,
  },
};

router.get("/config", async (req, res, next) => {
  try {
    const config = await getBackupConfig();

    res.json(config);
  } catch (err) {
    next(err);
  }
});

router.put("/config", async (req, res, next) => {
  try {
    const { value, errors } = validate(backupConfigSchema, req.body);

    if (errors.length) {
      return res.status(400).json(validationError(errors[0]));
    }

    const updated = await setBackupConfig(value);

    // Apply the new interval immediately rather than waiting for the
    // currently-scheduled run to fire on the old cadence.
    scheduleNextBackup();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.isDatabaseBusy = isDatabaseBusy;
