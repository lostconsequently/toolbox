const { all } = require("../database/db");
const { listUserAudit } = require("./userAuditService");

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function encodeCursor({ createdAt, id }) {
  return Buffer.from(JSON.stringify({ createdAt, id })).toString("base64url");
}

function decodeCursor(cursor) {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );

    if (!parsed.createdAt || !parsed.id) return null;

    return parsed;
  } catch {
    return null;
  }
}

// Normalizes a user_audit_log row (its own table/schema/service, see
// userAuditService.js - deliberately not merged into event_log) into the
// same shape as an event_log row, so the Logging UI can render both lists
// through one component without knowing there are two backing tables.
function normalizeAuditEntry(entry) {
  const details = entry.details ? JSON.parse(entry.details) : null;

  return {
    id: `audit-${entry.id}`,
    createdAt: entry.createdAt,
    level: "info",
    category: "security",
    eventType: `user_audit.${entry.action}`,
    source: "USERS",
    message: entry.targetLabel
      ? `${entry.actorLabel || "System"} - ${entry.action} (${entry.targetLabel})`
      : `${entry.actorLabel || "System"} - ${entry.action}`,
    userId: entry.actorUserId,
    userLabel: entry.actorLabel,
    ip: null,
    details,
    stackTrace: null,
  };
}

function buildFilters({
  level,
  category,
  eventType,
  userId,
  q,
  from,
  to,
  cursor,
}) {
  const conditions = [];
  const params = [];

  if (level?.length) {
    conditions.push(`level IN (${level.map(() => "?").join(",")})`);
    params.push(...level);
  }

  if (category?.length) {
    conditions.push(`category IN (${category.map(() => "?").join(",")})`);
    params.push(...category);
  }

  if (eventType) {
    conditions.push("event_type = ?");
    params.push(eventType);
  }

  if (userId) {
    conditions.push("user_id = ?");
    params.push(userId);
  }

  if (q) {
    conditions.push("(message LIKE ? OR details LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }

  if (from) {
    conditions.push("created_at >= ?");
    params.push(from);
  }

  if (to) {
    conditions.push("created_at <= ?");
    params.push(to);
  }

  const decodedCursor = cursor ? decodeCursor(cursor) : null;

  if (decodedCursor) {
    conditions.push("(created_at < ? OR (created_at = ? AND id < ?))");
    params.push(
      decodedCursor.createdAt,
      decodedCursor.createdAt,
      decodedCursor.id,
    );
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

// Keyset-paginated (ORDER BY created_at DESC, id DESC), same cursor shape
// as userAuditService.listUserAudit's ordering. `includeUserAudit` merges
// normalized user_audit_log rows in - only on the first page (no cursor),
// since interleaving two independently-paginated tables across later pages
// would risk duplicate/missed audit rows; audit history beyond the first
// page is still reachable via the dedicated /api/admin/users/audit-log
// endpoint.
async function listEvents({
  level,
  category,
  eventType,
  userId,
  q,
  from,
  to,
  cursor,
  limit = DEFAULT_LIMIT,
  includeUserAudit = false,
} = {}) {
  const effectiveLimit = Math.min(Math.max(1, limit), MAX_LIMIT);

  const { whereClause, params } = buildFilters({
    level,
    category,
    eventType,
    userId,
    q,
    from,
    to,
    cursor,
  });

  // Fetch one extra row to know whether there's a next page without a
  // separate COUNT query.
  const rows = await all(
    `SELECT * FROM event_log ${whereClause} ORDER BY created_at DESC, id DESC LIMIT ?`,
    [...params, effectiveLimit + 1],
  );

  const hasMore = rows.length > effectiveLimit;

  let entries = rows.slice(0, effectiveLimit).map((row) => ({
    ...row,
    details: row.details ? JSON.parse(row.details) : null,
  }));

  if (includeUserAudit && !cursor) {
    const auditEntries = (await listUserAudit(effectiveLimit)).map(
      normalizeAuditEntry,
    );

    entries = [...entries, ...auditEntries]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, effectiveLimit);
  }

  const last = entries[entries.length - 1];

  // A merged audit entry has a synthetic string id ("audit-123") that can't
  // seed a real event_log cursor - only paginate past a page that ended on
  // a genuine event_log row.
  const nextCursor =
    hasMore && last && typeof last.id === "number"
      ? encodeCursor({ createdAt: last.createdAt, id: last.id })
      : null;

  return { entries, nextCursor, hasMore: Boolean(nextCursor) };
}

module.exports = { listEvents };
