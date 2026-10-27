const fs = require("fs");
const path = require("path");
const { get, run } = require("../database/db");
const { getLegacyBrandingUploadsDir } = require("../utils/brandingUploads");

// Every field nullable = NULL means "use the built-in default" (see
// schema.sql's comment on branding_config). Kept as a flat object rather
// than auth_config's shape-with-computed-extras pattern since nothing here
// needs server-side-only secrets stripped out - branding is inherently
// public (it has to render on the pre-login page), unlike auth config.
async function getBrandingConfig() {
  const row = await get("SELECT * FROM branding_config WHERE id = 1");

  if (!row) {
    return {
      appName: null,
      tagline: null,
      companyName: null,
      logoPath: null,
      faviconPath: null,
      primaryColor: null,
      accentColor: null,
      loginTitle: null,
      loginSubtitle: null,
      loginWelcomeMessage: null,
      loginBackgroundPath: null,
    };
  }

  return {
    appName: row.appName,
    tagline: row.tagline,
    companyName: row.companyName,
    logoPath: row.logoPath,
    faviconPath: row.faviconPath,
    primaryColor: row.primaryColor,
    accentColor: row.accentColor,
    loginTitle: row.loginTitle,
    loginSubtitle: row.loginSubtitle,
    loginWelcomeMessage: row.loginWelcomeMessage,
    loginBackgroundPath: row.loginBackgroundPath,
  };
}

// Text/color fields only - logo/favicon/login-background paths are managed
// separately by setBrandingFilePath (upload/remove/restore-default all funnel
// through that instead of this general update, since they also touch the
// filesystem).
async function setBrandingConfig({
  appName,
  tagline,
  companyName,
  primaryColor,
  accentColor,
  loginTitle,
  loginSubtitle,
  loginWelcomeMessage,
}) {
  await run(
    `UPDATE branding_config
     SET app_name = ?,
         tagline = ?,
         company_name = ?,
         primary_color = ?,
         accent_color = ?,
         login_title = ?,
         login_subtitle = ?,
         login_welcome_message = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [
      appName || null,
      tagline || null,
      companyName || null,
      primaryColor || null,
      accentColor || null,
      loginTitle || null,
      loginSubtitle || null,
      loginWelcomeMessage || null,
    ],
  );

  return getBrandingConfig();
}

// `column` is one of the three *_path columns - shared by the logo/favicon/
// login-background upload and remove endpoints (Phase 2). Passing `null`
// clears it (remove / restore default).
async function setBrandingFilePath(column, filename) {
  const allowedColumns = ["logo_path", "favicon_path", "login_background_path"];

  if (!allowedColumns.includes(column)) {
    throw new Error(`Invalid branding file column: ${column}`);
  }

  await run(
    `UPDATE branding_config SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    [filename || null],
  );
}

const BRANDING_FILENAME_PATTERN = /^[a-z-]+-\d+\.(png|jpg|webp)$/;

const MIME_BY_EXT = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

async function saveBrandingFile(filename, mimeType, data) {
  await run(
    "INSERT OR REPLACE INTO branding_files (filename, mime_type, data) VALUES (?, ?, ?)",
    [filename, mimeType, data],
  );
}

async function deleteBrandingFile(filename) {
  if (!filename) return;

  await run("DELETE FROM branding_files WHERE filename = ?", [filename]);

  const legacyPath = path.join(
    getLegacyBrandingUploadsDir(),
    path.basename(filename),
  );

  if (fs.existsSync(legacyPath)) {
    try {
      fs.unlinkSync(legacyPath);
    } catch {
      // best effort - the database row is the source of truth now
    }
  }
}

// Falls back to the pre-database on-disk location so images uploaded before
// this change (or referenced by a backup made before it) keep working; the
// first hit copies the file into the database so it is part of every later
// backup.
async function importLegacyBrandingFile(filename) {
  if (!BRANDING_FILENAME_PATTERN.test(filename)) return null;

  const legacyPath = path.join(getLegacyBrandingUploadsDir(), filename);

  if (!fs.existsSync(legacyPath)) return null;

  const data = fs.readFileSync(legacyPath);
  const mimeType = MIME_BY_EXT[path.extname(filename).slice(1)];

  await saveBrandingFile(filename, mimeType, data);

  return { mimeType, data };
}

async function getBrandingFile(filename) {
  if (!BRANDING_FILENAME_PATTERN.test(filename)) return null;

  const row = await get(
    "SELECT mime_type, data FROM branding_files WHERE filename = ?",
    [filename],
  );

  if (row) {
    return { mimeType: row.mimeType, data: row.data };
  }

  return importLegacyBrandingFile(filename);
}

async function resetBrandingConfig() {
  await run(
    `UPDATE branding_config
     SET app_name = NULL,
         tagline = NULL,
         company_name = NULL,
         logo_path = NULL,
         favicon_path = NULL,
         primary_color = NULL,
         accent_color = NULL,
         login_title = NULL,
         login_subtitle = NULL,
         login_welcome_message = NULL,
         login_background_path = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
  );

  return getBrandingConfig();
}

module.exports = {
  getBrandingConfig,
  setBrandingConfig,
  setBrandingFilePath,
  resetBrandingConfig,
  saveBrandingFile,
  deleteBrandingFile,
  getBrandingFile,
};
