const { all, run } = require("../database/db");

// Append-only log of who did what to which account (Admin Center's Local
// Users section). `actor`/`target` are the full user row (or null for
// system-initiated entries, e.g. the boot-time legacy admin migration) -
// only the id and a frozen display label are persisted, so the log still
// reads sensibly after the account is later renamed or deleted.
async function logUserAudit({ actor, action, target, details }) {
  await run(
    `INSERT INTO user_audit_log (actor_user_id, actor_label, action, target_user_id, target_label, details)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      actor?.id ?? null,
      actor
        ? actor.displayName || actor.username || actor.email || `#${actor.id}`
        : null,
      action,
      target?.id ?? null,
      target
        ? target.displayName ||
          target.username ||
          target.email ||
          `#${target.id}`
        : null,
      details ? JSON.stringify(details) : null,
    ],
  );
}

function listUserAudit(limit = 100) {
  return all(
    "SELECT * FROM user_audit_log ORDER BY created_at DESC, id DESC LIMIT ?",
    [limit],
  );
}

module.exports = { logUserAudit, listUserAudit };
