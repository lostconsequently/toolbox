// Pure console-line formatting, deliberately dependency-free (no require of
// database/db.js or services/logService.js). database/db.js's own bootstrap
// failures (can't open the file, schema init failed) happen before the
// database exists at all, so they can't route through the full logService
// (which itself depends on db.js for the DB write) without creating a
// require cycle. This tiny module is shared by both: logService.js uses it
// for its normal console line, db.js uses it directly for the handful of
// pre-database-availability failures that can only ever be console output.

function formatConsoleLine({ level, source, message }) {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);

  return `[${timestamp}] ${level.toUpperCase()} [${source}] ${message}`;
}

function consoleMethodFor(level) {
  if (level === "info") return console.log;
  if (level === "warning") return console.warn;

  return console.error; // error, critical
}

function printLogLine({ level, source, message }) {
  consoleMethodFor(level)(formatConsoleLine({ level, source, message }));
}

module.exports = { formatConsoleLine, consoleMethodFor, printLogLine };
