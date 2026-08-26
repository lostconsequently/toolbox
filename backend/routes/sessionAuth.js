const express = require("express");
const router = express.Router();

const { validate, validationError } = require("../utils/validate");
const { createRateLimiter } = require("../utils/rateLimiter");
const {
  getAuthConfig,
  hasEntraClientSecret,
} = require("../services/authService");
const {
  fetchLocalAdmin,
  verifyLocalPassword,
  verifyLocalUserCredentials,
  setLocalPassword,
  touchLastLogin,
} = require("../services/userService");
const {
  createSession,
  destroySession,
  destroyAllSessionsForUser,
} = require("../services/sessionService");
const { consumeRecoveryKey } = require("../services/recoveryKeyService");
const {
  setSessionCookie,
  clearSessionCookie,
  readSessionToken,
} = require("../middleware/session");
const { logInfo, logWarning } = require("../services/logService");

const loginSchema = {
  password: { type: "string", required: true, label: "Password" },
};

// `username` is only required for 'local_users' mode - validated by hand
// inside the route rather than via `required: true` here, since the same
// schema also covers the legacy single-admin login (mode 'local'/'hybrid'),
// which has never taken a username and shouldn't start requiring one.
const localUsersLoginSchema = {
  username: { type: "string", required: true, label: "Username" },
  password: { type: "string", required: true, label: "Password" },
};

const recoverSchema = {
  recoveryKey: { type: "string", required: true, label: "Recovery key" },
  newPassword: {
    type: "string",
    required: true,
    label: "New password",
    min: 8,
  },
};

// Separate limiter instance from the pre-existing admin-write-gate login
// (routes/auth.js) - same shape/thresholds, but this protects a different
// endpoint and shouldn't share a bucket with it.
const sessionLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

// Tighter than the login limiter - a recovery key is a single high-entropy
// secret rather than a password, but this endpoint decides the *next*
// password for the account, so it gets the most conservative bucket of the
// three Layer 1 endpoints.
const recoverLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

function toPublicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    source: user.source,
  };
}

// Tells the frontend what to render before anyone is logged in: the login
// page (or lack thereof) depends entirely on this. Deliberately excludes
// anything from auth_config beyond `mode` - a logged-out visitor has no
// business seeing Entra tenant/client IDs.
router.get("/status", async (req, res, next) => {
  try {
    const config = await getAuthConfig();

    const ssoAvailable =
      (config.mode === "entra" || config.mode === "hybrid") &&
      Boolean(config.entraTenantId && config.entraClientId) &&
      (await hasEntraClientSecret());

    res.json({
      mode: config.mode,
      ssoAvailable,
    });
  } catch (err) {
    next(err);
  }
});

// Current session's user, or null - the frontend calls this once on load to
// decide whether it's already logged in (no separate "am I authenticated"
// boolean needed; a null user *is* that answer).
router.get("/session/me", (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

router.post("/session/login", sessionLoginLimiter, async (req, res, next) => {
  try {
    const config = await getAuthConfig();

    if (config.mode === "disabled") {
      return res.status(400).json({
        error: "Authentication is disabled",
        code: "auth.disabled",
      });
    }

    if (config.mode === "entra") {
      return res.status(400).json({
        error: "Local sign-in is not available in this mode",
        code: "auth.localNotAvailable",
      });
    }

    // 'local_users' is a distinct login shape (username+password, multiple
    // accounts) from 'local'/'hybrid' (password only, the single legacy
    // admin) - see routes/users.js for how those accounts are managed.
    if (config.mode === "local_users") {
      const { value, errors } = validate(localUsersLoginSchema, req.body);

      if (errors.length) {
        return res.status(400).json(validationError(errors[0]));
      }

      const user = await verifyLocalUserCredentials(
        value.username.trim(),
        value.password,
      );

      if (!user) {
        // Deliberately never includes the attempted username in the log -
        // same reasoning as the identical-error-either-way response below,
        // this must never reveal whether the username itself exists.
        logWarning({
          category: "auth",
          eventType: "auth.login_failed",
          source: "AUTH",
          message: "Failed local user login attempt",
          req,
        });

        // Deliberately identical to a wrong-password error - never reveals
        // whether the username itself exists (see
        // userService.verifyLocalUserCredentials for the matching
        // timing-safe comparison).
        return res.status(401).json({
          error: "Invalid username or password",
          code: "auth.invalidCredentials",
        });
      }

      const { rawToken, expiresAt } = await createSession(user.id, {
        ipFingerprint: req.ip,
        userAgent: req.headers["user-agent"],
        timeoutMinutes: config.sessionTimeoutMinutes,
      });

      await touchLastLogin(user.id);
      setSessionCookie(res, rawToken, expiresAt);

      logInfo({
        category: "auth",
        eventType: "auth.login_success",
        source: "AUTH",
        message: `User "${user.username}" signed in`,
        user,
        req,
      });

      return res.json({ success: true, user: toPublicUser(user) });
    }

    const { value, errors } = validate(loginSchema, req.body);

    if (errors.length) {
      return res.status(400).json(validationError(errors[0]));
    }

    const localAdmin = await fetchLocalAdmin();

    if (!localAdmin) {
      return res.status(500).json({
        error: "No local account is configured",
        code: "auth.noLocalAccount",
      });
    }

    const passwordOk = await verifyLocalPassword(localAdmin.id, value.password);

    if (!passwordOk) {
      logWarning({
        category: "auth",
        eventType: "auth.login_failed",
        source: "AUTH",
        message: "Failed local administrator login attempt",
        req,
      });

      return res.status(401).json({
        error: "Invalid password",
        code: "auth.invalidPassword",
      });
    }

    const { rawToken, expiresAt } = await createSession(localAdmin.id, {
      ipFingerprint: req.ip,
      userAgent: req.headers["user-agent"],
      timeoutMinutes: config.sessionTimeoutMinutes,
    });

    await touchLastLogin(localAdmin.id);
    setSessionCookie(res, rawToken, expiresAt);

    logInfo({
      category: "auth",
      eventType: "auth.login_success",
      source: "AUTH",
      message: "Local administrator signed in",
      user: localAdmin,
      req,
    });

    res.json({ success: true, user: toPublicUser(localAdmin) });
  } catch (err) {
    next(err);
  }
});

// Resets the local admin's password using a recovery key instead of the old
// password - the "I forgot my password and can't sign in at all" escape
// hatch. Deliberately available regardless of mode (even 'disabled' - an
// admin should be able to pre-set a fresh password before switching modes)
// as long as a local account and an unused recovery key both exist.
router.post("/session/recover", recoverLimiter, async (req, res, next) => {
  try {
    const { value, errors } = validate(recoverSchema, req.body);

    if (errors.length) {
      return res.status(400).json(validationError(errors[0]));
    }

    const localAdmin = await fetchLocalAdmin();

    if (!localAdmin) {
      return res.status(500).json({
        error: "No local account is configured",
        code: "auth.noLocalAccount",
      });
    }

    const keyValid = await consumeRecoveryKey(value.recoveryKey);

    if (!keyValid) {
      logWarning({
        category: "auth",
        eventType: "auth.recovery_key_failed",
        source: "AUTH",
        message: "Failed recovery key attempt",
        req,
      });

      return res.status(401).json({
        error: "Invalid or already-used recovery key",
        code: "auth.invalidRecoveryKey",
      });
    }

    await setLocalPassword(localAdmin.id, value.newPassword);

    // A recovered password means any existing sessions were established
    // under credentials the admin no longer trusts - force everyone
    // (including whoever is currently signed in) to sign in again.
    await destroyAllSessionsForUser(localAdmin.id);

    logInfo({
      category: "security",
      eventType: "auth.recovery_key_used",
      source: "AUTH",
      message: "Local administrator password reset via recovery key",
      user: localAdmin,
      req,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/session/logout", async (req, res, next) => {
  try {
    const token = readSessionToken(req);

    if (token) {
      await destroySession(token);
    }

    clearSessionCookie(res);

    if (req.user) {
      logInfo({
        category: "auth",
        eventType: "auth.logout",
        source: "AUTH",
        message: `User "${req.user.username || req.user.displayName || req.user.id}" signed out`,
        user: req.user,
        req,
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
