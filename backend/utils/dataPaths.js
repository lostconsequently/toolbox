const fs = require("fs");
const path = require("path");

// backend/ root, regardless of which file requires this module or what the
// process cwd is (matters once PORT/DB_PATH/etc. come from Docker instead of
// `npm run dev` always being launched from backend/).
const BACKEND_ROOT = path.join(__dirname, "..");

// Absolute env values are used as-is (the normal case in Docker, e.g.
// DB_PATH=/data/db/toolbox.db). Relative values resolve against backend/ so
// behavior matches today's defaults regardless of process cwd.
function resolveDataPath(envValue, fallbackRelativePath) {
  const target =
    envValue && envValue.trim() ? envValue.trim() : fallbackRelativePath;

  return path.isAbsolute(target) ? target : path.resolve(BACKEND_ROOT, target);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

module.exports = { BACKEND_ROOT, resolveDataPath, ensureDir };
