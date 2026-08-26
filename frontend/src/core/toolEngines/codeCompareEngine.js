import { diffArrays } from "diff";

export const CODE_COMPARE_LANGUAGES = [
  "plaintext",
  "json",
  "javascript",
  "typescript",
  "powershell",
  "html",
  "css",
  "sql",
  "xml",
  "yaml",
];

export const LARGE_INPUT_CHAR_THRESHOLD = 300_000;

const MAX_EDIT_LENGTH = 2000;

function splitLines(text) {
  if (!text) return [];

  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function normalizeForCompare(line, { ignoreWhitespace, ignoreCase }) {
  let normalized = line;

  if (ignoreWhitespace) {
    normalized = normalized.trim().replace(/\s+/g, " ");
  }

  if (ignoreCase) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}

function buildRows(parts) {
  const rows = [];
  let originalLineNumber = 0;
  let modifiedLineNumber = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (!part.added && !part.removed) {
      for (const line of part.value) {
        originalLineNumber += 1;
        modifiedLineNumber += 1;

        rows.push({
          type: "unchanged",
          originalLine: line,
          modifiedLine: line,
          originalLineNumber,
          modifiedLineNumber,
        });
      }

      continue;
    }

    if (part.removed) {
      const removedLines = part.value;
      const next = parts[i + 1];

      if (next?.added) {
        const addedLines = next.value;
        const pairCount = Math.min(removedLines.length, addedLines.length);

        for (let j = 0; j < pairCount; j++) {
          originalLineNumber += 1;
          modifiedLineNumber += 1;

          rows.push({
            type: "changed",
            originalLine: removedLines[j],
            modifiedLine: addedLines[j],
            originalLineNumber,
            modifiedLineNumber,
          });
        }

        for (let j = pairCount; j < removedLines.length; j++) {
          originalLineNumber += 1;

          rows.push({
            type: "removed",
            originalLine: removedLines[j],
            modifiedLine: null,
            originalLineNumber,
            modifiedLineNumber: null,
          });
        }

        for (let j = pairCount; j < addedLines.length; j++) {
          modifiedLineNumber += 1;

          rows.push({
            type: "added",
            originalLine: null,
            modifiedLine: addedLines[j],
            originalLineNumber: null,
            modifiedLineNumber,
          });
        }

        i += 1;
        continue;
      }

      for (const line of removedLines) {
        originalLineNumber += 1;

        rows.push({
          type: "removed",
          originalLine: line,
          modifiedLine: null,
          originalLineNumber,
          modifiedLineNumber: null,
        });
      }

      continue;
    }

    for (const line of part.value) {
      modifiedLineNumber += 1;

      rows.push({
        type: "added",
        originalLine: null,
        modifiedLine: line,
        originalLineNumber: null,
        modifiedLineNumber,
      });
    }
  }

  return rows;
}

function statsFromRows(rows) {
  const stats = { added: 0, removed: 0, changed: 0 };

  for (const row of rows) {
    if (row.type !== "unchanged") {
      stats[row.type] += 1;
    }
  }

  return stats;
}

export function compareText(originalText, modifiedText, options = {}) {
  const {
    ignoreWhitespace = false,
    ignoreCase = false,
    ignoreEmptyLines = false,
  } = options;

  if (!originalText && !modifiedText) {
    return {
      status: "empty",
      rows: [],
      stats: { added: 0, removed: 0, changed: 0 },
      identical: true,
      originalLineCount: 0,
      modifiedLineCount: 0,
    };
  }

  let originalLines = splitLines(originalText);
  let modifiedLines = splitLines(modifiedText);

  if (ignoreEmptyLines) {
    originalLines = originalLines.filter((line) => line.trim() !== "");
    modifiedLines = modifiedLines.filter((line) => line.trim() !== "");
  }

  const comparator = (a, b) =>
    normalizeForCompare(a, { ignoreWhitespace, ignoreCase }) ===
    normalizeForCompare(b, { ignoreWhitespace, ignoreCase });

  const parts = diffArrays(originalLines, modifiedLines, {
    comparator,
    maxEditLength: MAX_EDIT_LENGTH,
  });

  if (!parts) {
    return {
      status: "tooLarge",
      rows: [],
      stats: { added: 0, removed: 0, changed: 0 },
      identical: false,
      originalLineCount: originalLines.length,
      modifiedLineCount: modifiedLines.length,
    };
  }

  const rows = buildRows(parts);
  const stats = statsFromRows(rows);

  return {
    status: "success",
    rows,
    stats,
    identical: stats.added === 0 && stats.removed === 0 && stats.changed === 0,
    originalLineCount: originalLines.length,
    modifiedLineCount: modifiedLines.length,
  };
}

export function formatDiffAsText(rows) {
  const lines = [];

  for (const row of rows) {
    if (row.type === "unchanged") {
      lines.push(`  ${row.originalLine}`);
    } else if (row.type === "removed") {
      lines.push(`- ${row.originalLine}`);
    } else if (row.type === "added") {
      lines.push(`+ ${row.modifiedLine}`);
    } else if (row.type === "changed") {
      lines.push(`- ${row.originalLine}`);
      lines.push(`+ ${row.modifiedLine}`);
    }
  }

  return lines.join("\n");
}

export function runCodeCompareTool() {
  return Promise.resolve({
    status: "success",
    message: "Code Compare runs entirely within its own window.",
  });
}
