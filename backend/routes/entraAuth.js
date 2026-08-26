const express = require("express");
const cookie = require("cookie");
const router = express.Router();

const { createRateLimiter } = require("../utils/rateLimiter");
const {
  getAuthConfig,
  getEntraClientSecret,
} = require("../services/authService");
const {
  buildAuthorizationUrl,
  handleCallback,
  isAllowed,
} = require("../services/entraService");
const {
  fetchUserByEmail,
  createEntraUser,
  updateEntraUserProfile,
} = require("../services/userService");
const { createSession } = require("../services/sessionService");
const { setSessionCookie } = require("../middleware/session");
const { logInfo, logWarning, logError } = require("../services/logService");

// Where to send the browser back to once the OIDC dance is done - this
// callback lands on the *backend's* origin (Microsoft redirects here
// directly), so it always has to explicitly redirect to the frontend rather
// than just rendering something itself.
const FRONTEND_URL = (
  process.env.FRONTEND_URL ||
  (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",")[0]
).trim();

// Holds the PKCE code_verifier/state/nonce between the redirect to Microsoft
// and the callback - short-lived and single-use, so a plain (unencrypted)
// cookie is fine; it never contains anything more sensitive than random
// single-use flow identifiers. Scoped to the callback's own path.
const FLOW_COOKIE_NAME = "toolbox_oidc_flow";
const FLOW_COOKIE_PATH = "/api/auth/entra";
const FLOW_MAX_AGE_SECONDS = 600;

const entraLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
});

function buildRedirectUri(req) {
  return `${req.protocol}://${req.get("host")}/api/auth/entra/callback`;
}

function setFlowCookie(res, flow) {
  res.setHeader(
    "Set-Cookie",
    cookie.stringifySetCookie({
      name: FLOW_COOKIE_NAME,
      value: Buffer.from(JSON.stringify(flow)).toString("base64url"),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: FLOW_COOKIE_PATH,
      maxAge: FLOW_MAX_AGE_SECONDS,
    }),
  );
}

function clearFlowCookie(res) {
  res.setHeader(
    "Set-Cookie",
    cookie.stringifySetCookie({
      name: FLOW_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: FLOW_COOKIE_PATH,
      maxAge: 0,
    }),
  );
}

function readFlowCookie(req) {
  const cookies = cookie.parseCookie(req.headers.cookie || "");
  const raw = cookies[FLOW_COOKIE_NAME];

  if (!raw) return null;

  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function redirectToLoginWithError(res, code) {
  res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(code)}`);
}

router.get("/login", entraLoginLimiter, async (req, res) => {
  try {
    const config = await getAuthConfig();

    if (config.mode !== "entra" && config.mode !== "hybrid") {
      return redirectToLoginWithError(res, "sso_unavailable");
    }

    const clientSecret = await getEntraClientSecret();

    if (!config.entraTenantId || !config.entraClientId || !clientSecret) {
      return redirectToLoginWithError(res, "sso_misconfigured");
    }

    const { url, codeVerifier, state, nonce } = await buildAuthorizationUrl({
      tenantId: config.entraTenantId,
      clientId: config.entraClientId,
      clientSecret,
      redirectUri: buildRedirectUri(req),
    });

    setFlowCookie(res, { codeVerifier, state, nonce });

    res.redirect(url);
  } catch (err) {
    logError({
      category: "auth",
      eventType: "auth.sso_failed",
      source: "SSO",
      message: "Entra login redirect failed",
      error: err,
      req,
    });
    redirectToLoginWithError(res, "sso_error");
  }
});

router.get("/callback", async (req, res) => {
  const flow = readFlowCookie(req);

  // Single-use regardless of outcome.
  clearFlowCookie(res);

  try {
    const config = await getAuthConfig();

    if (config.mode !== "entra" && config.mode !== "hybrid") {
      return redirectToLoginWithError(res, "sso_unavailable");
    }

    if (!flow) {
      return redirectToLoginWithError(res, "sso_expired");
    }

    if (req.query.error) {
      // The end-user cancelled, or Microsoft rejected the request - not a
      // Toolbox-side failure, so no need to log it as one.
      return redirectToLoginWithError(res, "sso_denied");
    }

    const clientSecret = await getEntraClientSecret();

    if (!clientSecret) {
      return redirectToLoginWithError(res, "sso_misconfigured");
    }

    const currentUrl = new URL(
      req.originalUrl,
      `${req.protocol}://${req.get("host")}`,
    );

    const profile = await handleCallback({
      tenantId: config.entraTenantId,
      clientId: config.entraClientId,
      clientSecret,
      currentUrl,
      codeVerifier: flow.codeVerifier,
      state: flow.state,
      nonce: flow.nonce,
    });

    if (
      !isAllowed(profile, {
        allowedUsers: config.entraAllowedUsers,
        allowedGroups: config.entraAllowedGroups,
      })
    ) {
      // Unlike a credential-guessing failure, this is an already-verified
      // Microsoft identity that just isn't in the allowlist - logging the
      // email here (rather than omitting it, as login-failure paths do) is
      // the useful signal for an admin to diagnose an allowlist typo.
      logWarning({
        category: "auth",
        eventType: "auth.sso_denied",
        source: "SSO",
        message: `Entra sign-in denied for ${profile.email} - not in the allowlist`,
        req,
      });

      return redirectToLoginWithError(res, "sso_not_allowed");
    }

    let user = await fetchUserByEmail("entra", profile.email);

    if (!user) {
      user = await createEntraUser(profile);
    } else {
      await updateEntraUserProfile(user.id, profile);
    }

    const { rawToken, expiresAt } = await createSession(user.id, {
      ipFingerprint: req.ip,
      userAgent: req.headers["user-agent"],
      timeoutMinutes: config.sessionTimeoutMinutes,
    });

    setSessionCookie(res, rawToken, expiresAt);

    logInfo({
      category: "auth",
      eventType: "auth.sso_login",
      source: "SSO",
      message: `User "${user.email}" signed in via Microsoft Entra ID`,
      user,
      req,
    });

    res.redirect(FRONTEND_URL);
  } catch (err) {
    logError({
      category: "auth",
      eventType: "auth.sso_failed",
      source: "SSO",
      message: "Entra callback failed",
      error: err,
      req,
    });
    redirectToLoginWithError(res, "sso_error");
  }
});

module.exports = router;
