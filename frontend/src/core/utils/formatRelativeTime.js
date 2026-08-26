export function formatRelativeTime(timestampMs, t) {
  if (!timestampMs) return null;

  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestampMs) / 1000),
  );

  if (diffSeconds < 60) {
    return t("common.relativeTime.justNow");
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 60) {
    return t("common.relativeTime.minutesAgo", { count: diffMinutes });
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return t("common.relativeTime.hoursAgo", { count: diffHours });
  }

  const diffDays = Math.floor(diffHours / 24);

  return t("common.relativeTime.daysAgo", { count: diffDays });
}
