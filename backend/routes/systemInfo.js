const express = require("express");
const fs = require("fs");
const router = express.Router();

const { get, dbPath } = require("../database/db");

// Backs the Admin Center's About tab. Read-only, no request body - kept as
// its own tiny router (rather than folded into authConfig.js or branding.js)
// since it isn't really "config" at all, just facts about the running
// instance. Mounted behind requireAdmin at the app.js level, same as
// auth-config.
router.get("/", async (req, res, next) => {
  try {
    const versionRow = await get("SELECT sqlite_version() AS version");

    let databaseSizeBytes = null;

    try {
      databaseSizeBytes = fs.statSync(dbPath).size;
    } catch {
      // The DB file is expected to exist by the time this route is ever
      // reachable (the app wouldn't have booted otherwise) - null here just
      // means "couldn't stat it", the About page shows that gracefully.
    }

    res.json({
      environment: process.env.NODE_ENV || "development",
      sqliteVersion: versionRow?.version || null,
      databaseSizeBytes,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
