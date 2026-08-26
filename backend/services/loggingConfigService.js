const { get, run } = require("../database/db");

const DEFAULTS = {
  systemRetentionDays: 30,
  errorRetentionDays: 90,
  securityRetentionDays: 180,
  maxTotalRows: 100000,
};

async function getLoggingConfig() {
  const row = await get("SELECT * FROM logging_config WHERE id = 1");

  if (!row) {
    return { ...DEFAULTS };
  }

  return {
    systemRetentionDays: row.systemRetentionDays,
    errorRetentionDays: row.errorRetentionDays,
    securityRetentionDays: row.securityRetentionDays,
    maxTotalRows: row.maxTotalRows,
  };
}

async function setLoggingConfig({
  systemRetentionDays,
  errorRetentionDays,
  securityRetentionDays,
  maxTotalRows,
}) {
  await run(
    `UPDATE logging_config
     SET system_retention_days = ?,
         error_retention_days = ?,
         security_retention_days = ?,
         max_total_rows = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [
      systemRetentionDays,
      errorRetentionDays,
      securityRetentionDays,
      maxTotalRows,
    ],
  );

  return getLoggingConfig();
}

module.exports = { getLoggingConfig, setLoggingConfig };
