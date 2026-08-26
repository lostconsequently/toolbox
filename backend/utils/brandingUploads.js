const { resolveDataPath, ensureDir } = require("./dataPaths");

// Shared between routes/branding.js (writes files here) and app.js (serves
// them statically at /uploads/branding) so the directory is only resolved
// in one place.
function getBrandingUploadsDir() {
  const dir = resolveDataPath(
    process.env.BRANDING_UPLOADS_DIR,
    "database/uploads/branding",
  );

  ensureDir(dir);

  return dir;
}

module.exports = { getBrandingUploadsDir };
