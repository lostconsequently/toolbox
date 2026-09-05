const { get, run } = require("../database/db");

async function getBackupConfig() {
  const row = await get("SELECT * FROM backup_config WHERE id = 1");

  if (!row) {
    return {
      intervalHours: 24,
      maxBackups: 10,
      lastRunAt: null,
      lastRunStatus: null,
    };
  }

  return {
    intervalHours: row.intervalHours,
    maxBackups: row.maxBackups,
    lastRunAt: row.lastRunAt,
    lastRunStatus: row.lastRunStatus,
  };
}

async function setBackupConfig({ intervalHours, maxBackups }) {
  await run(
    `UPDATE backup_config
     SET interval_hours = ?,
         max_backups = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [intervalHours, maxBackups],
  );

  return getBackupConfig();
}

// Called after every scheduled run attempt (created/skipped/failed), not
// just successes - "last run" should reflect that the schedule is actually
// alive, even on a run that didn't produce a new backup file.
//
// Stores a JS-generated ISO 8601 string rather than SQL's CURRENT_TIMESTAMP
// (which writes "YYYY-MM-DD HH:MM:SS" with no timezone marker) - the same
// reasoning sessionService.js already follows for expires_at: `new
// Date("YYYY-MM-DD HH:MM:SS")` is parsed as local time by the JS engine, so
// reading a UTC value written that way back out and comparing it against
// Date.now() silently skews by the server's UTC offset.
async function recordBackupRun(status) {
  await run(
    `UPDATE backup_config
     SET last_run_at = ?,
         last_run_status = ?
     WHERE id = 1`,
    [new Date().toISOString(), status],
  );
}

module.exports = {
  getBackupConfig,
  setBackupConfig,
  recordBackupRun,
};
