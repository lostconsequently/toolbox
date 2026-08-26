const express = require("express");
const dns = require("dns").promises;
const tls = require("tls");

const router = express.Router();

const { asyncHandler } = require("../utils/asyncHandler");
const { fetchApiJson } = require("../utils/externalApi");
const { createRateLimiter } = require("../utils/rateLimiter");
const { isPrivateIp } = require("../utils/networkSecurity");

const reputationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

// UCEProtect Level 1 is known for a high false-positive rate (it lists
// entire dynamic/CGNAT ranges, not just confirmed abusers), so it counts
// for half a "listing" toward the weighted score instead of the same
// weight as the more conservative, manually-curated lists.
const blacklistZones = [
  {
    name: "Spamcop",
    zone: "bl.spamcop.net",
    weight: 1,
  },
  {
    name: "Barracuda",
    zone: "b.barracudacentral.org",
    weight: 1,
  },
  {
    name: "SpamRATS",
    zone: "all.spamrats.com",
    weight: 1,
  },
  {
    name: "PSBL",
    zone: "psbl.surriel.com",
    weight: 1,
  },
  {
    name: "UCEProtect Level 1",
    zone: "dnsbl-1.uceprotect.net",
    weight: 0.5,
  },
  {
    name: "DroneBL",
    zone: "dnsbl.dronebl.org",
    weight: 1,
  },
];

function normalizeInput(value) {
  let input = String(value || "")
    .trim()
    .toLowerCase();

  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      input = new URL(input).hostname;
    } catch {
      return input;
    }
  }

  input = input.split("/")[0];

  return input;
}

function isIpv4(value) {
  const parts = String(value || "").split(".");

  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (part === "") {
      return false;
    }

    const number = Number(part);

    return Number.isInteger(number) && number >= 0 && number <= 255;
  });
}

function reverseIpv4(value) {
  return String(value || "")
    .split(".")
    .reverse()
    .join(".");
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          timeout: true,
        });
      }, timeoutMs);
    }),
  ]);
}

async function checkBlacklist(ip, blacklist) {
  const query = `${reverseIpv4(ip)}.${blacklist.zone}`;

  try {
    const result = await withTimeout(dns.resolve4(query), 2500);

    if (result?.timeout) {
      return {
        name: blacklist.name,
        zone: blacklist.zone,
        weight: blacklist.weight,
        listed: false,
        status: "timeout",
        response: [],
      };
    }

    return {
      name: blacklist.name,
      zone: blacklist.zone,
      weight: blacklist.weight,
      listed: true,
      status: "listed",
      response: result,
    };
  } catch {
    return {
      name: blacklist.name,
      zone: blacklist.zone,
      weight: blacklist.weight,
      listed: false,
      status: "not_listed",
      response: [],
    };
  }
}

async function getIpInfo(ip) {
  try {
    const data = await fetchApiJson(
      `https://ipwho.is/${encodeURIComponent(ip)}`,
    );

    if (data.success === false) {
      return null;
    }

    return {
      ip: data.ip || ip,
      type: data.type || "Unknown",
      country: data.country || "Unknown",
      region: data.region || "Unknown",
      city: data.city || "Unknown",
      isp: data.connection?.isp || "Unknown",
      organization: data.connection?.org || "Unknown",
      asn: data.connection?.asn || "Unknown",
      domain: data.connection?.domain || "Unknown",
      timezone: data.timezone?.id || "Unknown",
    };
  } catch {
    return null;
  }
}

async function resolveDomainToIpv4All(domain) {
  try {
    const addresses = await dns.lookup(domain, {
      all: true,
      family: 4,
    });

    return addresses?.map((address) => address.address) || [];
  } catch {
    return [];
  }
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const reputationCache = new Map();

function getCachedResult(key) {
  const entry = reputationCache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expires) {
    reputationCache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedResult(key, data) {
  reputationCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

setInterval(() => {
  const now = Date.now();

  for (const [key, entry] of reputationCache) {
    if (now > entry.expires) {
      reputationCache.delete(key);
    }
  }
}, CACHE_TTL_MS).unref();

function getEventDate(events, action) {
  const event = events?.find((item) => item.eventAction === action);

  return event?.eventDate || null;
}

function getRegistrarName(entities = []) {
  const registrarEntity = entities.find((entity) =>
    entity.roles?.includes("registrar"),
  );

  const vcard = registrarEntity?.vcardArray?.[1];

  if (!Array.isArray(vcard)) {
    return "Not found";
  }

  const nameEntry = vcard.find((entry) => entry?.[0] === "fn");

  return nameEntry?.[3] || "Not found";
}

async function getWhoisInfo(domain) {
  try {
    const data = await fetchApiJson(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
    );

    return {
      domain: data.ldhName || domain,
      registrar: getRegistrarName(data.entities),
      registered: getEventDate(data.events, "registration"),
      updated: getEventDate(data.events, "last changed"),
      expires: getEventDate(data.events, "expiration"),
      status: data.status || [],
      nameservers:
        data.nameservers?.map((nameserver) => nameserver.ldhName) || [],
    };
  } catch {
    return null;
  }
}

function getCertificate(address, servername) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: address,
        port: 443,
        servername,
        rejectUnauthorized: false,
      },
      () => {
        try {
          const certificate = socket.getPeerCertificate(true);

          socket.end();

          resolve(certificate);
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

async function getSpfInfo(domain) {
  try {
    const records = await withTimeout(dns.resolveTxt(domain), 3000);

    if (records?.timeout) {
      return { present: false, record: null };
    }

    const record = records
      .map((parts) => parts.join(""))
      .find((entry) => entry.toLowerCase().startsWith("v=spf1"));

    return {
      present: Boolean(record),
      record: record || null,
    };
  } catch {
    return { present: false, record: null };
  }
}

async function getDmarcInfo(domain) {
  try {
    const records = await withTimeout(dns.resolveTxt(`_dmarc.${domain}`), 3000);

    if (records?.timeout) {
      return { present: false, record: null };
    }

    const record = records
      .map((parts) => parts.join(""))
      .find((entry) => entry.toLowerCase().startsWith("v=dmarc1"));

    return {
      present: Boolean(record),
      record: record || null,
    };
  } catch {
    return { present: false, record: null };
  }
}

function daysUntil(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

async function getSslInfo(address, hostname) {
  try {
    const certificate = await getCertificate(address, hostname);

    const issuer = certificate.issuer?.O || certificate.issuer?.CN || "Unknown";

    const commonName = certificate.subject?.CN || "Unknown";

    const sanEntries = certificate.subjectaltname
      ? certificate.subjectaltname.split(", ").map((entry) => entry.trim())
      : [];

    const wildcard =
      commonName.includes("*.") ||
      sanEntries.some((entry) =>
        entry.replace(/^dns:/i, "").trim().startsWith("*."),
      );

    // fingerprint256 comparison (SHA-256) instead of comparing the
    // human-readable issuer/CN strings, which can coincidentally match
    // for a properly chained cert and would misreport it as self-signed.
    const selfSigned = Boolean(
      certificate.issuerCertificate &&
      certificate.fingerprint256 ===
        certificate.issuerCertificate.fingerprint256,
    );

    return {
      host: hostname,
      issuer,
      commonName,
      validFrom: certificate.valid_from || null,
      validTo: certificate.valid_to || null,
      daysRemaining: daysUntil(certificate.valid_to),
      wildcard,
      selfSigned,
      san: certificate.subjectaltname || "",
    };
  } catch {
    return null;
  }
}

function getReputationLabel(weightedScore) {
  if (weightedScore >= 2) {
    return "Poor";
  }

  if (weightedScore >= 1) {
    return "Suspicious";
  }

  return "Good";
}

function getReputationStatus(weightedScore) {
  if (weightedScore >= 2) {
    return "error";
  }

  if (weightedScore >= 1) {
    return "warning";
  }

  return "success";
}

router.get(
  "/:query",
  reputationLimiter,
  asyncHandler(async (req, res) => {
    const input = normalizeInput(req.params.query);

    if (!input) {
      return res.status(400).json({
        error: "No IP, domain or host provided",
        code: "reputation.noQuery",
      });
    }

    const cached = getCachedResult(input);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const inputType = isIpv4(input) ? "ip" : "domain";

    let resolvedIp = isIpv4(input) ? input : null;
    let resolvedIps = isIpv4(input) ? [input] : [];

    if (inputType === "domain") {
      resolvedIps = await resolveDomainToIpv4All(input);
      resolvedIp = resolvedIps[0] || null;
    }

    const privateAddress = resolvedIp ? isPrivateIp(resolvedIp) : false;

    let ipInfo = null;
    let blacklistChecks = [];
    let listedCount = 0;
    let weightedScore = 0;

    if (resolvedIp && !privateAddress) {
      ipInfo = await getIpInfo(resolvedIp);

      blacklistChecks = await Promise.all(
        blacklistZones.map((blacklist) =>
          checkBlacklist(resolvedIp, blacklist),
        ),
      );

      listedCount = blacklistChecks.filter((check) => check.listed).length;
      weightedScore = blacklistChecks
        .filter((check) => check.listed)
        .reduce((total, check) => total + (check.weight ?? 1), 0);
    }

    const whois = inputType === "domain" ? await getWhoisInfo(input) : null;

    const ssl =
      inputType === "domain" && resolvedIp && !privateAddress
        ? await getSslInfo(resolvedIp, input)
        : null;

    const spf = inputType === "domain" ? await getSpfInfo(input) : null;

    const dmarc = inputType === "domain" ? await getDmarcInfo(input) : null;

    const result = {
      success: true,
      input,
      inputType,
      resolvedIp,
      resolvedIps,
      privateAddress,
      reputation: {
        label: privateAddress
          ? "Private address"
          : getReputationLabel(weightedScore),
        status: privateAddress ? "neutral" : getReputationStatus(weightedScore),
        listed: listedCount > 0,
        listedCount,
        weightedScore,
        checkedCount: blacklistChecks.length,
        checks: blacklistChecks,
      },
      ipInfo,
      whois,
      ssl,
      spf,
      dmarc,
    };

    setCachedResult(input, result);

    res.json({ ...result, cached: false });
  }),
);

module.exports = router;
