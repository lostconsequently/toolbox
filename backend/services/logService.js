const { run, dbReady } = require("../database/db");
const { redactDetails, sanitizeForLogLine } = require("../utils/logRedaction");
const { formatConsoleLine, consoleMethodFor } = require("../utils/logLine");

const LEVELS = ["info", "warning", "error", "critical"];

// The DB isn't guaranteed to be open/migrated the instant a module first
// calls logEvent() at require-time (a scheduler kicking off at boot, for
// example) - a prior bug crashed the process by querying a brand-new table
// before schema init had finished. The console line always fires
// synchronously regardless; the DB row is buffered here until dbReady
// resolves, then flushed in order. Capped so a stuck dbReady can't leak
// memory forever.
const MAX_BUFFER = 500;
const buffer = [];
let ready = false;

dbReady.then(async () => {
  ready = true;

  const pending = buffer.splice(0);

  for (const row of pending) {
    // eslint-disable-next-line no-await-in-loop
    await insertRow(row).catch((err) => {
      console.error("[LOG] Failed to flush buffered log row:", err.message);
    });
  }
});

// Extra destinations beyond the always-on console line + event_log row
// below (e.g. a future syslog or HTTP-forwarder sink) register here -
// additive, no change needed to logEvent() or any existing call site.
const sinks = [];

function registerSink(sinkFn) {
  sinks.push(sinkFn);
}

function extractUser(user, req) {
  const actual = user || req?.user || null;

  if (!actual) {
    return { userId: null, userLabel: null };
  }

  const label =
    actual.displayName ||
    actual.username ||
    actual.email ||
    (actual.id ? `#${actual.id}` : null);

  return {
    userId: actual.id ?? null,
    userLabel: label ? sanitizeForLogLine(label) : null,
  };
}

function extractIp(req) {
  if (!req) return null;

  return sanitizeForLogLine(req.ip || req.connection?.remoteAddress || null);
}

async function insertRow(row) {
  await run(
    `INSERT INTO event_log
       (level, category, event_type, source, message, user_id, user_label, ip, details, stack_trace)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.level,
      row.category,
      row.eventType,
      row.source,
      row.message,
      row.userId,
      row.userLabel,
      row.ip,
      row.details,
      row.stackTrace,
    ],
  );
}

function persistRow(row) {
  if (!ready) {
    if (buffer.length >= MAX_BUFFER) {
      buffer.shift();
    }

    buffer.push(row);
    return;
  }

  insertRow(row).catch((err) => {
    console.error("[LOG] Failed to write event_log row:", err.message);
  });
}

// Never awaited by callers - a logging call must never slow down or fail
// the request/operation that triggered it. Redaction runs unconditionally
// here (not opt-in per call site) so a future contributor can't forget it.
function logEvent({
  level,
  category,
  eventType,
  source,
  message,
  user,
  req,
  details,
  error,
  ip: explicitIp,
}) {
  if (!LEVELS.includes(level)) {
    throw new Error(`Invalid log level: ${level}`);
  }

  const safeMessage = sanitizeForLogLine(message);
  const { userId, userLabel } = extractUser(user, req);
  // Most callers have a `req` and let extractIp() read it; a background
  // job (e.g. backup.js's restore-session-expiry timer) has no request to
  // read but may already have computed an IP itself - explicit `ip` wins
  // when given.
  const ip =
    explicitIp !== undefined ? sanitizeForLogLine(explicitIp) : extractIp(req);
  const redactedDetails = details ? redactDetails(details) : null;

  // Deliberately NOT run through sanitizeForLogLine - a stack trace is
  // multi-line by nature and is only ever rendered in its own dedicated
  // panel in the Logging UI (LogDetailDrawer), never spliced into the
  // single-line console format above, so stripping its newlines would
  // only hurt readability for no injection benefit.
  const stackTrace = error?.stack || null;

  const line = formatConsoleLine({ level, source, message: safeMessage });

  consoleMethodFor(level)(line);

  const row = {
    level,
    category,
    eventType,
    source,
    message: safeMessage,
    userId,
    userLabel,
    ip,
    details: redactedDetails ? JSON.stringify(redactedDetails) : null,
    stackTrace,
  };

  persistRow(row);

  for (const sink of sinks) {
    try {
      sink(row);
    } catch (sinkErr) {
      console.error("[LOG] Sink failed:", sinkErr.message);
    }
  }
}

function logInfo(opts) {
  logEvent({ ...opts, level: "info" });
}

function logWarning(opts) {
  logEvent({ ...opts, level: "warning" });
}

function logError(opts) {
  logEvent({ ...opts, level: "error" });
}

function logCritical(opts) {
  logEvent({ ...opts, level: "critical" });
}

module.exports = {
  logEvent,
  logInfo,
  logWarning,
  logError,
  logCritical,
  registerSink,
};
