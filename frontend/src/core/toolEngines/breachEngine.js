import { api } from "../../services/api";

const RISK_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function getRiskLabel(riskLevel) {
  return RISK_LABELS[riskLevel] || "Unknown";
}

export function formatBreachCount(count) {
  if (!count) {
    return "0";
  }

  if (count >= 100000) {
    return `${(Math.floor(count / 1000) * 1000).toLocaleString()}+`;
  }

  return count.toLocaleString();
}

function getRiskLevel(count) {
  if (count <= 0) {
    return "low";
  }

  if (count < 100) {
    return "medium";
  }

  if (count < 10000) {
    return "high";
  }

  return "critical";
}

function getRiskStatus(riskLevel) {
  if (riskLevel === "low") {
    return "success";
  }

  if (riskLevel === "medium") {
    return "warning";
  }

  return "error";
}

function getAdvice(count, riskLevel) {
  if (count <= 0) {
    return "Password acceptable. Not seen in known breaches, but always use a unique password per account.";
  }

  if (riskLevel === "medium") {
    return "Replace this password. It appears in known breaches.";
  }

  return "Replace this password immediately. It appears frequently in known breaches.";
}

async function sha1Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function checkBreachPassword(password) {
  if (!password) {
    throw new Error("No password provided.");
  }

  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await api.checkBreachPasswordPrefix(prefix);

  const match = response.entries?.find((entry) => entry.suffix === suffix);
  const count = match?.count || 0;
  const riskLevel = getRiskLevel(count);

  return {
    type: "breachPasswordChecker",
    hash,
    prefix,
    found: count > 0,
    count,
    riskLevel,
    riskStatus: getRiskStatus(riskLevel),
    advice: getAdvice(count, riskLevel),
  };
}

export async function runBreachTool(tool, inputValues) {
  const password = inputValues.password || inputValues.input || "";

  return checkBreachPassword(password);
}

export const MAX_BULK_PASSWORDS = 40;

export function parseBulkPasswords(value = "") {
  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_BULK_PASSWORDS)
    .map((line, index) => {
      const commaIndex = line.indexOf(",");

      if (commaIndex > -1) {
        return {
          label: line.slice(0, commaIndex).trim() || `Line ${index + 1}`,
          password: line.slice(commaIndex + 1).trim(),
        };
      }

      return {
        label: `Line ${index + 1}`,
        password: line,
      };
    })
    .filter((entry) => entry.password);
}

export function maskPassword(password = "") {
  if (password.length <= 2) {
    return "*".repeat(password.length);
  }

  return `${password[0]}${"*".repeat(password.length - 2)}${password[password.length - 1]}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkBreachPasswordsBulk(
  entries,
  { onProgress, delayMs = 350 } = {},
) {
  const results = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];

    try {
      const checkResult = await checkBreachPassword(entry.password);

      results.push({
        label: entry.label,
        masked: maskPassword(entry.password),
        found: checkResult.found,
        count: checkResult.count,
        riskLevel: checkResult.riskLevel,
        riskStatus: checkResult.riskStatus,
        advice: checkResult.advice,
        error: null,
      });
    } catch (error) {
      results.push({
        label: entry.label,
        masked: maskPassword(entry.password),
        found: false,
        count: 0,
        riskLevel: null,
        riskStatus: "neutral",
        advice: null,
        error: error?.message || "Check failed.",
      });
    }

    onProgress?.(index + 1, entries.length);

    if (index < entries.length - 1) {
      await sleep(delayMs);
    }
  }

  return results;
}

export function buildAuditEntry(reference, result) {
  return {
    timestamp: new Date().toISOString(),
    reference: reference || "-",
    status: result.found ? "Breached" : "Not found",
    count: result.count,
    riskLevel: getRiskLabel(result.riskLevel),
    advice: result.advice || "-",
  };
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function auditLogToCsv(entries) {
  const header = [
    "Timestamp",
    "Reference",
    "Status",
    "Count",
    "Risk",
    "Advice",
  ];

  const rows = entries.map((entry) =>
    [
      new Date(entry.timestamp).toLocaleString(),
      entry.reference,
      entry.status,
      entry.count,
      entry.riskLevel,
      entry.advice,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [header.map(csvEscape).join(","), ...rows].join("\n");
}
