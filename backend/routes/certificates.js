const express = require("express");
const crypto = require("node:crypto");
const router = express.Router();
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { execFileSync } = require("node:child_process");
const { createRateLimiter } = require("../utils/rateLimiter");
const { logWarning } = require("../services/logService");

const certificatesLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
});

const MAX_CERTIFICATE_INPUT_LENGTH = 500000;

function hasPrivateKey(content = "") {
  return /-----BEGIN .*PRIVATE KEY-----/i.test(content);
}

function wrapBase64Certificate(value = "") {
  const cleaned = String(value).replace(/\s+/g, "").trim();

  if (!cleaned) {
    return "";
  }

  const lines = cleaned.match(/.{1,64}/g) || [];

  return [
    "-----BEGIN CERTIFICATE-----",
    ...lines,
    "-----END CERTIFICATE-----",
  ].join("\n");
}

function extractPemCertificates(content = "") {
  const input = String(content || "").trim();

  if (!input) {
    return [];
  }

  const matches =
    input.match(
      /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,
    ) || [];

  if (matches.length > 0) {
    return matches;
  }

  const looksLikeBase64 =
    /^[A-Za-z0-9+/=\s\r\n]+$/.test(input) &&
    input.replace(/\s+/g, "").length > 200;

  if (looksLikeBase64) {
    return [wrapBase64Certificate(input)];
  }

  return [];
}

function parseSubjectAltNames(subjectAltName = "") {
  if (!subjectAltName) {
    return [];
  }

  return subjectAltName
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) =>
      item
        .replace(/^DNS:/i, "")
        .replace(/^IP Address:/i, "")
        .trim(),
    )
    .filter(Boolean);
}

function getDaysRemaining(validTo) {
  const target = new Date(validTo);
  const now = new Date();

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const diffMs = target.getTime() - now.getTime();

  return Math.ceil(diffMs / 86400000);
}

function getCertificateStatus(daysRemaining) {
  if (daysRemaining === null) {
    return "warning";
  }

  if (daysRemaining < 0) {
    return "error";
  }

  if (daysRemaining <= 30) {
    return "warning";
  }

  return "success";
}

function getPublicKeyInfo(certificate) {
  try {
    const publicKey = certificate.publicKey;
    const details = {};

    if (publicKey.asymmetricKeyDetails) {
      Object.entries(publicKey.asymmetricKeyDetails).forEach(([key, value]) => {
        details[key] = typeof value === "bigint" ? value.toString() : value;
      });
    }

    return {
      type: publicKey.asymmetricKeyType || "Unknown",
      details,
    };
  } catch {
    return {
      type: "Unknown",
      details: {},
    };
  }
}

function getKeySizeWarning(publicKeyType, publicKeyDetails) {
  if (publicKeyType !== "rsa") {
    return null;
  }

  const modulusLength = parseInt(publicKeyDetails.modulusLength, 10);

  if (Number.isNaN(modulusLength)) {
    return null;
  }

  if (modulusLength < 2048) {
    return `RSA ${modulusLength} is shorter than the recommended 2048 bits`;
  }

  return null;
}

function parseKeyUsage(keyUsage) {
  if (!keyUsage || typeof keyUsage !== "string") {
    return [];
  }

  return keyUsage
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const PKCS7_SIGNED_DATA_OID = Buffer.from([
  0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02,
]);

function readAsn1Length(buffer, offset) {
  const firstByte = buffer[offset];

  if (firstByte < 0x80) {
    return { value: firstByte, bytes: 1 };
  }

  const numBytes = firstByte & 0x7f;
  let value = 0;

  for (let i = 0; i < numBytes; i++) {
    value = (value << 8) + buffer[offset + 1 + i];
  }

  return { value, bytes: 1 + numBytes };
}

function extractDerCertificatesFromPkcs7(derBuffer) {
  const certificates = [];
  let pos = 0;

  function advanceTag() {
    if (pos >= derBuffer.length) return -1;

    const tag = derBuffer[pos];

    pos++;
    return tag;
  }

  function advanceLength() {
    const result = readAsn1Length(derBuffer, pos);

    pos += result.bytes;
    return result.value;
  }

  function advancePast(length) {
    pos += length;
  }

  // 1. Outer SEQUENCE (ContentInfo)
  if (advanceTag() !== 0x30) return certificates;

  const outerLen = advanceLength();
  const outerEnd = pos + outerLen;

  // 2. OID (contentType) — must be signedData
  if (advanceTag() !== 0x06) return certificates;

  const oidLen = advanceLength();
  const oidBytes = derBuffer.subarray(pos, pos + oidLen);

  if (!oidBytes.equals(PKCS7_SIGNED_DATA_OID)) return certificates;

  advancePast(oidLen);

  // 3. [0] EXPLICIT (Content: SignedData wrapper)
  if (advanceTag() !== 0xa0) return certificates;

  advancePast(advanceLength());

  // 4. SEQUENCE (SignedData body)
  if (advanceTag() !== 0x30) return certificates;

  advancePast(advanceLength());

  // 5. INTEGER (version)
  if (advanceTag() !== 0x02) return certificates;

  advancePast(advanceLength());

  // 6. SET (digestAlgorithms)
  if (advanceTag() !== 0x31) return certificates;

  advancePast(advanceLength());

  // 7. SEQUENCE (encapContentInfo)
  if (advanceTag() !== 0x30) return certificates;

  advancePast(advanceLength());

  // 8. [0] IMPLICIT (certificates)
  if (pos >= outerEnd) return certificates;

  if (derBuffer[pos] !== 0xa0) return certificates;

  pos++;
  const certSetLen = advanceLength();
  const certSetEnd = pos + certSetLen;

  while (pos < certSetEnd && pos < outerEnd) {
    if (derBuffer[pos] !== 0x30) break;

    const start = pos;

    pos++;
    const certLen = advanceLength();
    const certEnd = pos + certLen;

    certificates.push(derBuffer.subarray(start, certEnd));
    pos = certEnd;
  }

  return certificates;
}

function derToPem(derBuffer) {
  const base64 = derBuffer.toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];

  return [
    "-----BEGIN CERTIFICATE-----",
    ...lines,
    "-----END CERTIFICATE-----",
  ].join("\n");
}

function parsePkcs7Buffer(buffer, text) {
  const pemMatch = text
    ? text.match(/-----BEGIN\s+PKCS7-----([\s\S]*?)-----END\s+PKCS7-----/i)
    : null;

  let derBuffer;

  if (pemMatch) {
    const base64 = pemMatch[1].replace(/\s+/g, "");

    derBuffer = Buffer.from(base64, "base64");
  } else {
    derBuffer = buffer;
  }

  const certDers = extractDerCertificatesFromPkcs7(derBuffer);

  if (certDers.length === 0) {
    throw new Error("No certificates found in the PKCS#7 file.");
  }

  return certDers.map(derToPem);
}

function parseCertificate(pem, index) {
  const certificate = new crypto.X509Certificate(pem);
  const daysRemaining = getDaysRemaining(certificate.validTo);
  const publicKeyInfo = getPublicKeyInfo(certificate);
  const subjectAltNames = parseSubjectAltNames(
    certificate.subjectAltName || "",
  );

  return {
    index,
    subject: certificate.subject,
    issuer: certificate.issuer,
    validFrom: certificate.validFrom,
    validTo: certificate.validTo,
    daysRemaining,
    status: getCertificateStatus(daysRemaining),
    serialNumber: certificate.serialNumber,
    fingerprint: certificate.fingerprint,
    fingerprint256: certificate.fingerprint256,
    fingerprint512: certificate.fingerprint512,
    subjectAltName: certificate.subjectAltName || "",
    subjectAltNames,
    wildcardSANs: subjectAltNames.filter((name) => name.startsWith("*")),
    publicKeyType: publicKeyInfo.type,
    publicKeyDetails: publicKeyInfo.details || {},
    keyUsage: parseKeyUsage(certificate.keyUsage),
    ca: certificate.ca || false,
    selfSigned: certificate.subject === certificate.issuer,
    keySizeWarning: getKeySizeWarning(
      publicKeyInfo.type,
      publicKeyInfo.details,
    ),
    pem,
    derBase64: certificate.raw.toString("base64"),
  };
}

function computeChainInfo(certificates) {
  const bySubject = {};

  certificates.forEach((c) => {
    bySubject[c.subject] = c;
  });

  const levels = {};
  const visiting = new Set();

  function getLevel(c) {
    if (levels[c.index] !== undefined) return levels[c.index];

    // A cycle (e.g. two certs whose subject/issuer mutually reference each
    // other) would otherwise recurse forever; break it by treating the
    // re-entrant certificate as level 0 instead of looping infinitely.
    if (visiting.has(c.index)) {
      return 0;
    }

    visiting.add(c.index);

    let level;

    if (c.selfSigned && c.ca) {
      level = 2;
    } else if (bySubject[c.issuer]) {
      level = Math.max(0, getLevel(bySubject[c.issuer]) - 1);
    } else {
      level = 0;
    }

    visiting.delete(c.index);

    levels[c.index] = level;

    return level;
  }

  certificates.forEach((c) => {
    const level = getLevel(c);

    c.chainLevel = level;

    if (c.selfSigned && c.ca) {
      c.chainLabel = "Root CA";
    } else if (level === 0) {
      c.chainLabel = "Leaf";
    } else {
      c.chainLabel = "Intermediate";
    }
  });
}

function buildPlainText(certificates) {
  const lines = [];

  certificates.forEach((certificate) => {
    lines.push(`Certificate ${certificate.index}`);
    lines.push(`Subject: ${certificate.subject}`);
    lines.push(`Issuer: ${certificate.issuer}`);
    lines.push(`Valid from: ${certificate.validFrom}`);
    lines.push(`Valid to: ${certificate.validTo}`);
    lines.push(`Days remaining: ${certificate.daysRemaining ?? "-"}`);
    lines.push(`Serial: ${certificate.serialNumber}`);
    lines.push(`SHA256 fingerprint: ${certificate.fingerprint256}`);
    lines.push(`Public key: ${certificate.publicKeyType}`);

    if (certificate.keySizeWarning) {
      lines.push(`Key size warning: ${certificate.keySizeWarning}`);
    }

    if (certificate.keyUsage && certificate.keyUsage.length > 0) {
      lines.push(`Key usage: ${certificate.keyUsage.join(", ")}`);
    }

    if (certificate.ca) {
      lines.push("CA: Ja");
    }

    if (certificate.selfSigned) {
      lines.push("Self-signed: Ja");
    }

    if (certificate.chainLabel) {
      lines.push(`Chain role: ${certificate.chainLabel}`);
    }

    if (certificate.wildcardSANs.length > 0) {
      lines.push("Wildcard SANs:");

      certificate.wildcardSANs.forEach((name) => {
        lines.push(`- ${name}`);
      });
    }

    if (certificate.subjectAltNames.length > 0) {
      lines.push("SANs:");

      certificate.subjectAltNames.forEach((name) => {
        lines.push(`- ${name}`);
      });
    }

    lines.push("");
  });

  return lines.join("\n").trim();
}

function bufferToUtf8(buffer) {
  return buffer.toString("utf8");
}

function decodeInput(body = {}) {
  if (body.fileBase64) {
    return {
      buffer: Buffer.from(body.fileBase64, "base64"),
      text: "",
      fileName: body.fileName || "",
      source: "file",
      pfxPassword: body.pfxPassword || "",
    };
  }

  const text = String(body.content || "");

  return {
    buffer: Buffer.from(text, "utf8"),
    text,
    fileName: "",
    source: "text",
    pfxPassword: "",
  };
}

function looksLikeBase64Certificate(content = "") {
  const input = String(content || "").trim();

  return (
    /^[A-Za-z0-9+/=\s\r\n]+$/.test(input) &&
    input.replace(/\s+/g, "").length > 200
  );
}

function parseSingleCertificateFromBuffer(buffer) {
  const certificate = new crypto.X509Certificate(buffer);

  return certificate.toString();
}

function runOpenSslPkcs12(buffer, pfxPassword) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolbox-pfx-"));

  const inputPath = path.join(tempDir, "input.pfx");

  try {
    fs.writeFileSync(inputPath, buffer);

    // Password is piped via stdin (fd 0) rather than "-passin pass:...",
    // which would otherwise put the plaintext PFX password directly into
    // this process's argv - visible to any other local process that can
    // list/inspect running processes for the short lifetime of the call.
    const output = execFileSync(
      "openssl",
      ["pkcs12", "-in", inputPath, "-nokeys", "-passin", "stdin"],
      {
        input: `${pfxPassword}\n`,
        encoding: "utf8",
        windowsHide: true,
        timeout: 15000,
      },
    );

    return output;
  } finally {
    try {
      fs.rmSync(tempDir, {
        recursive: true,
        force: true,
      });
    } catch {
      // cleanup best effort
    }
  }
}

function runOpenSslReq(pem) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toolbox-csr-"));

  const inputPath = path.join(tempDir, "input.csr");

  try {
    fs.writeFileSync(inputPath, pem);

    const output = execFileSync(
      "openssl",
      ["req", "-in", inputPath, "-noout", "-text"],
      {
        encoding: "utf8",
        windowsHide: true,
        timeout: 10000,
      },
    );

    return output;
  } finally {
    try {
      fs.rmSync(tempDir, {
        recursive: true,
        force: true,
      });
    } catch {
      // cleanup best effort
    }
  }
}

function parseOutputToPemCertificates(opensslOutput) {
  const certs = extractPemCertificates(opensslOutput);

  if (certs.length === 0) {
    throw new Error("No certificates found.");
  }

  return certs;
}

function extractCertificatesFromInput({ buffer, text, fileName, pfxPassword }) {
  const utf8Text = text || bufferToUtf8(buffer);
  const lowerFileName = String(fileName || "").toLowerCase();

  const isPfx =
    lowerFileName.endsWith(".pfx") || lowerFileName.endsWith(".p12");

  if (isPfx) {
    try {
      const output = runOpenSslPkcs12(buffer, pfxPassword);
      const certs = parseOutputToPemCertificates(output);

      return {
        format: "PFX / PKCS#12",
        certificates: certs,
      };
    } catch (error) {
      if (
        error.stderr &&
        /mac verify error|wrong password|invalid password/i.test(error.stderr)
      ) {
        throw new Error("The PFX/P12 password is incorrect.");
      }

      if (
        error?.message?.includes("ENOENT") ||
        error?.message?.includes("spawnSync openssl")
      ) {
        throw new Error(
          "PFX/P12 requires OpenSSL. OpenSSL is not available on the backend.",
        );
      }

      // OpenSSL's raw stderr/message can include the temp file path this
      // request's PFX was written to (fs.mkdtempSync above) - log it
      // server-side for debugging, but never forward it to the client.
      logWarning({
        category: "api",
        eventType: "certificates.parse_failed",
        source: "CERTIFICATES",
        message: "PFX/P12 parsing failed",
        details: { detail: String(error?.stderr || error?.message || error) },
      });

      throw new Error("The PFX/P12 file could not be read.");
    }
  }

  const pemCertificates = extractPemCertificates(utf8Text);

  if (pemCertificates.length > 0) {
    return {
      format: "PEM",
      certificates: pemCertificates,
    };
  }

  if (looksLikeBase64Certificate(utf8Text)) {
    return {
      format: "Base64 X.509",
      certificates: [wrapBase64Certificate(utf8Text)],
    };
  }

  try {
    const pem = parseSingleCertificateFromBuffer(buffer);

    return {
      format: "DER X.509",
      certificates: [pem],
    };
  } catch {
    // not a plain DER X.509 certificate
  }

  const isLikelyPkcs7 =
    lowerFileName.endsWith(".p7b") ||
    lowerFileName.endsWith(".p7c") ||
    lowerFileName.endsWith(".spc") ||
    utf8Text.includes("-----BEGIN PKCS7-----") ||
    utf8Text.includes("-----BEGIN CMS-----");

  if (isLikelyPkcs7) {
    try {
      const certs = parsePkcs7Buffer(buffer, utf8Text);

      return {
        format: "PKCS#7 / P7B",
        certificates: certs,
      };
    } catch (error) {
      logWarning({
        category: "api",
        eventType: "certificates.parse_failed",
        source: "CERTIFICATES",
        message: "PKCS#7 / P7B parsing failed",
        error,
      });

      throw new Error("The PKCS#7 / P7B file could not be read.");
    }
  }

  throw new Error(
    "No valid PEM, Base64 X.509, DER X.509, PFX/P12 or PKCS#7 certificate found.",
  );
}

router.post(
  "/inspect",
  certificatesLimiter,
  express.json({ limit: "1mb" }),
  (req, res) => {
    try {
      const decodedInput = decodeInput(req.body);

      if (
        !decodedInput.buffer.length &&
        !String(req.body?.content || "").trim()
      ) {
        return res.status(400).json({
          success: false,
          error: "No certificate content received.",
          code: "certificate.noContent",
        });
      }

      if (decodedInput.buffer.length > MAX_CERTIFICATE_INPUT_LENGTH) {
        return res.status(413).json({
          success: false,
          error: "Certificate content is too large.",
          code: "certificate.contentTooLarge",
        });
      }

      const inputText = decodedInput.text || bufferToUtf8(decodedInput.buffer);

      const detectedPrivateKey = hasPrivateKey(inputText);

      const extracted = extractCertificatesFromInput(decodedInput);

      const pemCertificates = extracted.certificates;

      if (pemCertificates.length === 0) {
        return res.status(400).json({
          success: false,
          error:
            "No valid PEM, CRT, CER, DER, PFX/P12 or P7B certificate found.",
        });
      }

      const certificates = pemCertificates.map((pem, index) =>
        parseCertificate(pem, index + 1),
      );

      computeChainInfo(certificates);

      const earliestExpiry = certificates
        .map((certificate) => certificate.daysRemaining)
        .filter((days) => Number.isFinite(days))
        .sort((a, b) => a - b)[0];

      const overallStatus = certificates.some(
        (certificate) => certificate.status === "error",
      )
        ? "error"
        : certificates.some((certificate) => certificate.status === "warning")
          ? "warning"
          : "success";

      res.json({
        success: true,
        type: "certificateToolkit",
        format: extracted.format,
        certificateCount: certificates.length,
        detectedPrivateKey,
        earliestExpiry: earliestExpiry ?? null,
        status: overallStatus,
        certificates,
        plainText: buildPlainText(certificates),
      });
    } catch (error) {
      // Whatever the underlying cause, never forward the raw error to the
      // client - it can carry OpenSSL stderr or a temp file path from the
      // PFX/PKCS#7 helpers above. Log it server-side for debugging instead.
      logWarning({
        category: "api",
        eventType: "certificates.parse_failed",
        source: "CERTIFICATES",
        message: "Certificate inspection failed",
        details: { detail: String(error?.stderr || error?.message || error) },
        req,
      });

      res.status(400).json({
        success: false,
        error: "The certificate could not be read.",
      });
    }
  },
);

router.post(
  "/inspect-csr",
  certificatesLimiter,
  express.json({ limit: "1mb" }),
  (req, res) => {
    try {
      const content = String(req.body?.content || "").trim();

      if (!content) {
        return res.status(400).json({
          success: false,
          error: "No CSR received.",
          code: "certificate.noCsr",
        });
      }

      if (!content.includes("-----BEGIN CERTIFICATE REQUEST-----")) {
        return res.status(400).json({
          success: false,
          error: "Not a valid CSR (Certificate Signing Request).",
          code: "certificate.invalidCsr",
        });
      }

      const output = runOpenSslReq(content);

      const subjectMatch = output.match(/Subject:\s*(.+)/);
      const subject = subjectMatch ? subjectMatch[1].trim() : "";

      const sanMatch = output.match(
        /X509v3 Subject Alternative Name:\s*\n\s*(.+)/,
      );
      const sanText = sanMatch ? sanMatch[1].trim() : "";
      const subjectAltNames = sanText
        ? sanText
            .split(",")
            .map((s) =>
              s
                .trim()
                .replace(/^DNS:/i, "")
                .replace(/^IP Address:/i, "")
                .trim(),
            )
            .filter(Boolean)
        : [];

      const keyAlgMatch = output.match(/Public Key Algorithm:\s*(.+)/);
      const keyAlgorithm = keyAlgMatch ? keyAlgMatch[1].trim() : "Unknown";

      const sigAlgMatch = output.match(/Signature Algorithm:\s*(.+)/);
      const signatureAlgorithm = sigAlgMatch
        ? sigAlgMatch[1].trim()
        : "Unknown";

      const keySizeMatch = output.match(/RSA Public Key:\s*\((\d+)\s*bit/);
      const keySize = keySizeMatch ? parseInt(keySizeMatch[1], 10) : null;

      res.json({
        success: true,
        type: "csrInspection",
        subject,
        subjectAltNames,
        keyAlgorithm,
        signatureAlgorithm,
        keySize,
      });
    } catch (error) {
      if (
        error?.message?.includes("ENOENT") ||
        error?.message?.includes("spawnSync openssl")
      ) {
        return res.status(503).json({
          success: false,
          error: "OpenSSL is not available on the backend.",
          code: "certificate.opensslUnavailable",
        });
      }

      // Same reasoning as the PFX/P12 path: OpenSSL's raw error can include
      // the temp file path this request's CSR was written to.
      logWarning({
        category: "api",
        eventType: "certificates.parse_failed",
        source: "CERTIFICATES",
        message: "CSR inspection failed",
        details: { detail: String(error?.stderr || error?.message || error) },
        req,
      });

      res.status(400).json({
        success: false,
        error: "The CSR could not be read.",
      });
    }
  },
);

module.exports = router;
