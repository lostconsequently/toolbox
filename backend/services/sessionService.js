const crypto = require("crypto");
const { get, run } = require("../database/db");
const { fetchUserById } = require("./userService");
const { logError } = require("./logService");

const DEFAULT_TIMEOUT_MINUTES = 480; // 8h, matches the previous in-memory token TTL

// The raw token goes in the cookie; only its SHA-256 hash is ever stored, so
// a leaked database (a backup file, say) doesn't hand over live sessions -
// same reasoning as the recovery key and Entra client secret. This is a fast
// hash deliberately, not bcrypt: the token itself is 256 bits of
// crypto-random entropy, there's nothing weak here to slow-hash against.
function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

async function createSession(
  userId,
  { ipFingerprint, userAgent, timeoutMinutes } = {},
) {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const minutes = timeoutMinutes || DEFAULT_TIMEOUT_MINUTES;
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  await run(
    `INSERT INTO sessions (id, user_id, expires_at, ip_fingerprint, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [tokenHash, userId, expiresAt, ipFingerprint || null, userAgent || null],
  );

  return { rawToken, expiresAt };
}

// Returns the session's user (never the raw password hash - fetchUserById
// already excludes it), or null for anything invalid/expired. Expired
// sessions are lazily deleted here rather than only by the sweep below, so a
// request never treats a stale row as valid even between sweep runs.
async function validateSession(rawToken) {
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);

  const session = await get(
    "SELECT id, user_id, expires_at FROM sessions WHERE id = ?",
    [tokenHash],
  );

  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await run("DELETE FROM sessions WHERE id = ?", [tokenHash]);
    return null;
  }

  const user = await fetchUserById(session.userId);

  if (!user || !user.isActive) return null;

  return user;
}

async function destroySession(rawToken) {
  if (!rawToken) return;

  await run("DELETE FROM sessions WHERE id = ?", [hashToken(rawToken)]);
}

async function destroyAllSessionsForUser(userId) {
  await run("DELETE FROM sessions WHERE user_id = ?", [userId]);
}

async function countActiveSessions() {
  const row = await get(
    "SELECT COUNT(*) AS count FROM sessions WHERE expires_at > CURRENT_TIMESTAMP",
  );

  return row?.count || 0;
}

// Per-user session count for the Local Users table (see routes/users.js) -
// a resurfaced "revoke sessions" action is more useful when it's clear
// there's actually something to revoke.
async function countActiveSessionsForUser(userId) {
  const row = await get(
    "SELECT COUNT(*) AS count FROM sessions WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP",
    [userId],
  );

  return row?.count || 0;
}

// Same lazy-sweep pattern as the old in-memory admin token map in
// routes/auth.js - periodically clear rows nothing will ever read as valid
// again, instead of letting the table grow forever.
function startSessionCleanupSweep() {
  return setInterval(
    () => {
      run("DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP").catch(
        (err) =>
          logError({
            category: "error",
            eventType: "auth.session_cleanup_failed",
            source: "AUTH",
            message: "Session cleanup sweep failed",
            error: err,
          }),
      );
    },
    60 * 60 * 1000,
  ).unref();
}

module.exports = {
  createSession,
  validateSession,
  destroySession,
  destroyAllSessionsForUser,
  countActiveSessions,
  countActiveSessionsForUser,
  startSessionCleanupSweep,
};
