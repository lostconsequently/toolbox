const express = require("express");
const tls = require("tls");

const router = express.Router();

const { resolveAndValidateTarget } = require("../utils/networkSecurity");
const { asyncHandler } = require("../utils/asyncHandler");
const { createRateLimiter } = require("../utils/rateLimiter");

const sslcheckLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
});

function getCertificate(address, servername, port) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: address,
        port,
        servername,
        rejectUnauthorized: false,
        minVersion: "TLSv1",
        ciphers: "DEFAULT@SECLEVEL=0",
      },
      () => {
        try {
          const certificate = socket.getPeerCertificate(true);
          const protocol = socket.getProtocol();
          const cipher = socket.getCipher();

          socket.end();

          resolve({ certificate, protocol, cipher });
        } catch (error) {
          reject(error);
        }
      },
    );

    socket.setTimeout(5000);

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Timeout during SSL check"));
    });

    socket.on("error", (error) => {
      reject(error);
    });
  });
}

function buildChain(cert) {
  const chain = [];
  const seen = new Set();
  let current = cert;

  // fingerprint256 (SHA-256) is used for dedup/self-signed comparisons
  // instead of the legacy SHA-1 `fingerprint` - SHA-1 collisions are
  // computationally feasible, which would make chain-walking or
  // self-signed detection theoretically spoofable.
  while (current && !seen.has(current.fingerprint256)) {
    seen.add(current.fingerprint256);
    chain.push(current);

    if (
      !current.issuerCertificate ||
      current.issuerCertificate.fingerprint256 === current.fingerprint256
    ) {
      break;
    }

    current = current.issuerCertificate;
  }

  return chain;
}

function translateSslError(error) {
  if (error?.message === "Timeout during SSL check") {
    return { status: 504, message: error.message };
  }

  const code = error?.code;

  if (code === "ECONNREFUSED") {
    return { status: 502, message: "Connection refused on this port" };
  }

  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return { status: 502, message: "Host could not be resolved" };
  }

  if (code === "ECONNRESET") {
    return {
      status: 502,
      message: "The connection was aborted during the TLS handshake",
    };
  }

  if (
    typeof error?.message === "string" &&
    /ssl|tls|handshake/i.test(error.message)
  ) {
    return { status: 502, message: "TLS handshake failed: " + error.message };
  }

  return { status: 502, message: "SSL check failed" };
}

function isValidPort(value) {
  return Number.isInteger(value) && value >= 1 && value <= 65535;
}

router.get(
  "/:host",
  sslcheckLimiter,
  asyncHandler(async (req, res) => {
    const host = String(req.params.host || "").trim();

    if (!host) {
      return res.status(400).json({
        error: "No host provided",
        code: "ssl.noHost",
      });
    }

    const port = req.query.port ? Number(req.query.port) : 443;

    if (!isValidPort(port)) {
      return res.status(400).json({
        error: "Invalid port",
        code: "ssl.invalidPort",
      });
    }

    let target;

    try {
      target = await resolveAndValidateTarget(host);
    } catch {
      return res.status(403).json({
        error: "This address is not allowed",
        code: "net.addressNotAllowed",
      });
    }

    let cert;
    let protocol;
    let cipher;

    try {
      ({
        certificate: cert,
        protocol,
        cipher,
      } = await getCertificate(target.address, host, port));
    } catch (error) {
      const { status, message } = translateSslError(error);

      return res.status(status).json({ error: message });
    }

    const issuer = cert.issuer?.O || cert.issuer?.CN || "Unknown";

    const commonName = cert.subject?.CN || "Unknown";

    const san = cert.subjectaltname
      ? cert.subjectaltname.split(", ").map((entry) => entry.trim())
      : [];

    // A cert can be a wildcard via the SAN list without the legacy CN
    // field itself starting with "*." (many modern CAs no longer set CN
    // at all) - checking only commonName missed those.
    const wildcard =
      commonName.includes("*.") ||
      san.some((entry) => entry.replace(/^dns:/i, "").trim().startsWith("*."));

    const selfSigned = Boolean(
      cert.issuerCertificate &&
      cert.fingerprint256 === cert.issuerCertificate.fingerprint256,
    );

    const chain = buildChain(cert);

    const chainComplete =
      chain.length > 1 ||
      chain[0]?.fingerprint256 === chain[0]?.issuerCertificate?.fingerprint256;

    res.json({
      success: true,
      host,
      port,
      issuer,
      commonName,
      validFrom: cert.valid_from || null,
      validTo: cert.valid_to || null,
      wildcard,
      selfSigned,
      san,
      protocol: protocol || null,
      cipher: cipher?.standardName || cipher?.name || null,
      chainLength: chain.length,
      chainComplete,
    });
  }),
);

module.exports = router;
