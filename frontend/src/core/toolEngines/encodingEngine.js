export const formatOptions = [
  { label: "Text (UTF-8)", value: "text" },
  { label: "Base64", value: "base64" },
  { label: "Base32", value: "base32" },
  { label: "URL encoded", value: "url" },
  { label: "Hex", value: "hex" },
  { label: "HTML entities", value: "html" },
  { label: "XML entities", value: "xml" },
  { label: "JSON escaped string", value: "jsonEscape" },
];

export function getFormatLabel(value) {
  return formatOptions.find((option) => option.value === value)?.label || value;
}

function textToBytes(text) {
  return new TextEncoder().encode(text);
}

function bytesToText(bytes) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function normalizeBase64(value) {
  return String(value).trim().replace(/-/g, "+").replace(/_/g, "/");
}

export function isValidBase64(value) {
  const cleaned = normalizeBase64(value).replace(/\s+/g, "");

  if (!cleaned) {
    return false;
  }

  return /^[A-Za-z0-9+/]*={0,2}$/.test(cleaned) && cleaned.length % 4 === 0;
}

function base64ToBytes(value) {
  if (!isValidBase64(value)) {
    throw new Error(
      "Invalid Base64 input. Check the characters and padding (=).",
    );
  }

  const cleaned = normalizeBase64(value).replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function normalizeBase32(value) {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/=+$/, "");
}

export function isValidBase32(value) {
  const cleaned = normalizeBase32(value);

  if (!cleaned) {
    return false;
  }

  return /^[A-Z2-7]+$/.test(cleaned);
}

function base32ToBytes(value) {
  if (!isValidBase32(value)) {
    throw new Error("Invalid Base32 input. Use only A-Z and 2-7.");
  }

  const cleaned = normalizeBase32(value);
  const out = [];

  let bits = 0;
  let acc = 0;

  for (const char of cleaned) {
    acc = (acc << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;

    if (bits >= 8) {
      out.push((acc >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(out);
}

function bytesToBase32(bytes) {
  let bits = 0;
  let acc = 0;
  let output = "";

  bytes.forEach((byte) => {
    acc = (acc << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(acc >>> (bits - 5)) & 31];
      bits -= 5;
    }
  });

  if (bits > 0) {
    output += BASE32_ALPHABET[(acc << (5 - bits)) & 31];
  }

  while (output.length % 8 !== 0) {
    output += "=";
  }

  return output;
}

const ENTITY_ENCODE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeEntities(text) {
  return String(text).replace(/[&<>"']/g, (char) => ENTITY_ENCODE_MAP[char]);
}

function unescapeEntities(value) {
  return String(value).replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (match, ref) => {
      if (ref[0] === "#") {
        const isHex = ref[1] === "x" || ref[1] === "X";
        const code = isHex
          ? parseInt(ref.slice(2), 16)
          : parseInt(ref.slice(1), 10);

        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }

      const lower = ref.toLowerCase();

      if (lower === "amp") return "&";
      if (lower === "lt") return "<";
      if (lower === "gt") return ">";
      if (lower === "quot") return '"';
      if (lower === "apos") return "'";

      return match;
    },
  );
}

function jsonEscapeText(text) {
  return JSON.stringify(String(text)).slice(1, -1);
}

function jsonUnescapeText(value) {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    throw new Error(
      "Invalid JSON-escaped text. Check the backslashes and quotes.",
    );
  }
}

function normalizeHex(value) {
  return String(value)
    .trim()
    .replace(/[\s:,-]+/g, "");
}

export function isValidHex(value) {
  const cleaned = normalizeHex(value);

  if (!cleaned) {
    return false;
  }

  return /^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length % 2 === 0;
}

function hexToBytes(value) {
  if (!isValidHex(value)) {
    throw new Error(
      "Invalid hex input. Use an even number of hexadecimal characters (0-9, A-F).",
    );
  }

  const cleaned = normalizeHex(value);
  const bytes = new Uint8Array(cleaned.length / 2);

  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substr(i, 2), 16);
  }

  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function isValidUrlEncoding(value) {
  try {
    decodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
}

function urlToBytes(value) {
  if (!isValidUrlEncoding(value)) {
    throw new Error(
      "Invalid URL encoding (incomplete or malformed % sequence).",
    );
  }

  return textToBytes(decodeURIComponent(value));
}

function bytesToUrl(bytes) {
  return encodeURIComponent(bytesToText(bytes));
}

function decodeToBytes(input, format) {
  if (format === "base64") return base64ToBytes(input);
  if (format === "base32") return base32ToBytes(input);
  if (format === "hex") return hexToBytes(input);
  if (format === "url") return urlToBytes(input);
  if (format === "html" || format === "xml")
    return textToBytes(unescapeEntities(input));
  if (format === "jsonEscape") return textToBytes(jsonUnescapeText(input));
  return textToBytes(input);
}

function encodeFromBytes(bytes, format) {
  if (format === "base64") return bytesToBase64(bytes);
  if (format === "base32") return bytesToBase32(bytes);
  if (format === "hex") return bytesToHex(bytes);
  if (format === "url") return bytesToUrl(bytes);
  if (format === "html" || format === "xml")
    return escapeEntities(bytesToText(bytes));
  if (format === "jsonEscape") return jsonEscapeText(bytesToText(bytes));
  return bytesToText(bytes);
}

export function detectFormat(input = "") {
  const trimmed = String(input).trim();

  if (!trimmed) {
    return "text";
  }

  const hexCandidate = trimmed.replace(/[\s:,-]+/g, "");

  if (
    hexCandidate.length >= 8 &&
    /[0-9]/.test(hexCandidate) &&
    isValidHex(hexCandidate)
  ) {
    return "hex";
  }

  const base64Candidate = trimmed.replace(/\s+/g, "");

  if (base64Candidate.length >= 4 && isValidBase64(base64Candidate)) {
    return "base64";
  }

  const base32Candidate = trimmed
    .replace(/\s+/g, "")
    .replace(/=+$/, "")
    .toUpperCase();

  if (base32Candidate.length >= 8 && isValidBase32(base32Candidate)) {
    return "base32";
  }

  if (/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/i.test(trimmed)) {
    return "html";
  }

  if (/%[0-9a-fA-F]{2}/.test(trimmed)) {
    return "url";
  }

  if (/\\[nrt"\\/]|\\u[0-9a-fA-F]{4}/.test(trimmed)) {
    return "jsonEscape";
  }

  return "text";
}

export function convertValue({
  input = "",
  sourceFormat = "text",
  targetFormat = "base64",
} = {}) {
  const base = {
    type: "encodingTool",
    input,
    sourceFormat,
    targetFormat,
    inputLength: input.length,
  };

  if (!input) {
    return {
      ...base,
      output: "",
      byteLength: 0,
      outputLength: 0,
      status: "neutral",
      error: null,
    };
  }

  try {
    const bytes = decodeToBytes(input, sourceFormat);
    const output = encodeFromBytes(bytes, targetFormat);

    return {
      ...base,
      output,
      byteLength: bytes.length,
      outputLength: output.length,
      status: "success",
      error: null,
    };
  } catch (error) {
    return {
      ...base,
      output: "",
      byteLength: 0,
      outputLength: 0,
      status: "error",
      error: error?.message || "Conversion failed.",
    };
  }
}

export async function runEncodingTool(tool, inputValues) {
  return convertValue(inputValues);
}
