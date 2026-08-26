import { parseCsv, matchHeaders } from "../utils/csv";

const HEADER_RULES = [
  {
    field: "messageId",
    label: "Message ID",
    keywords: ["messagetraceid", "messageid", "networkmessageid"],
  },
  { field: "event", label: "Event", keywords: ["eventtype", "event"] },
  {
    field: "detail",
    label: "Detail",
    keywords: ["detail", "additionalinfo", "data", "action"],
  },
  {
    field: "timestamp",
    label: "Timestamp",
    keywords: [
      "datereceivedutc",
      "receivedtimeutc",
      "timereceivedutc",
      "received",
      "date",
      "timestamp",
    ],
  },
  { field: "sender", label: "Sender", keywords: ["senderaddress", "sender"] },
  {
    field: "recipient",
    label: "Recipient",
    keywords: ["recipientaddress", "recipientstatus", "recipient"],
  },
  { field: "subject", label: "Subject", keywords: ["subject"] },
  { field: "status", label: "Status", keywords: ["deliverystatus", "status"] },
  {
    field: "size",
    label: "Size",
    keywords: ["messagesizekb", "messagesize", "totalbytes", "size"],
  },
  {
    field: "source",
    label: "Server/source",
    keywords: ["serverhostname", "server", "source"],
  },
  {
    field: "direction",
    label: "Direction",
    keywords: ["directionality", "direction"],
  },
];

function buildFieldMap(headers) {
  return matchHeaders(headers, HEADER_RULES);
}

function parseTimestamp(raw) {
  if (!raw) return null;

  const ms = new Date(raw.trim()).getTime();

  return Number.isNaN(ms) ? null : ms;
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "unknown";
  if (ms < 1000) return `${Math.round(ms)}ms`;

  const totalSeconds = ms / 1000;

  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (minutes < 60) return `${minutes}m ${seconds}s`;

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;

  return `${hours}u ${remMinutes}m`;
}

function classifyDelay(deltaMs) {
  if (deltaMs === null || deltaMs === undefined) return "neutral";
  if (deltaMs < 10_000) return "success";
  if (deltaMs < 60_000) return "warning";
  return "error";
}

const SUCCESS_STATUSES = new Set(["delivered", "sent", "resolved"]);
const ERROR_STATUSES = new Set(["failed", "filteredasspam", "poisonmessage"]);

export function classifyStatus(status) {
  if (!status) return "neutral";

  const normalized = status.trim().toLowerCase();

  if (SUCCESS_STATUSES.has(normalized)) return "success";
  if (ERROR_STATUSES.has(normalized)) return "error";

  return "warning";
}

function topValues(rows, field, limit = 8) {
  const counts = new Map();

  rows.forEach((row) => {
    const raw = row[field];
    if (!raw) return;

    raw
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => {
        counts.set(value, (counts.get(value) || 0) + 1);
      });
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function buildDetailGroups(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const key = row.messageId || "__single__";

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(row);
  });

  return Array.from(groups.entries())
    .map(([messageId, groupRows]) => {
      const withTimestamps = groupRows.map((row) => ({
        ...row,
        timestampMs: parseTimestamp(row.timestamp),
      }));

      const sorted = [...withTimestamps].sort((a, b) => {
        if (a.timestampMs === null && b.timestampMs === null) return 0;
        if (a.timestampMs === null) return 1;
        if (b.timestampMs === null) return -1;
        return a.timestampMs - b.timestampMs;
      });

      const firstTimestamp =
        sorted.find((r) => r.timestampMs !== null)?.timestampMs ?? null;
      let previousTimestamp = null;

      const hops = sorted.map((row) => {
        const deltaFromPreviousMs =
          row.timestampMs !== null && previousTimestamp !== null
            ? row.timestampMs - previousTimestamp
            : null;

        const deltaFromStartMs =
          row.timestampMs !== null && firstTimestamp !== null
            ? row.timestampMs - firstTimestamp
            : null;

        if (row.timestampMs !== null) {
          previousTimestamp = row.timestampMs;
        }

        return {
          event: row.event || "-",
          detail: row.detail || "",
          status: row.status || "",
          timestampMs: row.timestampMs,
          timestampRaw: row.timestamp || "",
          deltaFromPreviousMs,
          deltaFromStartMs,
          severity: classifyDelay(deltaFromPreviousMs),
        };
      });

      const lastTimestamp =
        [...sorted].reverse().find((r) => r.timestampMs !== null)
          ?.timestampMs ?? null;

      const totalDurationMs =
        firstTimestamp !== null && lastTimestamp !== null
          ? lastTimestamp - firstTimestamp
          : null;

      const bottleneck =
        hops
          .filter((hop) => hop.deltaFromPreviousMs !== null)
          .sort((a, b) => b.deltaFromPreviousMs - a.deltaFromPreviousMs)[0] ||
        null;

      const sample = groupRows[0] || {};

      return {
        messageId: messageId === "__single__" ? null : messageId,
        subject: sample.subject || "",
        sender: sample.sender || "",
        recipient: sample.recipient || "",
        hopCount: hops.length,
        totalDurationMs,
        bottleneck,
        hops,
        hasTimestamps: firstTimestamp !== null,
      };
    })
    .sort((a, b) => (b.totalDurationMs ?? -1) - (a.totalDurationMs ?? -1));
}

function buildSummary(rows) {
  const messages = rows.map((row) => ({
    messageId: row.messageId || "",
    sender: row.sender || "",
    recipient: row.recipient || "",
    subject: row.subject || "",
    status: row.status || "",
    timestampMs: parseTimestamp(row.timestamp),
    timestampRaw: row.timestamp || "",
    size: row.size || "",
  }));

  const byStatus = new Map();

  messages.forEach((message) => {
    const key = message.status || "Unknown";
    byStatus.set(key, (byStatus.get(key) || 0) + 1);
  });

  const sizes = rows
    .map((row) => Number.parseFloat((row.size || "").replace(/[^\d.]/g, "")))
    .filter((value) => !Number.isNaN(value));

  const avgSize = sizes.length
    ? sizes.reduce((sum, value) => sum + value, 0) / sizes.length
    : null;

  return {
    messages: messages.sort(
      (a, b) => (b.timestampMs ?? 0) - (a.timestampMs ?? 0),
    ),
    total: messages.length,
    byStatus: Array.from(byStatus.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    topSenders: topValues(rows, "sender"),
    topRecipients: topValues(rows, "recipient"),
    avgSize,
  };
}

export function parseMessageTraceCsv(csvText, fileName = "") {
  try {
    const table = parseCsv(csvText);

    if (table.length < 2) {
      return {
        success: false,
        error:
          "The file contains no data rows. Check that this is a valid CSV export.",
      };
    }

    const [headerRow, ...dataRows] = table;
    const { map: fieldMap, detected } = buildFieldMap(headerRow);

    const rows = dataRows
      .filter((r) => r.some((cell) => cell.trim() !== ""))
      .map((cells) => {
        const row = {};
        Object.entries(fieldMap).forEach(([field, index]) => {
          row[field] = (cells[index] || "").trim();
        });
        return row;
      });

    if (rows.length === 0) {
      return {
        success: false,
        error: "No usable data rows found after parsing the CSV.",
      };
    }

    const warnings = [];

    if (fieldMap.timestamp === undefined) {
      warnings.push("No timestamp column found — delays cannot be calculated.");
    }

    const hasHopColumn =
      fieldMap.event !== undefined || fieldMap.detail !== undefined;
    const hopValuesPresent = rows.some((row) => row.event || row.detail);
    const mode = hasHopColumn && hopValuesPresent ? "detail" : "summary";

    if (mode === "detail" && fieldMap.messageId === undefined) {
      warnings.push(
        "No Message ID column found — all rows are treated as a single message.",
      );
    }

    return {
      success: true,
      fileName,
      mode,
      rowCount: rows.length,
      detectedColumns: detected,
      warnings,
      detail: mode === "detail" ? { groups: buildDetailGroups(rows) } : null,
      summary: mode === "summary" ? buildSummary(rows) : null,
    };
  } catch (error) {
    return {
      success: false,
      error: `Parse error: ${error.message}`,
    };
  }
}

export async function runMessageTraceTool(tool, inputValues) {
  return inputValues.result || { success: false, error: "No data" };
}
