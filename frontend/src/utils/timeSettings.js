// Applies the org-wide time display settings (timezone, 12h/24h format,
// manual drift-correction offset) consistently everywhere a timestamp is
// shown - the taskbar clock, the Logging tab, and the General tab's own
// live preview. Consumed via TimeSettingsContext rather than called
// directly with raw setup-status fields, so every caller stays in sync
// automatically when an admin changes these settings.
export function applyTimeOffset(date, timeOffsetMinutes) {
  if (!timeOffsetMinutes) return date;

  return new Date(date.getTime() + timeOffsetMinutes * 60 * 1000);
}

export function formatClockTime(date, { timezone, timeFormat, timeOffsetMinutes } = {}) {
  const adjusted = applyTimeOffset(date, timeOffsetMinutes);

  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone || undefined,
      hour: "2-digit",
      minute: "2-digit",
      hour12: timeFormat === "12h",
    }).format(adjusted);
  } catch {
    return adjusted.toLocaleTimeString();
  }
}

export function formatDateTime(date, { timezone, timeFormat, timeOffsetMinutes } = {}) {
  const adjusted = applyTimeOffset(date, timeOffsetMinutes);

  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone || undefined,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: timeFormat === "12h",
    }).format(adjusted);
  } catch {
    return adjusted.toLocaleString();
  }
}
