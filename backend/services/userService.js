const bcrypt = require("bcrypt");
const { all, get, run } = require("../database/db");
const { logInfo } = require("./logService");

const BCRYPT_COST = 12;
const VALID_ROLES = ["admin", "user"];

// Compared against on a login failure with an unknown username, so that
// path takes roughly the same time as a real bcrypt.compare() - see
// verifyLocalUserCredentials below for why that matters.
const DUMMY_HASH =
  "$2b$12$CwTycUXWue0Thq9StjUM0uJ8i6Vc.Q2H1a8fkK1sT9AaGZY1Zft0e";

const USER_COLUMNS = `
  id,
  source,
  username,
  email,
  display_name,
  role,
  is_active,
  created_at,
  updated_at,
  last_login_at
`;

// Never selected by the general-purpose helpers below - password_hash only
// ever leaves the database inside verifyLocalPassword's boolean result, never
// as a field on a returned user object.
function fetchUserById(id) {
  return get(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [id]);
}

function fetchUserByEmail(source, email) {
  return get(
    `SELECT ${USER_COLUMNS} FROM users WHERE source = ? AND email = ?`,
    [source, email],
  );
}

function fetchUserByUsername(username) {
  return get(
    `SELECT ${USER_COLUMNS} FROM users WHERE source = 'local' AND username = ?`,
    [username],
  );
}

function fetchLocalAdmin() {
  return get(
    `SELECT ${USER_COLUMNS} FROM users WHERE source = 'local' AND username IS NULL ORDER BY id ASC LIMIT 1`,
  );
}

async function verifyLocalPassword(userId, password) {
  const row = await get("SELECT password_hash FROM users WHERE id = ?", [
    userId,
  ]);

  if (!row?.passwordHash) return false;

  return bcrypt.compare(password, row.passwordHash);
}

// Username-enumeration-resistant: always runs a bcrypt comparison (against a
// dummy hash when the username doesn't exist, or the account is disabled)
// and always returns the same shape, so a timing difference or response
// shape can't reveal whether a given username is registered. Only a
// currently-enabled account can ever succeed.
async function verifyLocalUserCredentials(username, password) {
  const user = await get(
    "SELECT id, password_hash, is_active FROM users WHERE source = 'local' AND username = ?",
    [username],
  );

  const hash = user?.passwordHash || DUMMY_HASH;
  const passwordOk = await bcrypt.compare(password, hash);

  if (!user || !user.isActive || !passwordOk) {
    return null;
  }

  return fetchUserById(user.id);
}

async function setLocalPassword(userId, password) {
  const hash = await bcrypt.hash(password, BCRYPT_COST);

  await run(
    "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [hash, userId],
  );
}

async function touchLastLogin(userId) {
  await run("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [
    userId,
  ]);
}

// One-time migration, run at boot (see app.js): if no local user exists yet
// but ADMIN_PASSWORD is still set in the environment, create the local admin
// from it (bcrypt-hashed) so `.env` stops being the source of truth for the
// password going forward. Safe to call on every boot - it only acts once,
// the very first time a local user doesn't already exist. This is the
// single "emergency account" - distinct from the multiple, username-based
// accounts "Local users" mode manages (fetchLocalAdmin matches on
// username IS NULL specifically to keep the two concepts apart).
async function ensureLocalAdminUser() {
  const existing = await fetchLocalAdmin();

  if (existing) return existing;

  const envPassword = process.env.ADMIN_PASSWORD;

  if (!envPassword) {
    // No local user and no env password to migrate from - authentication
    // simply can't be switched to "local"/"hybrid" mode yet. This is fine:
    // the feature stays unusable (not broken) until an admin sets a password
    // via Admin Center, and "disabled" mode never needed a user row at all.
    return null;
  }

  const hash = await bcrypt.hash(envPassword, BCRYPT_COST);

  const result = await run(
    `INSERT INTO users (source, display_name, password_hash, role)
     VALUES ('local', 'Administrator', ?, 'admin')`,
    [hash],
  );

  logInfo({
    category: "system",
    eventType: "auth.local_admin_migrated",
    source: "AUTH",
    message:
      `Migrated the .env admin password into the database as the local admin user (id ${result.id}). ` +
      "ADMIN_PASSWORD in .env is no longer read once authentication is enabled.",
  });

  return fetchUserById(result.id);
}

function listUsers() {
  return all(`SELECT ${USER_COLUMNS} FROM users ORDER BY created_at ASC`);
}

// "Local users" mode accounts - username+password, distinct from the single
// legacy admin above. Role must already be validated by the caller (see
// routes/users.js) against VALID_ROLES exported below.
async function createLocalUser({ username, displayName, password, role }) {
  const hash = await bcrypt.hash(password, BCRYPT_COST);

  const result = await run(
    `INSERT INTO users (source, username, display_name, password_hash, role)
     VALUES ('local', ?, ?, ?, ?)`,
    [username, displayName, hash, role],
  );

  return fetchUserById(result.id);
}

async function updateUserDisplayName(userId, displayName) {
  await run(
    "UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [displayName, userId],
  );
}

async function setUserRole(userId, role) {
  await run(
    "UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [role, userId],
  );
}

async function setUserActive(userId, isActive) {
  await run(
    "UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [isActive ? 1 : 0, userId],
  );
}

async function deleteUser(userId) {
  await run("DELETE FROM users WHERE id = ?", [userId]);
}

// Guards "prevent deletion or disabling of the final active administrator" -
// counts only Local users/legacy-admin/Entra accounts with role='admin' AND
// is_active, i.e. accounts that can actually pass requireAdmin's Layer 1
// check. The Layer 2 shared ADMIN_PASSWORD is intentionally not part of this
// count: it's a separate emergency credential that can't be "deleted", so it
// never factors into whether a Local user is "the last admin".
async function countActiveAdmins() {
  const row = await get(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1",
  );

  return row?.count || 0;
}

// First successful sign-in for a given Entra account - JIT provisioning.
// Defaults new accounts to the least-privileged role ('user'); an existing
// admin has to explicitly promote them in the Local Users section. Group-to-
// role mapping (auto-assigning 'admin' to specific Entra groups) is
// deliberately not implemented yet - see the Authentication tab's Entra
// section for the allowlist this JIT provisioning already respects.
async function createEntraUser({ externalId, email, displayName }) {
  const result = await run(
    `INSERT INTO users (source, email, display_name, external_id, role)
     VALUES ('entra', ?, ?, ?, 'user')`,
    [email, displayName, externalId],
  );

  return fetchUserById(result.id);
}

// Keeps the display name (the only thing that can drift on Microsoft's side
// without changing the email/oid Toolbox keys the account on) fresh on every
// sign-in.
async function updateEntraUserProfile(userId, { displayName }) {
  await run(
    "UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [displayName, userId],
  );
}

module.exports = {
  VALID_ROLES,
  fetchUserById,
  fetchUserByEmail,
  fetchUserByUsername,
  fetchLocalAdmin,
  verifyLocalPassword,
  verifyLocalUserCredentials,
  setLocalPassword,
  touchLastLogin,
  ensureLocalAdminUser,
  listUsers,
  createLocalUser,
  updateUserDisplayName,
  setUserRole,
  setUserActive,
  deleteUser,
  countActiveAdmins,
  createEntraUser,
  updateEntraUserProfile,
};
