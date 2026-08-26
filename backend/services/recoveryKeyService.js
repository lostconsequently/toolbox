const crypto = require("crypto");
const { get, run } = require("../database/db");

// Same fast-hash reasoning as sessionService's token hashing - the raw key
// is 160 bits of crypto-random entropy, nothing weak to slow-hash against.
function hashKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

// XXXX-XXXX-XXXX-XXXX-XXXX - grouped for readability when an admin has to
// write it down or read it back over the phone.
function formatKey(buffer) {
  const chars = buffer
    .toString("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 20);

  return chars.match(/.{1,4}/g).join("-");
}

function generateRawKey() {
  return formatKey(crypto.randomBytes(20));
}

// Only one active (unused) recovery key at a time - generating a new one
// immediately retires any previous unused key, so an admin can't be left
// wondering which of several keys still works. Used/retired keys are kept
// around (not deleted) purely as an audit trail via used_at.
async function generateRecoveryKey() {
  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);

  await run("DELETE FROM recovery_keys WHERE used_at IS NULL");
  await run("INSERT INTO recovery_keys (key_hash) VALUES (?)", [keyHash]);

  return rawKey;
}

async function hasActiveRecoveryKey() {
  const row = await get(
    "SELECT id FROM recovery_keys WHERE used_at IS NULL LIMIT 1",
  );

  return Boolean(row);
}

// Single-use: the matching row is marked used in the same call, so a raced
// second attempt with the same (leaked/guessed) key can never succeed twice.
async function consumeRecoveryKey(rawKey) {
  if (!rawKey) return false;

  const keyHash = hashKey(rawKey);

  const row = await get(
    "SELECT id FROM recovery_keys WHERE key_hash = ? AND used_at IS NULL",
    [keyHash],
  );

  if (!row) return false;

  await run(
    "UPDATE recovery_keys SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
    [row.id],
  );

  return true;
}

module.exports = {
  generateRecoveryKey,
  hasActiveRecoveryKey,
  consumeRecoveryKey,
};
