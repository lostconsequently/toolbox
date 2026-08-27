const { get, run } = require("../database/db");

// Same nullable-single-row shape as backupConfigService/brandingService.
// `completed` defaults to false (fresh install) if the row is somehow
// missing - schema.sql always seeds it, this is just a safe fallback.
async function getSetupStatus() {
  const row = await get("SELECT * FROM setup_status WHERE id = 1");

  if (!row) {
    return {
      completed: false,
      completedAt: null,
      language: null,
      timezone: null,
      theme: null,
    };
  }

  return {
    completed: Boolean(row.completed),
    completedAt: row.completedAt,
    language: row.language,
    timezone: row.timezone,
    theme: row.theme,
  };
}

async function isSetupComplete() {
  const { completed } = await getSetupStatus();

  return completed;
}

async function markSetupComplete({ language, timezone, theme }) {
  await run(
    `UPDATE setup_status
     SET completed = 1,
         completed_at = CURRENT_TIMESTAMP,
         language = ?,
         timezone = ?,
         theme = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [language || null, timezone || null, theme || null],
  );

  return getSetupStatus();
}

module.exports = {
  getSetupStatus,
  isSetupComplete,
  markSetupComplete,
};
