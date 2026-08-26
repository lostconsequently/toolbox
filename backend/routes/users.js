const express = require("express");
const router = express.Router();

const { validate, validationError } = require("../utils/validate");
const {
  VALID_ROLES,
  fetchUserById,
  fetchUserByUsername,
  listUsers,
  createLocalUser,
  updateUserDisplayName,
  setUserRole,
  setUserActive,
  setLocalPassword,
  deleteUser,
  countActiveAdmins,
} = require("../services/userService");
const {
  destroyAllSessionsForUser,
  countActiveSessionsForUser,
} = require("../services/sessionService");
const { logUserAudit, listUserAudit } = require("../services/userAuditService");

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

const createUserSchema = {
  username: { type: "string", required: true, label: "Username", max: 32 },
  displayName: {
    type: "string",
    required: true,
    label: "Display name",
    max: 80,
  },
  password: { type: "string", required: true, label: "Password", min: 8 },
  role: { type: "string", required: true, label: "Role" },
};

const updateUserSchema = {
  displayName: {
    type: "string",
    required: true,
    label: "Display name",
    max: 80,
  },
  role: { type: "string", required: true, label: "Role" },
};

const passwordSchema = {
  password: { type: "string", required: true, label: "Password", min: 8 },
};

function toPublicUser(user, activeSessions = 0) {
  return {
    id: user.id,
    source: user.source,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    activeSessions,
  };
}

// req.user is the currently signed-in Layer 1 account performing the action
// (this whole router is admin-gated - see its mount in app.js - so req.user
// is only ever absent when the request came in on the Layer 2 shared token
// instead, which has no per-account identity of its own) - a synthetic
// label keeps the audit log readable rather than leaving "actor" blank for
// every shared-password-driven action.
function actorLabel(req) {
  return req.user || { id: null, displayName: "Shared admin password" };
}

router.get("/", async (req, res, next) => {
  try {
    const users = await listUsers();

    const withSessionCounts = await Promise.all(
      users.map(async (user) => ({
        user,
        activeSessions: await countActiveSessionsForUser(user.id),
      })),
    );

    res.json({
      users: withSessionCounts.map(({ user, activeSessions }) =>
        toPublicUser(user, activeSessions),
      ),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/audit-log", async (req, res, next) => {
  try {
    const entries = await listUserAudit(100);

    res.json({ entries });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { value, errors } = validate(createUserSchema, req.body);

    if (errors.length) {
      return res.status(400).json(validationError(errors[0]));
    }

    const username = value.username.trim();

    if (!USERNAME_PATTERN.test(username)) {
      return res.status(400).json({
        error:
          "Username may only contain letters, numbers, dots, hyphens and underscores (3-32 characters).",
        code: "users.invalidUsername",
      });
    }

    if (!VALID_ROLES.includes(value.role)) {
      return res.status(400).json({
        error: `Role must be one of: ${VALID_ROLES.join(", ")}`,
        code: "users.invalidRole",
      });
    }

    const existing = await fetchUserByUsername(username);

    if (existing) {
      return res.status(409).json({
        error: "That username is already taken.",
        code: "users.usernameTaken",
      });
    }

    const created = await createLocalUser({
      username,
      displayName: value.displayName.trim(),
      password: value.password,
      role: value.role,
    });

    await logUserAudit({
      actor: actorLabel(req),
      action: "user.created",
      target: created,
      details: { role: created.role },
    });

    res.status(201).json({ user: toPublicUser(created, 0) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const target = await fetchUserById(userId);

    if (!target) {
      return res
        .status(404)
        .json({ error: "User not found", code: "users.notFound" });
    }

    const { value, errors } = validate(updateUserSchema, req.body);

    if (errors.length) {
      return res.status(400).json(validationError(errors[0]));
    }

    if (!VALID_ROLES.includes(value.role)) {
      return res.status(400).json({
        error: `Role must be one of: ${VALID_ROLES.join(", ")}`,
        code: "users.invalidRole",
      });
    }

    // A signed-in admin changing their own role - even to 'admin' again -
    // is blocked outright rather than only blocking demotions: it's simpler
    // to reason about ("your own role field is always read-only here") and
    // there's never a legitimate reason for this specific request shape.
    if (req.user?.id === userId && value.role !== target.role) {
      return res.status(403).json({
        error: "You cannot change your own role.",
        code: "users.cannotChangeOwnRole",
      });
    }

    const roleChanged = value.role !== target.role;

    if (target.role === "admin" && value.role !== "admin") {
      const activeAdmins = await countActiveAdmins();

      if (activeAdmins <= 1) {
        return res.status(400).json({
          error: "Cannot change the role of the last active administrator.",
          code: "users.lastAdmin",
        });
      }
    }

    await updateUserDisplayName(userId, value.displayName.trim());

    if (roleChanged) {
      await setUserRole(userId, value.role);

      // A role change is a privilege change - any session established under
      // the old role must not keep working under the new one, same
      // reasoning as a password reset below.
      await destroyAllSessionsForUser(userId);

      await logUserAudit({
        actor: actorLabel(req),
        action: "user.roleChanged",
        target,
        details: { from: target.role, to: value.role },
      });
    }

    const updated = await fetchUserById(userId);
    const activeSessions = await countActiveSessionsForUser(userId);

    res.json({ user: toPublicUser(updated, activeSessions) });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/reset-password", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const target = await fetchUserById(userId);

    if (!target || target.source !== "local" || !target.username) {
      return res.status(404).json({
        error: "This account does not have a local password to reset.",
        code: "users.notFound",
      });
    }

    const { value, errors } = validate(passwordSchema, req.body);

    if (errors.length) {
      return res.status(400).json(validationError(errors[0]));
    }

    await setLocalPassword(userId, value.password);
    await destroyAllSessionsForUser(userId);

    await logUserAudit({
      actor: actorLabel(req),
      action: "user.passwordReset",
      target,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/active", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const target = await fetchUserById(userId);

    if (!target) {
      return res
        .status(404)
        .json({ error: "User not found", code: "users.notFound" });
    }

    const isActive = Boolean(req.body?.isActive);

    if (req.user?.id === userId && !isActive) {
      return res.status(403).json({
        error: "You cannot disable your own account.",
        code: "users.cannotDisableSelf",
      });
    }

    if (target.role === "admin" && target.isActive && !isActive) {
      const activeAdmins = await countActiveAdmins();

      if (activeAdmins <= 1) {
        return res.status(400).json({
          error: "Cannot disable the last active administrator.",
          code: "users.lastAdmin",
        });
      }
    }

    await setUserActive(userId, isActive);

    if (!isActive) {
      await destroyAllSessionsForUser(userId);
    }

    await logUserAudit({
      actor: actorLabel(req),
      action: isActive ? "user.enabled" : "user.disabled",
      target,
    });

    const updated = await fetchUserById(userId);
    const activeSessions = await countActiveSessionsForUser(userId);

    res.json({ user: toPublicUser(updated, activeSessions) });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/revoke-sessions", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const target = await fetchUserById(userId);

    if (!target) {
      return res
        .status(404)
        .json({ error: "User not found", code: "users.notFound" });
    }

    await destroyAllSessionsForUser(userId);

    await logUserAudit({
      actor: actorLabel(req),
      action: "user.sessionsRevoked",
      target,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const target = await fetchUserById(userId);

    if (!target) {
      return res
        .status(404)
        .json({ error: "User not found", code: "users.notFound" });
    }

    if (req.user?.id === userId) {
      return res.status(403).json({
        error: "You cannot delete your own account.",
        code: "users.cannotDeleteSelf",
      });
    }

    if (target.role === "admin" && target.isActive) {
      const activeAdmins = await countActiveAdmins();

      if (activeAdmins <= 1) {
        return res.status(400).json({
          error: "Cannot delete the last active administrator.",
          code: "users.lastAdmin",
        });
      }
    }

    await destroyAllSessionsForUser(userId);
    await deleteUser(userId);

    await logUserAudit({
      actor: actorLabel(req),
      action: "user.deleted",
      target,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
