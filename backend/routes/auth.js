const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const { validate, validationError } = require("../utils/validate");
const { createRateLimiter } = require("../utils/rateLimiter");
const { logWarning } = require("../services/logService");

const loginSchema = {
  password: { type: "string", required: true, label: "Password" },
};

const adminTokens = new Map();

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

function timingSafeEqualStrings(a, b) {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));

  if (bufferA.length !== bufferB.length) {
    // Still run timingSafeEqual (against a same-length buffer) so a length
    // mismatch doesn't short-circuit faster than a content mismatch.
    crypto.timingSafeEqual(bufferA, Buffer.alloc(bufferA.length));

    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

router.post("/login", loginLimiter, (req, res) => {
  const { value, errors } = validate(loginSchema, req.body);
  if (errors.length) {
    return res.status(400).json(validationError(errors[0]));
  }

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({
      error: "Admin password is not configured",
    });
  }

  if (!timingSafeEqualStrings(value.password, process.env.ADMIN_PASSWORD)) {
    logWarning({
      category: "auth",
      eventType: "auth.login_failed",
      source: "AUTH",
      message: "Failed admin login attempt (shared admin password)",
      req,
    });

    return res.status(401).json({
      error: "Invalid admin password",
    });
  }

  const token = crypto.randomUUID();

  adminTokens.set(token, {
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  res.json({
    success: true,
    token,
  });
});

router.post("/logout", (req, res) => {
  const token = req.headers["x-admin-token"];

  if (token) {
    adminTokens.delete(token);
  }

  res.json({
    success: true,
  });
});

// Two independent ways to satisfy this gate:
//  1. A valid Layer 2 x-admin-token (the original shared ADMIN_PASSWORD
//     mechanism) - kept working unconditionally so it stays usable as the
//     "emergency account" even if every Layer 1 admin account is somehow
//     locked out.
//  2. A Layer 1 session (req.user, set by middleware/session.js earlier in
//     the chain - see app.js) belonging to a user with role 'admin'. This is
//     what makes per-account roles actually enforced server-side rather than
//     just hiding buttons in the UI - see routes/users.js and
//     services/userService.js for where roles are assigned.
// Neither path is exclusive: an install can rely on just the shared
// password, just Local users/Entra roles, or both at once.
function requireAdmin(req, res, next) {
  if (req.user?.role === "admin") {
    return next();
  }

  const token = req.headers["x-admin-token"];

  if (!token) {
    return res.status(401).json({
      error: "Admin authentication required",
    });
  }

  const tokenInfo = adminTokens.get(token);

  if (!tokenInfo) {
    return res.status(401).json({
      error: "Admin authentication required",
    });
  }

  if (tokenInfo.expiresAt < Date.now()) {
    adminTokens.delete(token);

    return res.status(401).json({
      error: "Admin session expired",
    });
  }

  next();
}

function requireAdminForWrites(req, res, next) {
  const readOnlyMethods = ["GET", "HEAD", "OPTIONS"];

  if (readOnlyMethods.includes(req.method)) {
    return next();
  }

  return requireAdmin(req, res, next);
}

// Same two-path check as requireAdmin above, as a boolean instead of
// middleware - used where "is this reader an admin" changes what a GET
// returns (draft tools, admin-only scripts) rather than blocking the request
// outright.
function isAdminRequest(req) {
  if (req.user?.role === "admin") return true;

  const token = req.headers["x-admin-token"];

  if (!token) return false;

  const tokenInfo = adminTokens.get(token);

  if (!tokenInfo) return false;

  if (tokenInfo.expiresAt < Date.now()) return false;

  return true;
}

setInterval(
  () => {
    const now = Date.now();

    for (const [token, tokenInfo] of adminTokens.entries()) {
      if (tokenInfo.expiresAt < now) {
        adminTokens.delete(token);
      }
    }
  },
  60 * 60 * 1000,
);

module.exports = {
  router,
  requireAdmin,
  requireAdminForWrites,
  isAdminRequest,
};
