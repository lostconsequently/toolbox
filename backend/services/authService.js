const { get, run } = require("../database/db");
const { encrypt, decrypt, hasEncryptionKey } = require("../utils/crypto");

const VALID_MODES = ["disabled", "local", "local_users", "entra", "hybrid"];

function parseJsonArray(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Reads the single-row auth_config table. Always returns a usable object -
// schema.sql seeds row id=1 with mode='disabled' on every boot, so this
// should never actually be missing, but a defensive default keeps the app
// fail-safe (fail *disabled*, never fail into an unintended open door or a
// crash) if that row was ever somehow deleted.
async function getAuthConfig() {
  const row = await get("SELECT * FROM auth_config WHERE id = 1");

  if (!row) {
    return {
      mode: "disabled",
      sessionTimeoutMinutes: 480,
      entraTenantId: null,
      entraClientId: null,
      entraAllowedUsers: [],
      entraAllowedGroups: [],
    };
  }

  return {
    mode: VALID_MODES.includes(row.mode) ? row.mode : "disabled",
    sessionTimeoutMinutes: row.sessionTimeoutMinutes,
    entraTenantId: row.entraTenantId,
    entraClientId: row.entraClientId,
    // entraClientSecretEncrypted is deliberately left out - callers that
    // need it (the Entra OIDC client, Phase 4) read the raw row themselves;
    // every other caller (the login page, requireAuth) never needs the
    // secret and shouldn't be able to accidentally leak it downstream.
    entraAllowedUsers: parseJsonArray(row.entraAllowedUsers),
    entraAllowedGroups: parseJsonArray(row.entraAllowedGroups),
  };
}

// `mode` alone, for the hot path (requireAuth middleware checks this on
// every request) - skips building the full config object.
async function getAuthMode() {
  const row = await get("SELECT mode FROM auth_config WHERE id = 1");

  return row && VALID_MODES.includes(row.mode) ? row.mode : "disabled";
}

async function setAuthMode(mode) {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Invalid auth mode: ${mode}`);
  }

  await run(
    "UPDATE auth_config SET mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
    [mode],
  );
}

async function hasEntraClientSecret() {
  const row = await get(
    "SELECT entra_client_secret_encrypted FROM auth_config WHERE id = 1",
  );

  return Boolean(row?.entraClientSecretEncrypted);
}

// Decrypted, for the OIDC client only (entraService) - every other caller
// gets `entraClientSecretConfigured: boolean` from getAuthConfig/the GET
// route instead, never the secret itself.
async function getEntraClientSecret() {
  const row = await get(
    "SELECT entra_client_secret_encrypted FROM auth_config WHERE id = 1",
  );

  if (!row?.entraClientSecretEncrypted) return null;

  return decrypt(row.entraClientSecretEncrypted);
}

// `clientSecret` is optional: omit/empty it to keep whatever secret is
// already stored (the Admin Center field is always blank on load, exactly
// like a password field - "leave blank to keep the current one").
async function setEntraConfig({
  tenantId,
  clientId,
  clientSecret,
  allowedUsers,
  allowedGroups,
}) {
  let secretEncrypted = null;

  if (clientSecret) {
    secretEncrypted = encrypt(clientSecret);
  } else {
    const existing = await get(
      "SELECT entra_client_secret_encrypted FROM auth_config WHERE id = 1",
    );

    secretEncrypted = existing?.entraClientSecretEncrypted || null;
  }

  await run(
    `UPDATE auth_config
     SET entra_tenant_id = ?,
         entra_client_id = ?,
         entra_client_secret_encrypted = ?,
         entra_allowed_users = ?,
         entra_allowed_groups = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [
      tenantId || null,
      clientId || null,
      secretEncrypted,
      JSON.stringify(allowedUsers || []),
      JSON.stringify(allowedGroups || []),
    ],
  );
}

module.exports = {
  VALID_MODES,
  getAuthConfig,
  getAuthMode,
  setAuthMode,
  hasEntraClientSecret,
  getEntraClientSecret,
  setEntraConfig,
  hasEncryptionKey,
};
