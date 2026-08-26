// Redaction safeguards for backend/services/logService.js. Applied
// unconditionally inside logEvent() (never opt-in per call site) so no
// future call site can forget to scrub a secret before it reaches a
// Docker log line or the event_log table.

const SECRET_KEY_PATTERN =
  /password|secret|token|recoverykey|apikey|authorization|cookie/i;

const MAX_DEPTH = 5;

// Deep-walks a plain object/array, replacing any value whose key matches
// SECRET_KEY_PATTERN with "[REDACTED]". Depth-capped so a pathological or
// accidentally-circular input can't hang the process - values past the cap
// are dropped rather than serialized.
function redactDetails(value, depth = 0) {
  if (value === null || value === undefined) return value;

  if (depth >= MAX_DEPTH) {
    return "[TRUNCATED]";
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactDetails(entry, depth + 1));
  }

  if (typeof value === "object") {
    const result = {};

    for (const [key, entryValue] of Object.entries(value)) {
      result[key] = SECRET_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : redactDetails(entryValue, depth + 1);
    }

    return result;
  }

  return value;
}

// Strips control characters (newlines especially) from any user-controlled
// string before it's interpolated into a console line or a DB row - blocks
// a crafted username/User-Agent/path from forging fake log lines in
// `docker logs` output or in the event_log table.
function sanitizeForLogLine(value) {
  if (typeof value !== "string") return value;

  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x1f\x7f]+/g, " ").trim();
}

module.exports = { redactDetails, sanitizeForLogLine };
