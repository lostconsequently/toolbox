const { get, run } = require("../database/db");

async function getBackupConfig() {
  const row = await get("SELECT * FROM backup_config WHERE id = 1");

  if (!row) {
    return { intervalHours: 24, maxBackups: 10 };
  }

  return {
    intervalHours: row.intervalHours,
    maxBackups: row.maxBackups,
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

module.exports = {
  getBackupConfig,
  setBackupConfig,
};
