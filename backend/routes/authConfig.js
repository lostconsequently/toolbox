const express = require("express");
const router = express.Router();

const { get, run } = require("../database/db");
const { validate, validationError } = require("../utils/validate");
const {
  getAuthConfig,
  hasEntraClientSecret,
  getEntraClientSecret,
  setEntraConfig,
  hasEncryptionKey,
} = require("../services/authService");
const {
  fetchLocalAdmin,
  listUsers,
  countActiveAdmins,
} = require("../services/userService");
const { countActiveSessions } = require("../services/sessionService");
const {
  generateRecoveryKey,
  hasActiveRecoveryKey,
} = require("../services/recoveryKeyService");
const {
  getOidcConfig,
  invalidateOidcConfigCache,
} = require("../services/entraService");

const SETTABLE_MODES = ["disabled", "local", "local_users", "entra", "hybrid"];

const configSchema = {
  mode: { type: "string", required: true, label: "Mode" },
  sessionTimeoutMinutes: {
    type: "number",
    required: true,
    label: "Session timeout",
    min: 5,
    max: 10080, // 7 days - generous upper bound, not unbounded
  },
};

// Comma/newline-separated textarea input arrives from the frontend already
// split into an array (see AdminCenter.jsx) - this just strips blanks and
// whitespace defensively in case a caller talks to the API directly.
function sanitizeStringList(value) {
  if (!Array.isArray(value)) return [];

  return value.map((entry) => String(entry).trim()).filter(Boolean);
}

// GET is intentionally mounted behind the same admin write-gate as PUT
// (see app.js) even though it's a read - this screen shows nothing to a
// non-admin, unlike most other GETs in this app, because it's the control
// panel for who gets to see anything at all.
router.get("/", async (req, res, next) => {
  try {
    const config = await getAuthConfig();
    const localAdmin = await fetchLocalAdmin();
    const activeSessions = await countActiveSessions();
    const hasRecoveryKey = await hasActiveRecoveryKey();
    const entraClientSecretConfigured = await hasEntraClientSecret();
    const allUsers = await listUsers();
    const localUsersCount = allUsers.filter(
      (user) => user.source === "local" && user.username,
    ).length;
    const activeAdminCount = await countActiveAdmins();

    res.json({
      mode: config.mode,
      sessionTimeoutMinutes: config.sessionTimeoutMinutes,
      hasLocalAccount: Boolean(localAdmin),
      hasRecoveryKey,
      activeSessions,
      localUsersCount,
      activeAdminCount,
      entraTenantId: config.entraTenantId,
      entraClientId: config.entraClientId,
      entraClientSecretConfigured,
      entraAllowedUsers: config.entraAllowedUsers,
      entraAllowedGroups: config.entraAllowedGroups,
      encryptionKeyConfigured: hasEncryptionKey(),
    });
  } catch (err) {
    next(err);
  }
});

router.put("/", async (req, res, next) => {
  try {
    const { value, errors } = validate(configSchema, req.body);

    if (errors.length) {
      return res.status(400).json(validationError(errors[0]));
    }

    if (!SETTABLE_MODES.includes(value.mode)) {
      return res.status(400).json({
        error: `Mode must be one of: ${SETTABLE_MODES.join(", ")}`,
        code: "authConfig.invalidMode",
        params: { allowed: SETTABLE_MODES.join(", ") },
      });
    }

    if (value.mode === "local" || value.mode === "hybrid") {
      const localAdmin = await fetchLocalAdmin();

      if (!localAdmin) {
        return res.status(400).json({
          error:
            "Local authentication needs a local account, but none is configured yet",
          code: "authConfig.noLocalAccount",
        });
      }
    }

    const entraTenantId = String(req.body?.entraTenantId || "").trim();
    const entraClientId = String(req.body?.entraClientId || "").trim();
    const entraClientSecret = String(req.body?.entraClientSecret || "").trim();
    const entraAllowedUsers = sanitizeStringList(req.body?.entraAllowedUsers);
    const entraAllowedGroups = sanitizeStringList(req.body?.entraAllowedGroups);

    if (value.mode === "entra" || value.mode === "hybrid") {
      if (!hasEncryptionKey()) {
        return res.status(400).json({
          error:
            "AUTH_ENCRYPTION_KEY is not configured on the server - Entra ID cannot be enabled until it is set (see backend/.env.example)",
          code: "authConfig.encryptionKeyMissing",
        });
      }

      if (!entraTenantId || !entraClientId) {
        return res.status(400).json({
          error: "Tenant ID and Client ID are required for Entra ID sign-in",
          code: "authConfig.entraIncomplete",
        });
      }

      const secretAlreadyConfigured = await hasEntraClientSecret();

      if (!entraClientSecret && !secretAlreadyConfigured) {
        return res.status(400).json({
          error: "A Client Secret is required for Entra ID sign-in",
          code: "authConfig.entraIncomplete",
        });
      }

      if (!entraAllowedUsers.length && !entraAllowedGroups.length) {
        return res.status(400).json({
          error:
            "At least one allowed user or group is required before Entra ID sign-in can be enabled",
          code: "authConfig.entraNoAllowlist",
        });
      }
    }

    await run(
      `UPDATE auth_config
       SET mode = ?, session_timeout_minutes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [value.mode, value.sessionTimeoutMinutes],
    );

    await setEntraConfig({
      tenantId: entraTenantId,
      clientId: entraClientId,
      clientSecret: entraClientSecret,
      allowedUsers: entraAllowedUsers,
      allowedGroups: entraAllowedGroups,
    });

    // The cached openid-client Configuration (see entraService) may now be
    // built from a stale tenant/client/secret - drop it so the next
    // login/test-configuration call rebuilds it from what was just saved.
    invalidateOidcConfigCache();

    const config = await get("SELECT * FROM auth_config WHERE id = 1");

    res.json({
      success: true,
      mode: config.mode,
      sessionTimeoutMinutes: config.sessionTimeoutMinutes,
    });
  } catch (err) {
    next(err);
  }
});

// Returns the raw key exactly once - only its hash is ever persisted (see
// recoveryKeyService), so this is the only moment it can be shown. Generating
// a new key immediately retires any previous unused one.
router.post("/recovery-key", async (req, res, next) => {
  try {
    const recoveryKey = await generateRecoveryKey();

    res.json({ recoveryKey });
  } catch (err) {
    next(err);
  }
});

// Verifies the tenant is reachable and the Tenant/Client ID pair resolves to
// real OIDC metadata. This is necessarily a partial check: OIDC discovery
// only fetches *public* metadata, so it cannot confirm the Client Secret
// itself is correct - that's only ever verified by an actual sign-in. Uses
// whatever was just typed into the form if provided, falling back to what's
// already saved, so an admin can test before saving.
router.post("/test-entra", async (req, res, next) => {
  try {
    const config = await getAuthConfig();
    const storedSecret = await hasEntraClientSecret();

    const tenantId =
      String(req.body?.entraTenantId || "").trim() || config.entraTenantId;
    const clientId =
      String(req.body?.entraClientId || "").trim() || config.entraClientId;
    const clientSecretInput = String(req.body?.entraClientSecret || "").trim();

    if (!tenantId || !clientId || (!clientSecretInput && !storedSecret)) {
      return res.status(400).json({
        success: false,
        error:
          "Tenant ID, Client ID and Client Secret are all required to test.",
      });
    }

    const clientSecret = clientSecretInput || (await getEntraClientSecret());

    await getOidcConfig({ tenantId, clientId, clientSecret });

    res.json({ success: true });
  } catch (err) {
    res.json({
      success: false,
      error: err.message || "Could not reach Entra ID with these settings.",
    });
  }
});

module.exports = router;
