const MAX_CHARS = 200;

function describeChar(char) {
  if (char === " ") return "(space)";
  if (char === "\n") return "(newline)";
  if (char === "\t") return "(tab)";
  if (char === "\r") return "(carriage return)";
  return char;
}

export function inspectText(text = "") {
  if (!text) {
    return {
      type: "unicodeInspector",
      status: "neutral",
      chars: [],
      truncated: false,
      stats: null,
    };
  }

  const codePoints = Array.from(text);
  const utf8Bytes = new TextEncoder().encode(text);

  const chars = codePoints.slice(0, MAX_CHARS).map((char) => {
    const codePoint = char.codePointAt(0);
    const bytes = Array.from(new TextEncoder().encode(char));

    return {
      display: describeChar(char),
      codePointHex: `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
      codePointDec: codePoint,
      utf8ByteCount: bytes.length,
      utf8Hex: bytes
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(" "),
      utf16Units: char.length,
    };
  });

  return {
    type: "unicodeInspector",
    status: "success",
    chars,
    truncated: codePoints.length > MAX_CHARS,
    stats: {
      codePointCount: codePoints.length,
      utf16UnitCount: text.length,
      utf8ByteCount: utf8Bytes.length,
      containsNonAscii: codePoints.some((char) => char.codePointAt(0) > 127),
      containsSurrogatePairs: codePoints.some((char) => char.length === 2),
    },
  };
}
