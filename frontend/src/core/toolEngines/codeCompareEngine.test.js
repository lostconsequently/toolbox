import { describe, expect, it } from "vitest";
import { compareText, formatDiffAsText } from "./codeCompareEngine";

describe("compareText", () => {
  it("reports empty status when both inputs are empty", () => {
    const result = compareText("", "");

    expect(result.status).toBe("empty");
    expect(result.identical).toBe(true);
    expect(result.rows).toEqual([]);
  });

  it("detects identical input as no differences", () => {
    const text = "line one\nline two\nline three";
    const result = compareText(text, text);

    expect(result.status).toBe("success");
    expect(result.identical).toBe(true);
    expect(result.stats).toEqual({ added: 0, removed: 0, changed: 0 });
    expect(result.rows.every((row) => row.type === "unchanged")).toBe(true);
  });

  it("detects an added line", () => {
    const result = compareText("a\nb", "a\nb\nc");

    expect(result.identical).toBe(false);
    expect(result.stats).toEqual({ added: 1, removed: 0, changed: 0 });

    const addedRow = result.rows.find((row) => row.type === "added");

    expect(addedRow.modifiedLine).toBe("c");
    expect(addedRow.originalLine).toBeNull();
    expect(addedRow.modifiedLineNumber).toBe(3);
  });

  it("detects a removed line", () => {
    const result = compareText("a\nb\nc", "a\nc");

    expect(result.stats).toEqual({ added: 0, removed: 1, changed: 0 });

    const removedRow = result.rows.find((row) => row.type === "removed");

    expect(removedRow.originalLine).toBe("b");
    expect(removedRow.modifiedLine).toBeNull();
    expect(removedRow.originalLineNumber).toBe(2);
  });

  it("detects a modified line as a single 'changed' row, not add+remove", () => {
    const result = compareText("hello world", "hello there");

    expect(result.stats).toEqual({ added: 0, removed: 0, changed: 1 });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      type: "changed",
      originalLine: "hello world",
      modifiedLine: "hello there",
      originalLineNumber: 1,
      modifiedLineNumber: 1,
    });
  });

  it("handles a block of changed lines followed by a pure addition", () => {
    const original = "a\nb\nc";
    const modified = "a\nx\nc\nd";
    const result = compareText(original, modified);

    expect(result.stats).toEqual({ added: 1, removed: 0, changed: 1 });

    const changed = result.rows.find((row) => row.type === "changed");
    const added = result.rows.find((row) => row.type === "added");

    expect(changed).toMatchObject({ originalLine: "b", modifiedLine: "x" });
    expect(added.modifiedLine).toBe("d");
  });

  it("treats CRLF and LF line endings as equivalent", () => {
    const result = compareText("a\r\nb\r\nc", "a\nb\nc");

    expect(result.identical).toBe(true);
  });

  describe("ignore options", () => {
    it("ignoreWhitespace treats leading/trailing/internal whitespace diffs as unchanged", () => {
      const result = compareText("  hello   world  ", "hello world", {
        ignoreWhitespace: true,
      });

      expect(result.identical).toBe(true);
    });

    it("without ignoreWhitespace, whitespace-only differences still count as a change", () => {
      const result = compareText("  hello world", "hello world");

      expect(result.identical).toBe(false);
      expect(result.stats.changed).toBe(1);
    });

    it("ignoreCase treats differently-cased lines as unchanged", () => {
      const result = compareText("Hello World", "hello world", {
        ignoreCase: true,
      });

      expect(result.identical).toBe(true);
    });

    it("without ignoreCase, casing differences still count as a change", () => {
      const result = compareText("Hello World", "hello world");

      expect(result.identical).toBe(false);
    });

    it("ignoreEmptyLines drops blank lines from the comparison entirely", () => {
      const original = "a\n\nb\n\n\nc";
      const modified = "a\nb\nc";
      const result = compareText(original, modified, {
        ignoreEmptyLines: true,
      });

      expect(result.identical).toBe(true);
    });

    it("without ignoreEmptyLines, extra blank lines still count as additions", () => {
      const result = compareText("a\nb", "a\n\nb");

      expect(result.identical).toBe(false);
      expect(result.stats.added).toBe(1);
    });

    it("combines ignoreWhitespace and ignoreCase together", () => {
      const result = compareText("  HELLO  ", "hello", {
        ignoreWhitespace: true,
        ignoreCase: true,
      });

      expect(result.identical).toBe(true);
    });
  });

  it("handles large input without throwing and reports correct stats", () => {
    const lineCount = 20_000;
    const originalLines = [];
    const modifiedLines = [];

    for (let i = 0; i < lineCount; i++) {
      originalLines.push(`line ${i}`);
      modifiedLines.push(i % 500 === 0 ? `line ${i} changed` : `line ${i}`);
    }

    const result = compareText(
      originalLines.join("\n"),
      modifiedLines.join("\n"),
    );

    expect(result.status).toBe("success");
    expect(result.stats.changed).toBe(Math.ceil(lineCount / 500));
    expect(result.originalLineCount).toBe(lineCount);
  });

  it("reports 'tooLarge' instead of hanging on huge, largely dissimilar input", () => {
    const original = Array.from(
      { length: 5000 },
      (_, i) => `orig-${i}-${Math.random()}`,
    ).join("\n");
    const modified = Array.from(
      { length: 5000 },
      (_, i) => `mod-${i}-${Math.random()}`,
    ).join("\n");

    const result = compareText(original, modified);

    expect(["success", "tooLarge"]).toContain(result.status);
    expect(Array.isArray(result.rows)).toBe(true);
  });
});

describe("formatDiffAsText", () => {
  it("formats added, removed, changed and unchanged rows with diff markers", () => {
    const rows = [
      { type: "unchanged", originalLine: "same", modifiedLine: "same" },
      { type: "removed", originalLine: "gone", modifiedLine: null },
      { type: "added", originalLine: null, modifiedLine: "new" },
      { type: "changed", originalLine: "old text", modifiedLine: "new text" },
    ];

    const text = formatDiffAsText(rows);

    expect(text).toBe(
      ["  same", "- gone", "+ new", "- old text", "+ new text"].join("\n"),
    );
  });

  it("returns an empty string for no rows", () => {
    expect(formatDiffAsText([])).toBe("");
  });
});
