const cookie = require("cookie");
const { validateSession } = require("../services/sessionService");
const { logError } = require("../services/logService");

// Name kept distinct from the pre-existing `x-admin-token` header mechanism
// in routes/auth.js on purpose - this is a separate concern (Layer 1: "can
// this request reach Toolbox at all") from that one (Layer 2: "can this
// request write"). See services/authService.js for the two-layer rationale.
const SESSION_COOKIE_NAME = "toolbox_session";

function setSessionCookie(res, rawToken, expiresAt) {
  const maxAgeSeconds = Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );

  res.setHeader(
    "Set-Cookie",
    cookie.stringifySetCookie({
      name: SESSION_COOKIE_NAME,
      value: rawToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: maxAgeSeconds,
    }),
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    cookie.stringifySetCookie({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    }),
  );
}

function readSessionToken(req) {
  const cookies = cookie.parseCookie(req.headers.cookie || "");

  return cookies[SESSION_COOKIE_NAME] || null;
}

// Resolves `req.user`/`req.sessionToken` from the session cookie, for every
// request - a no-op (both stay null) when there's no cookie or it's invalid,
// so this is safe to mount unconditionally regardless of the configured auth
// mode. requireAuth (separate middleware) is what actually enforces anything.
async function sessionMiddleware(req, res, next) {
  req.user = null;
  req.sessionToken = null;

  const token = readSessionToken(req);

  if (!token) {
    return next();
  }

  try {
    const user = await validateSession(token);

    if (user) {
      req.user = user;
      req.sessionToken = token;
    }
  } catch (err) {
    logError({
      category: "error",
      eventType: "auth.session_validation_failed",
      source: "AUTH",
      message: "Session validation failed",
      error: err,
      req,
    });
  }

  next();
}

module.exports = {
  SESSION_COOKIE_NAME,
  sessionMiddleware,
  setSessionCookie,
  clearSessionCookie,
  readSessionToken,
};
