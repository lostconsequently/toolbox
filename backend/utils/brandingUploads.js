const { resolveDataPath } = require("./dataPaths");

// Images used to be written to disk here before they moved into the
// branding_files table. Only read from now, to import files uploaded by an
// earlier version (see brandingService.importLegacyBrandingFile) - never
// created, so a fresh install doesn't get an empty unused directory.
function getLegacyBrandingUploadsDir() {
  return resolveDataPath(
    process.env.BRANDING_UPLOADS_DIR,
    "database/uploads/branding",
  );
}

module.exports = { getLegacyBrandingUploadsDir };
