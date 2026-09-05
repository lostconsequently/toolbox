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
      timeFormat: null,
      timeMode: "auto",
      timeOffsetMinutes: 0,
      fontFamily: null,
    };
  }

  return {
    completed: Boolean(row.completed),
    completedAt: row.completedAt,
    language: row.language,
    timezone: row.timezone,
    theme: row.theme,
    timeFormat: row.timeFormat,
    timeMode: row.timeMode === "manual" ? "manual" : "auto",
    timeOffsetMinutes: row.timeOffsetMinutes ?? 0,
    fontFamily: row.fontFamily,
  };
}

async function isSetupComplete() {
  const { completed } = await getSetupStatus();

  return completed;
}

async function markSetupComplete({ language, timezone, theme, timeFormat }) {
  await run(
    `UPDATE setup_status
     SET completed = 1,
         completed_at = CURRENT_TIMESTAMP,
         language = ?,
         timezone = ?,
         theme = ?,
         time_format = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [language || null, timezone || null, theme || null, timeFormat || null],
  );

  return getSetupStatus();
}

// Lets an admin change the org-wide defaults after setup, without touching
// `completed`/`completed_at` - this is the same language/timezone/theme/
// time-format/time-offset set the wizard writes once, now editable going
// forward from Admin Center's General tab.
//
// A partial/empty text field is left untouched (COALESCE against the
// existing column) rather than nulled out - GeneralTab.jsx's fields all
// start blank if its initial load ever fails, and a blind overwrite here
// would let a transient fetch error silently wipe out real org defaults
// with one un-noticed Save click. timeOffsetMinutes is a number where 0 is
// a legitimate explicit value (not "clear the field"), so it's handled
// separately: only `undefined`/`null` means "leave it alone".
async function updateOrgDefaults({
  language,
  timezone,
  theme,
  timeFormat,
  timeMode,
  timeOffsetMinutes,
  fontFamily,
}) {
  await run(
    `UPDATE setup_status
     SET language = COALESCE(NULLIF(?, ''), language),
         timezone = COALESCE(NULLIF(?, ''), timezone),
         theme = COALESCE(NULLIF(?, ''), theme),
         time_format = COALESCE(NULLIF(?, ''), time_format),
         time_mode = COALESCE(NULLIF(?, ''), time_mode),
         time_offset_minutes = COALESCE(?, time_offset_minutes),
         font_family = COALESCE(NULLIF(?, ''), font_family),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [
      language || "",
      timezone || "",
      theme || "",
      timeFormat || "",
      timeMode || "",
      timeOffsetMinutes === undefined || timeOffsetMinutes === null
        ? null
        : timeOffsetMinutes,
      fontFamily || "",
    ],
  );

  return getSetupStatus();
}

module.exports = {
  getSetupStatus,
  isSetupComplete,
  markSetupComplete,
  updateOrgDefaults,
};
