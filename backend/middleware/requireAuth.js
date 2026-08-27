const { getAuthMode } = require("../services/authService");
const { logCritical } = require("../services/logService");

// Relative to the /api mount point (Express strips it before this runs).
// Everything under these prefixes must stay reachable without a Layer 1
// session, or nobody could ever log in - and /health is used by uptime
// probes/Docker healthchecks that never carry a session.
//
// /admin/auth-config is the deliberate exception to "Layer 1 gates
// everything": it's already gated by the pre-existing admin write-gate
// (Layer 2, routes/auth.js's requireAdmin - see its mount in app.js), and it
// has to stay reachable through *that* system regardless of Layer 1 state.
// Without this, an admin who enables Local/Entra mode and then can't
// complete a Layer 1 login (misconfigured Entra tenant, forgotten local
// password before a recovery key exists) would be permanently locked out of
// the one screen that could fix it.
//
// /branding is public for a different reason: the login page itself has to
// render the configured app name/logo/colors *before* anyone is signed in,
// so GET must never be gated by Layer 1. Its mutating routes (PUT, /reset,
// the upload endpoints) stay behind Layer 2's requireAdmin (applied per-route
// inside routes/branding.js, not at mount time - see that file), same
// reasoning as /admin/auth-config above.
//
// /admin/system-info and /admin/users are the same "stay reachable through
// Layer 2 regardless of Layer 1 state" exception as /admin/auth-config -
// each is entirely gated by requireAdmin at its own mount point in app.js,
// which now itself accepts a Layer 1 admin-role session too (see
// routes/auth.js). Without this, enabling 'local_users' mode with zero
// users created yet would lock even the Layer 2 shared password out of the
// one screen (Local Users) that could fix that.
const PUBLIC_PATH_PREFIXES = [
  "/auth/",
  "/health",
  "/admin/auth-config",
  "/admin/system-info",
  "/admin/users",
  "/branding",
  "/setup",
];

function isPublicPath(path) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// The Layer 1 "front door" gate: when auth is disabled (the default), this
// is a straight no-op and every request behaves exactly as it did before
// this feature existed. When a mode is configured, any request without a
// valid session (sessionMiddleware runs first and sets req.user) is
// rejected with a distinct `code` the frontend uses to redirect to /login
// specifically - separate from the pre-existing admin-token 401s, which
// mean something different (see routes/auth.js).
async function requireAuth(req, res, next) {
  if (isPublicPath(req.path)) {
    return next();
  }

  let mode;

  try {
    mode = await getAuthMode();
  } catch (err) {
    // A DB hiccup here must never lock everyone out - fail open (disabled),
    // matching "never fail into a worse state than today". That tradeoff is
    // exactly why this is worth a CRITICAL entry, not just an error one -
    // it means the app is temporarily behaving as if auth were disabled.
    logCritical({
      category: "security",
      eventType: "security.auth_fail_open",
      source: "AUTH",
      message:
        "Could not read auth mode - failing open (request allowed without a session check)",
      error: err,
      req,
    });
    return next();
  }

  if (mode === "disabled") {
    return next();
  }

  if (req.user) {
    return next();
  }

  return res.status(401).json({
    error: "Authentication required",
    code: "auth.required",
  });
}

module.exports = { requireAuth };
