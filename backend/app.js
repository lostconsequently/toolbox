const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const dotenv = require("dotenv");
const { createRateLimiter } = require("./utils/rateLimiter");
const macLookupRoutes = require("./routes/maclookup");
const {
  router: authRoutes,
  requireAdmin,
  requireAdminForWrites,
} = require("./routes/auth");

const whoisRoutes = require("./routes/whois");
const ipLookupRoutes = require("./routes/iplookup");
const portCheckRoutes = require("./routes/portcheck");
const sslCheckRoutes = require("./routes/sslcheck");
const reputationRoutes = require("./routes/reputation");
const breachCheckRoutes = require("./routes/breachCheck");
const reverseDnsRoutes = require("./routes/reversedns");
const bsodAnalyzerRoutes = require("./routes/bsodanalyzer");
const dnsPropagationRoutes = require("./routes/dnsPropagation");
const dnsLookupRoutes = require("./routes/dnsLookup");
const spfFlattenRoutes = require("./routes/spfFlatten");
const certificateRoutes = require("./routes/certificates");
const pingRoutes = require("./routes/ping");
const tracerouteRoutes = require("./routes/traceroute");
const categoriesRoutes = require("./routes/categories");
const subcategoriesRoutes = require("./routes/subcategories");
const toolsRoutes = require("./routes/tools");
const scriptsRoutes = require("./routes/scripts");
const backupRoutes = require("./routes/backup");
const { isDatabaseBusy } = backupRoutes;
const sessionAuthRoutes = require("./routes/sessionAuth");
const authConfigRoutes = require("./routes/authConfig");
const entraAuthRoutes = require("./routes/entraAuth");
const brandingRoutes = require("./routes/branding");
const { getBrandingUploadsDir } = require("./utils/brandingUploads");
const setupRoutes = require("./routes/setup");
const systemInfoRoutes = require("./routes/systemInfo");
const usersRoutes = require("./routes/users");
const logsRoutes = require("./routes/logs");
const { dbReady } = require("./database/db");
const { ensureLocalAdminUser } = require("./services/userService");
const { startSessionCleanupSweep } = require("./services/sessionService");
const { sessionMiddleware } = require("./middleware/session");
const { requireAuth } = require("./middleware/requireAuth");
const {
  logInfo,
  logWarning,
  logError,
  logCritical,
} = require("./services/logService");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// The production image bakes the Vite build into backend/public, so one
// container serves both the app and the API. In development that directory
// doesn't exist and the Vite dev server (port 5173) serves the frontend
// instead - everything below is skipped in that case.
const PUBLIC_DIR = path.join(__dirname, "public");
const INDEX_HTML = path.join(PUBLIC_DIR, "index.html");
const hasFrontend = fs.existsSync(INDEX_HTML);

// Behind a reverse proxy, req.ip is the proxy unless Express is told to trust
// the X-Forwarded-For chain. That matters for the per-IP rate limiter in
// utils/rateLimiter.js. Off by default; set TRUST_PROXY=1 (or a hop count /
// subnet accepted by Express) when a proxy sits in front.
if (process.env.TRUST_PROXY) {
  const trustProxy = process.env.TRUST_PROXY.trim();

  app.set(
    "trust proxy",
    /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy,
  );
}

// If TRUST_PROXY was never set but requests are still arriving with an
// X-Forwarded-For header, every client behind that proxy collapses into one
// req.ip as far as the rate limiters and login lockout are concerned - one
// user's traffic can lock out everyone else, or a client can spoof the
// header to dodge the limit entirely. This is a config problem the operator
// needs to fix (set TRUST_PROXY, with a proxy that strips inbound
// X-Forwarded-For), so log it once at startup-adjacent time rather than
// silently degrading rate limiting.
if (!process.env.TRUST_PROXY) {
  let warned = false;

  app.use((req, res, next) => {
    if (!warned && req.headers["x-forwarded-for"]) {
      warned = true;

      logWarning({
        category: "system",
        eventType: "app.config_missing",
        source: "APP",
        message:
          "Requests are arriving with an X-Forwarded-For header but TRUST_PROXY is not set - " +
          "per-IP rate limiting will see the proxy's address for every client. " +
          "Set TRUST_PROXY (see backend/.env.example) if this app runs behind a reverse proxy.",
      });
    }

    next();
  });
}

// Ping and Traceroute stream their results as Server-Sent Events. text/event-stream
// counts as compressible, and buffering it would hold every line back until the
// stream ends - so those responses opt out.
app.use(
  compression({
    filter: (req, res) => {
      const contentType = res.getHeader("Content-Type");

      if (
        typeof contentType === "string" &&
        contentType.startsWith("text/event-stream")
      ) {
        return false;
      }

      return compression.filter(req, res);
    },
  }),
);

// Baseline hardening headers. Everything is same-origin except the Google
// Fonts stylesheet + font files loaded by frontend/index.html.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
    ].join("; "),
  );

  next();
});

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// The request-aware form of the cors middleware, so a request can be compared
// against its own host. Same-origin calls (the app hitting its own /api now
// that one process serves both) are always allowed, whatever host or port the
// deployment ends up on - so moving to a new port or putting a domain in front
// no longer needs an ALLOWED_ORIGINS entry. Cross-origin callers still do.
app.use(
  cors((req, callback) => {
    const origin = req.headers.origin;
    const sameOrigin = `${req.protocol}://${req.get("host")}`;

    if (!origin || origin === sameOrigin || allowedOrigins.includes(origin)) {
      // credentials: true is required for the browser to send/receive the
      // session cookie (middleware/session.js) on cross-origin requests -
      // relevant in dev, where Vite (5173) and the API (3001) are different
      // origins. Safe to combine with reflecting a specific origin (never
      // '*') the way this callback already does.
      callback(null, { origin: true, credentials: true });
      return;
    }

    callback(new Error("Origin not allowed"));
  }),
);
app.use((req, res, next) => {
  // /api/certificates parses its own body with a higher limit; the global
  // parser here would otherwise consume the request first at the default
  // (lower) limit, silently shadowing the route-level one.
  if (req.path.startsWith("/api/certificates")) {
    return next();
  }

  return express.json()(req, res, next);
});

// Static assets are served before the /api rate limiter so a page load full of
// chunks never eats into the API budget. Vite fingerprints everything under
// /assets, so those can be cached hard; index.html must not be, or clients keep
// booting the previous build after an update.
if (hasFrontend) {
  app.use(
    express.static(PUBLIC_DIR, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
}

// Admin-uploaded logo/favicon/login-background (Admin Center's Branding tab
// - see routes/branding.js). Public and outside /api entirely: the login
// page has to render these before anyone is signed in, so this can't be
// behind requireAuth (which only guards /api anyway) or requireAdmin.
// Filenames are always server-generated (never the client's original
// filename), and a short cache lifetime keeps a replaced logo from being
// stuck in a browser cache for long.
app.use(
  "/uploads/branding",
  express.static(getBrandingUploadsDir(), { maxAge: "1h" }),
);

app.get("/api", (req, res) => {
  res.json({
    app: "Toolbox API",
    status: "running",
    version: "0.9.6",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

const apiLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60 });

app.use("/api", apiLimiter);

// Resolves req.user from the session cookie (a no-op when there is none),
// then enforces it if a mode is configured. Both are no-ops end-to-end when
// auth is disabled (the default) - this is the guarantee that "disabled"
// behaves exactly like the app did before this feature existed.
app.use("/api", sessionMiddleware);
app.use("/api", requireAuth);

// While a backup/restore is swapping the live database file, `getDatabase()`
// throws for any other in-flight request (the connection is briefly null),
// which would otherwise surface as an unexplained generic 500. Answer with a
// clear, retryable 503 instead. /auth and /backup are excluded: auth doesn't
// touch the database, and the backup routes themselves manage the lock and
// need to stay reachable for prepare/commit/cancel to complete.
app.use("/api", (req, res, next) => {
  if (
    req.path.startsWith("/auth") ||
    req.path.startsWith("/backup") ||
    req.path.startsWith("/setup")
  ) {
    return next();
  }

  if (isDatabaseBusy()) {
    return res.status(503).json({
      error:
        "The database is temporarily unavailable while a backup or restore is in progress. Try again shortly.",
      code: "app.maintenanceInProgress",
    });
  }

  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/auth", sessionAuthRoutes);
// Redirect-based (not fetch/XHR), so it lives under /api/auth/entra rather
// than nested in sessionAuthRoutes - GET routes users' browsers navigate to
// directly, not JSON endpoints. Still covered by requireAuth's "/auth/"
// public-path prefix like the rest of this router.
app.use("/api/auth/entra", entraAuthRoutes);

app.use("/api/backup", requireAdmin, backupRoutes);

// Admin Center's Authentication tab - gated by the pre-existing admin
// write-gate (Layer 2), not the new session system (Layer 1), so an admin
// can always reach this screen to turn Layer 1 on/off in the first place,
// including while Layer 1 is disabled.
app.use("/api/admin/auth-config", requireAdmin, authConfigRoutes);

// NOT gated at the mount level, unlike the routers above: GET here has to
// stay public (the login page renders branding before anyone is signed in),
// while PUT/reset/upload are admin-gated per-route inside routes/branding.js
// itself. Also listed in requireAuth's PUBLIC_PATH_PREFIXES so Layer 1 never
// blocks it either.
app.use("/api/branding", brandingRoutes);

// First Startup Wizard - public for the same reason as /branding above (it
// has to be reachable before any admin credential/session exists). Its own
// requireSetupIncomplete guard (routes/setup.js) closes the mutating routes
// permanently once setup is done; /status stays readable always.
app.use("/api/setup", setupRoutes);

// Admin Center's About tab - read-only, admin-gated the same way as
// auth-config (no separate write path exists, so no per-route gating needed
// like branding.js).
app.use("/api/admin/system-info", requireAdmin, systemInfoRoutes);

// Admin Center's Local Users section - admin-gated the same way as
// auth-config/system-info. requireAdmin here is what makes roles actually
// enforced server-side (see routes/auth.js's requireAdmin - it now accepts
// a Layer 1 session with role 'admin' as well as the Layer 2 shared token),
// not just hidden buttons in the UI.
app.use("/api/admin/users", requireAdmin, usersRoutes);

// Admin Center's Logging tab - admin-gated the same way as system-info/users.
// Deliberately not added to the database-busy 503 middleware's exclusion
// list above (only /auth and /backup are excluded) - it's a normal
// DB-backed route like users/categories/tools, so it correctly answers 503
// during a backup/restore window like everything else.
app.use("/api/admin/logs", requireAdmin, logsRoutes);

// Everything below is readable without a session, but changing it needs an
// admin token. Hiding the buttons in the UI is not access control: without
// these guards anyone who can reach the port could create or delete content,
// and a category delete cascades to its subcategories and tools.
app.use("/api/categories", requireAdminForWrites, categoriesRoutes);
app.use("/api/bsodanalyzer", bsodAnalyzerRoutes);
app.use("/api/sslcheck", sslCheckRoutes);
app.use("/api/maclookup", macLookupRoutes);
app.use("/api/dnspropagation", dnsPropagationRoutes);
app.use("/api/dnslookup", dnsLookupRoutes);
app.use("/api/spf", spfFlattenRoutes);
app.use("/api/iplookup", ipLookupRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/reversedns", reverseDnsRoutes);
app.use("/api/reputation", reputationRoutes);
app.use("/api/breachcheck", breachCheckRoutes);
app.use("/api/whois", whoisRoutes);
app.use("/api/portcheck", portCheckRoutes);
app.use("/api/ping", pingRoutes);
app.use("/api/traceroute", tracerouteRoutes);
app.use("/api/subcategories", requireAdminForWrites, subcategoriesRoutes);

// Favouriting is a per-user bookmark, not an edit of the tool or script
// itself, so it is the one write that stays open to everyone. Every other
// write on these two routers still needs an admin session.
const FAVORITE_PATH = /^\/\d+\/favorite\/?$/;

function requireAdminForWritesExceptFavorite(req, res, next) {
  if (req.method === "PATCH" && FAVORITE_PATH.test(req.path)) {
    return next();
  }

  return requireAdminForWrites(req, res, next);
}

app.use("/api/tools", requireAdminForWritesExceptFavorite, toolsRoutes);
app.use("/api/scripts", requireAdminForWritesExceptFavorite, scriptsRoutes);

// An unknown /api path is always a JSON 404 - it must never fall through to
// index.html, or a typo'd endpoint would return HTML with a 200.
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

// SPA fallback: any other GET hands back index.html so React Router can resolve
// client-side routes on a hard refresh or a deep link. Written as plain
// middleware rather than app.get("*") because the wildcard path syntax differs
// between Express 4 and 5.
app.use((req, res, next) => {
  // HEAD as well as GET: proxies and uptime monitors probe with HEAD, and
  // res.sendFile answers it correctly (headers, no body).
  const isDocumentRequest = req.method === "GET" || req.method === "HEAD";

  if (!hasFrontend || !isDocumentRequest) {
    return next();
  }

  // Every route resolves to this same document, and it names the hashed asset
  // bundles - so it must never be cached, or clients keep booting the previous
  // build after an update.
  res.setHeader("Cache-Control", "no-cache");

  res.sendFile(INDEX_HTML, (err) => {
    if (err) next(err);
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  // Only genuine server-side failures (5xx) are worth an ERROR log entry -
  // a validation throw resulting in a normal 4xx is expected traffic, not
  // an "API exception", and logging every one would drown the real signal.
  if (status >= 500) {
    logError({
      category: "error",
      eventType: "api.exception",
      source: "APP",
      message: `Unhandled error on ${req.method} ${req.path}`,
      req,
      error: err,
    });
  } else {
    console.error("Backend error:", err);
  }

  res.status(status).json({
    error:
      status < 500 ? err.message || "Bad request" : "Internal server error",
  });
});

app.listen(PORT, () => {
  logInfo({
    category: "system",
    eventType: "app.startup",
    source: "APP",
    message: `Toolbox API runs on http://localhost:${PORT}`,
  });
});

function handleShutdownSignal(signal) {
  logInfo({
    category: "system",
    eventType: "app.shutdown",
    source: "APP",
    message: `Application shutdown (${signal})`,
  });

  // A brief delay so the console line above (and its buffered event_log
  // flush, if the DB happens to still be mid-buffer) has a moment to land
  // before the process actually exits - Docker's default stop timeout is
  // 10s, this is nowhere close to that.
  setTimeout(() => process.exit(0), 150);
}

process.on("SIGTERM", () => handleShutdownSignal("SIGTERM"));
process.on("SIGINT", () => handleShutdownSignal("SIGINT"));

process.on("uncaughtException", (err) => {
  logCritical({
    category: "error",
    eventType: "app.unhandled_exception",
    source: "APP",
    message: "Uncaught exception - the process will exit",
    error: err,
  });

  setTimeout(() => process.exit(1), 150);
});

process.on("unhandledRejection", (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));

  logCritical({
    category: "error",
    eventType: "app.unhandled_rejection",
    source: "APP",
    message: "Unhandled promise rejection - the process will exit",
    error,
  });

  // Matches Node's own default "throw" behavior for unhandled rejections
  // (crash the process) - this handler only exists to get a CRITICAL log
  // line out first, not to make an unhandled rejection survivable.
  setTimeout(() => process.exit(1), 150);
});

// Sequenced after the schema is ready (dbReady), not on a fixed delay - the
// migration only ever inserts a row when none exists yet, so running it
// again on every restart is a safe no-op once it's happened once.
dbReady
  .then(() => {
    logInfo({
      category: "system",
      eventType: "db.connected",
      source: "DB",
      message: "Database connection established",
    });

    return ensureLocalAdminUser();
  })
  .catch((err) => {
    logCritical({
      category: "system",
      eventType: "app.startup_failed",
      source: "APP",
      message: "Local admin user migration failed",
      error: err,
    });
  });

startSessionCleanupSweep();
