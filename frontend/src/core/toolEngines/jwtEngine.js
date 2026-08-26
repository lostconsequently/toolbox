function base64UrlDecodeToText(segment) {
  let normalized = String(segment).replace(/-/g, "+").replace(/_/g, "/");

  while (normalized.length % 4 !== 0) {
    normalized += "=";
  }

  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export function formatEpoch(seconds) {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) {
    return "Not present";
  }

  return new Date(seconds * 1000).toLocaleString();
}

export function decodeJwt(token = "") {
  const trimmed = String(token).trim();

  if (!trimmed) {
    return {
      type: "jwtDecode",
      status: "neutral",
      error: null,
      header: null,
      payload: null,
    };
  }

  const parts = trimmed.split(".");

  if (parts.length !== 3) {
    return {
      type: "jwtDecode",
      status: "error",
      error:
        "A JWT consists of 3 parts separated by dots (header.payload.signature).",
      header: null,
      payload: null,
    };
  }

  const [headerPart, payloadPart, signaturePart] = parts;

  let header;
  let payload;

  try {
    header = JSON.parse(base64UrlDecodeToText(headerPart));
  } catch {
    return {
      type: "jwtDecode",
      status: "error",
      error: "The header could not be decoded (invalid Base64url or JSON).",
      header: null,
      payload: null,
    };
  }

  try {
    payload = JSON.parse(base64UrlDecodeToText(payloadPart));
  } catch {
    return {
      type: "jwtDecode",
      status: "error",
      error: "The payload could not be decoded (invalid Base64url or JSON).",
      header: null,
      payload: null,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === "number" ? payload.exp : null;
  const iat = typeof payload.iat === "number" ? payload.iat : null;
  const nbf = typeof payload.nbf === "number" ? payload.nbf : null;
  const expired = exp !== null ? now > exp : null;

  return {
    type: "jwtDecode",
    status: "success",
    error: null,
    header,
    headerRaw: JSON.stringify(header, null, 2),
    payload,
    payloadRaw: JSON.stringify(payload, null, 2),
    signature: signaturePart,
    algorithm: header.alg || "Unknown",
    tokenType: header.typ || "Unknown",
    issuedAt: iat,
    notBefore: nbf,
    expiresAt: exp,
    expired,
  };
}
