const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();

const { validate, validationError } = require("../utils/validate");
const { createRateLimiter } = require("../utils/rateLimiter");
const { resolveDataPath, ensureDir } = require("../utils/dataPaths");
const { getBrandingUploadsDir } = require("../utils/brandingUploads");
const { detectImageType } = require("../utils/imageValidation");
const { requireAdmin } = require("./auth");
const { logWarning } = require("../services/logService");
const {
  getBrandingConfig,
  setBrandingConfig,
  setBrandingFilePath,
  resetBrandingConfig,
} = require("../services/brandingService");

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const brandingSchema = {
  appName: { type: "string", label: "Application name", max: 60 },
  tagline: { type: "string", label: "Tagline", max: 120 },
  companyName: { type: "string", label: "Company name", max: 80 },
  loginTitle: { type: "string", label: "Login title", max: 60 },
  loginSubtitle: { type: "string", label: "Login subtitle", max: 120 },
  loginWelcomeMessage: {
    type: "string",
    label: "Welcome message",
    max: 200,
  },
};

// A *_path column (logo/favicon/login-background) becomes a public URL under
// /uploads/branding/ (see app.js's static mount) - never the bare filename,
// so every consumer (Sidebar, Login, the Branding tab's preview) can just
// drop the value straight into an <img src>.
function toPublicShape(config) {
  return {
    appName: config.appName,
    tagline: config.tagline,
    companyName: config.companyName,
    primaryColor: config.primaryColor,
    accentColor: config.accentColor,
    loginTitle: config.loginTitle,
    loginSubtitle: config.loginSubtitle,
    loginWelcomeMessage: config.loginWelcomeMessage,
    logoUrl: config.logoPath ? `/uploads/branding/${config.logoPath}` : null,
    faviconUrl: config.faviconPath
      ? `/uploads/branding/${config.faviconPath}`
      : null,
    loginBackgroundUrl: config.loginBackgroundPath
      ? `/uploads/branding/${config.loginBackgroundPath}`
      : null,
  };
}

function validateHexColor(value, label) {
  if (!value) return null;

  if (!HEX_COLOR_PATTERN.test(value)) {
    return {
      error: `${label} must be a hex color like #3b82f6`,
      code: "branding.invalidColor",
      params: { label },
    };
  }

  return null;
}

function deleteUploadedFile(filename) {
  if (!filename) return;

  // filename is only ever one this app generated itself (see
  // createUploadHandler below), never a client-supplied value, so this is
  // defensive rather than load-bearing - path.basename() strips any
  // separator just in case a stored value were ever malformed.
  const filePath = path.join(getBrandingUploadsDir(), path.basename(filename));

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      logWarning({
        category: "error",
        eventType: "upload.cleanup_failed",
        source: "BRANDING",
        message: `Could not delete branding file: ${path.basename(filePath)}`,
        error: err,
      });
    }
  }
}

// Public - the login page (reachable before anyone is signed in) needs the
// app name, colors and logo/background URLs to render at all. Same
// reasoning as /api/auth/status being public.
router.get("/", async (req, res, next) => {
  try {
    const config = await getBrandingConfig();

    res.json(toPublicShape(config));
  } catch (err) {
    next(err);
  }
});

router.put("/", requireAdmin, async (req, res, next) => {
  try {
    const { value, errors } = validate(brandingSchema, req.body);

    if (errors.length) {
      return res.status(400).json(validationError(errors[0]));
    }

    const primaryColor = String(req.body?.primaryColor || "").trim();
    const accentColor = String(req.body?.accentColor || "").trim();

    const colorError =
      validateHexColor(primaryColor, "Primary color") ||
      validateHexColor(accentColor, "Accent color");

    if (colorError) {
      return res.status(400).json(colorError);
    }

    const updated = await setBrandingConfig({
      appName: value.appName,
      tagline: value.tagline,
      companyName: value.companyName,
      primaryColor,
      accentColor,
      loginTitle: value.loginTitle,
      loginSubtitle: value.loginSubtitle,
      loginWelcomeMessage: value.loginWelcomeMessage,
    });

    res.json(toPublicShape(updated));
  } catch (err) {
    next(err);
  }
});

router.post("/reset", requireAdmin, async (req, res, next) => {
  try {
    const existing = await getBrandingConfig();

    deleteUploadedFile(existing.logoPath);
    deleteUploadedFile(existing.faviconPath);
    deleteUploadedFile(existing.loginBackgroundPath);

    const config = await resetBrandingConfig();

    res.json(toPublicShape(config));
  } catch (err) {
    next(err);
  }
});

// --- Logo / favicon / login-background upload + remove ---
//
// One multer instance per slot (each gets its own size cap) sharing the same
// temp-dir-then-validate-then-move shape as backup.js's database restore:
// land in temp, check real content via magic bytes (never trust the
// client's filename/Content-Type), then copy into the branding uploads dir
// under a server-generated filename before removing whatever the slot
// previously held.

const tempDir = resolveDataPath(process.env.TEMP_DIR, "temp");

ensureDir(tempDir);

const uploadLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });

const SLOTS = {
  logo: {
    column: "logo_path",
    configField: "logoPath",
    maxSize: 2 * 1024 * 1024,
  },
  favicon: {
    column: "favicon_path",
    configField: "faviconPath",
    maxSize: 1 * 1024 * 1024,
  },
  "login-background": {
    column: "login_background_path",
    configField: "loginBackgroundPath",
    maxSize: 8 * 1024 * 1024,
  },
};

function createUploadHandlers(slotName) {
  const slot = SLOTS[slotName];
  const upload = multer({ dest: tempDir, limits: { fileSize: slot.maxSize } });

  const runUpload = (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: "The file is too large.",
          code: "branding.fileTooLarge",
        });
      }

      if (err) {
        return next(err);
      }

      next();
    });
  };

  const handleUpload = async (req, res, next) => {
    const uploadedFile = req.file?.path;

    if (!uploadedFile) {
      return res.status(400).json({
        error: "No file uploaded",
        code: "branding.noFile",
      });
    }

    const cleanupTemp = () => {
      if (fs.existsSync(uploadedFile)) {
        try {
          fs.unlinkSync(uploadedFile);
        } catch (err) {
          logWarning({
            category: "error",
            eventType: "upload.cleanup_failed",
            source: "BRANDING",
            message: "Could not delete temporary branding upload",
            error: err,
          });
        }
      }
    };

    try {
      const detected = detectImageType(uploadedFile);

      if (!detected) {
        cleanupTemp();

        return res.status(400).json({
          error: "Only PNG, JPG or WEBP images are supported.",
          code: "branding.invalidImage",
        });
      }

      const filename = `${slotName}-${Date.now()}.${detected.ext}`;
      const destPath = path.join(getBrandingUploadsDir(), filename);

      fs.copyFileSync(uploadedFile, destPath);

      const existing = await getBrandingConfig();
      const previousFilename = existing[slot.configField];

      await setBrandingFilePath(slot.column, filename);

      // Only remove the old file after the new one is safely written and
      // the DB points at it - if the copy or DB update above had thrown,
      // the previous file (and the config pointing at it) is untouched.
      deleteUploadedFile(previousFilename);

      const updated = await getBrandingConfig();

      res.json(toPublicShape(updated));
    } catch (err) {
      next(err);
    } finally {
      cleanupTemp();
    }
  };

  return [uploadLimiter, requireAdmin, runUpload, handleUpload];
}

function createRemoveHandler(slotName) {
  const slot = SLOTS[slotName];

  return async (req, res, next) => {
    try {
      const existing = await getBrandingConfig();

      deleteUploadedFile(existing[slot.configField]);

      await setBrandingFilePath(slot.column, null);

      const updated = await getBrandingConfig();

      res.json(toPublicShape(updated));
    } catch (err) {
      next(err);
    }
  };
}

for (const slotName of Object.keys(SLOTS)) {
  router.post(`/${slotName}`, ...createUploadHandlers(slotName));
  router.delete(`/${slotName}`, requireAdmin, createRemoveHandler(slotName));
}

module.exports = router;
