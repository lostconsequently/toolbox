const express = require("express");

const router = express.Router();

const { validate, validationError } = require("../utils/validate");
const { createRateLimiter } = require("../utils/rateLimiter");
const { listEvents } = require("../services/logQueryService");
const { EVENT_TYPES } = require("../services/eventTypes");
const {
  getLoggingConfig,
  setLoggingConfig,
} = require("../services/loggingConfigService");
const {
  deleteLogs,
  scheduleNextPurge,
} = require("../services/logRetentionService");
const { logInfo } = require("../services/logService");

// This whole router is mounted behind requireAdmin at the app.js level
// (app.use("/api/admin/logs", requireAdmin, logsRoutes)), same as
// system-info/users - no per-route gating needed here.

const LEVELS = ["info", "warning", "error", "critical"];
const CATEGORIES = ["system", "error", "security", "api", "auth"];

function parseListParam(value, allowed) {
  if (!value) return undefined;

  const values = String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (values.some((entry) => !allowed.includes(entry))) {
    return null; // signals "invalid" to the caller
  }

  return values.length ? values : undefined;
}

router.get("/", async (req, res, next) => {
  try {
    const level = parseListParam(req.query.level, LEVELS);
    const category = parseListParam(req.query.category, CATEGORIES);

    if (level === null || category === null) {
      return res.status(400).json({
        error: "Invalid level or category filter.",
        code: "logs.invalidFilter",
      });
    }

    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    if (limit !== undefined && (!Number.isFinite(limit) || limit < 1)) {
      return res.status(400).json({
        error: "limit must be a positive number.",
        code: "logs.invalidLimit",
      });
    }

    const result = await listEvents({
      level,
      category,
      eventType: req.query.eventType || undefined,
      userId: req.query.userId ? Number(req.query.userId) : undefined,
      q: req.query.q || undefined,
      from: req.query.from || undefined,
      to: req.query.to || undefined,
      cursor: req.query.cursor || undefined,
      limit,
      includeUserAudit: req.query.includeUserAudit === "true",
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/event-types", (req, res) => {
  res.json({ eventTypes: EVENT_TYPES });
});

const exportLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

function csvEscape(value) {
  if (value === null || value === undefined) return "";

  const str = typeof value === "object" ? JSON.stringify(value) : String(value);

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

const EXPORT_COLUMNS = [
  "id",
  "createdAt",
  "level",
  "category",
  "eventType",
  "source",
  "message",
  "userLabel",
  "ip",
];

router.get("/export", exportLimiter, async (req, res, next) => {
  try {
    const format = req.query.format === "json" ? "json" : "csv";

    const level = parseListParam(req.query.level, LEVELS);
    const category = parseListParam(req.query.category, CATEGORIES);

    if (level === null || category === null) {
      return res.status(400).json({
        error: "Invalid level or category filter.",
        code: "logs.invalidFilter",
      });
    }

    const filename = `toolbox-logs-${new Date().toISOString().split("T")[0]}.${format}`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      format === "json" ? "application/json" : "text/csv",
    );

    const baseFilters = {
      level,
      category,
      eventType: req.query.eventType || undefined,
      userId: req.query.userId ? Number(req.query.userId) : undefined,
      q: req.query.q || undefined,
      from: req.query.from || undefined,
      to: req.query.to || undefined,
      limit: 500,
    };

    if (format === "csv") {
      res.write(`${EXPORT_COLUMNS.join(",")}\n`);
    } else {
      res.write("[");
    }

    let cursor;
    let isFirst = true;
    let totalExported = 0;
    const EXPORT_HARD_CAP = 50000; // safety net against an unbounded export

    // Streams page-by-page (res.write per row) rather than loading the
    // whole filtered result into memory - a filtered export can still span
    // many pages on a large table.
    for (;;) {
      // eslint-disable-next-line no-await-in-loop
      const { entries, nextCursor } = await listEvents({
        ...baseFilters,
        cursor,
      });

      for (const entry of entries) {
        if (format === "csv") {
          res.write(
            `${EXPORT_COLUMNS.map((col) => csvEscape(entry[col])).join(",")}\n`,
          );
        } else {
          res.write(`${isFirst ? "" : ","}${JSON.stringify(entry)}`);
          isFirst = false;
        }
      }

      totalExported += entries.length;

      if (!nextCursor || totalExported >= EXPORT_HARD_CAP) break;

      cursor = nextCursor;
    }

    if (format === "json") {
      res.write("]");
    }

    res.end();

    logInfo({
      category: "system",
      eventType: "logs.exported",
      source: "LOGS",
      message: `Log export (${format}) produced ${totalExported} entries`,
      req,
      details: { format, totalExported },
    });
  } catch (err) {
    next(err);
  }
});

const loggingConfigSchema = {
  systemRetentionDays: {
    type: "number",
    label: "System log retention (days)",
    required: true,
    min: 0,
    max: 3650,
  },
  errorRetentionDays: {
    type: "number",
    label: "Error log retention (days)",
    required: true,
    min: 0,
    max: 3650,
  },
  securityRetentionDays: {
    type: "number",
    label: "Audit/security log retention (days)",
    required: true,
    min: 0,
    max: 3650,
  },
  maxTotalRows: {
    type: "number",
    label: "Maximum stored log entries",
    required: true,
    min: 1000,
    max: 1000000,
  },
};

router.get("/config", async (req, res, next) => {
  try {
    const config = await getLoggingConfig();

    res.json(config);
  } catch (err) {
    next(err);
  }
});

router.put("/config", async (req, res, next) => {
  try {
    const { value, errors } = validate(loggingConfigSchema, req.body);

    if (errors.length) {
      return res.status(400).json(validationError(errors[0]));
    }

    const updated = await setLoggingConfig(value);

    // Apply the new retention settings immediately rather than waiting for
    // the currently-scheduled purge cycle to fire on the old settings.
    scheduleNextPurge();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const purgeLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

router.post("/purge", purgeLimiter, async (req, res, next) => {
  try {
    const { olderThanDays, category, confirm } = req.body || {};

    if (confirm !== true) {
      return res.status(400).json({
        error: "Purge requires explicit confirmation.",
        code: "logs.purgeNotConfirmed",
      });
    }

    if (category !== undefined && !CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: "Invalid category.",
        code: "logs.invalidFilter",
      });
    }

    const deletedCount = await deleteLogs({
      olderThanDays:
        olderThanDays === undefined || olderThanDays === null
          ? undefined
          : Number(olderThanDays),
      category,
    });

    logInfo({
      category: "system",
      eventType: "logs.manual_purge",
      source: "LOGS",
      message: `Manual log purge removed ${deletedCount} entries`,
      req,
      details: { deletedCount, olderThanDays, category },
    });

    res.json({ deletedCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
