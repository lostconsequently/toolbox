const { get, run, dbReady } = require("../database/db");
const { getLoggingConfig } = require("./loggingConfigService");

const RETENTION_CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly

// api/auth categories map onto security_retention_days for v1 - the
// retention UI groups system / error / security+auth+api as
// "Application / Error / Audit" logs (see LoggingTab's retention form),
// matching the 3-bucket retention the feature was asked for without
// fragmenting logging_config into 5 separate columns for 5 categories.
function retentionDaysForCategory(category, config) {
  if (category === "system") return config.systemRetentionDays;
  if (category === "error") return config.errorRetentionDays;

  return config.securityRetentionDays; // security, auth, api
}

const CATEGORIES = ["system", "error", "security", "api", "auth"];

// Age-based purge per category, then a hard-cap trim independent of age -
// if the table still exceeds maxTotalRows after the age-based pass (e.g. a
// burst of errors well inside the retention window), the oldest rows are
// trimmed down to the cap so event_log can never grow unbounded between
// purge cycles. Used by both the scheduled job below and the manual
// POST /api/admin/logs/purge route, so behavior stays identical either way.
async function deleteLogs({ olderThanDays, category } = {}) {
  let deleted = 0;

  const categories = category ? [category] : CATEGORIES;

  for (const cat of categories) {
    let cutoff = null;

    if (olderThanDays !== undefined && olderThanDays !== null) {
      cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
    }

    // eslint-disable-next-line no-await-in-loop
    const result = cutoff
      ? await run(
          "DELETE FROM event_log WHERE category = ? AND created_at < ?",
          [cat, cutoff],
        )
      : await run("DELETE FROM event_log WHERE category = ?", [cat]);

    deleted += result.changes ?? 0;
  }

  return deleted;
}

async function purgeExpiredLogs() {
  const config = await getLoggingConfig();
  let deleted = 0;

  for (const category of CATEGORIES) {
    const days = retentionDaysForCategory(category, config);

    if (!days) continue; // 0 = keep forever

    // eslint-disable-next-line no-await-in-loop
    deleted += await deleteLogs({ olderThanDays: days, category });
  }

  const countRow = await get("SELECT COUNT(*) as count FROM event_log");
  const rowCount = countRow?.count ?? 0;

  if (rowCount > config.maxTotalRows) {
    const excess = rowCount - config.maxTotalRows;

    const result = await run(
      `DELETE FROM event_log WHERE id IN (
         SELECT id FROM event_log ORDER BY created_at ASC, id ASC LIMIT ?
       )`,
      [excess],
    );

    deleted += result.changes ?? 0;
  }

  return deleted;
}

let retentionTimer = null;

function scheduleNextPurge() {
  if (retentionTimer) {
    clearTimeout(retentionTimer);
    retentionTimer = null;
  }

  retentionTimer = setTimeout(async () => {
    try {
      const deleted = await purgeExpiredLogs();

      if (deleted) {
        // Lazily required to avoid a require-cycle at module load (logService
        // itself has no dependency back on this file, but keeping this
        // require local makes that non-relationship explicit).
        const { logInfo } = require("./logService");

        logInfo({
          category: "system",
          eventType: "logs.retention_purge",
          source: "LOGS",
          message: `Automatic log retention purge removed ${deleted} entries`,
          details: { deleted },
        });
      }
    } catch (err) {
      const { logError } = require("./logService");

      logError({
        category: "error",
        eventType: "logs.retention_purge_failed",
        source: "LOGS",
        message: "Automatic log retention purge failed",
        error: err,
      });
    } finally {
      scheduleNextPurge();
    }
  }, RETENTION_CHECK_INTERVAL_MS);

  retentionTimer.unref();
}

// Same fix as a boot-race bug already hit once with backup scheduling:
// wait for the schema to actually exist before the very first read.
dbReady.then(() => scheduleNextPurge());

module.exports = { purgeExpiredLogs, deleteLogs, scheduleNextPurge };
