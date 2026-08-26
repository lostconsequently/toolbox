const express = require("express");
const net = require("node:net");

const { isBlockedTarget } = require("../utils/networkSecurity");
const { createResolver } = require("../utils/dnsResolver");
const { createRateLimiter } = require("../utils/rateLimiter");

const router = express.Router();

const DNS_TIMEOUT = 5000;
const MAX_RECURSION = 3;
const MAX_TOTAL_LOOKUPS = 15;
// Upper bound on wall-clock time for the *entire* /flatten request. Without
// this, up to MAX_TOTAL_LOOKUPS sequential DNS operations (5s timeout each)
// could take ~75s for one request if the SPF chain points at a slow/
// unresponsive resolver - this caps it and returns a partial result with a
// warning instead.
const OVERALL_DEADLINE_MS = 18000;

const spfFlattenLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve) =>
      setTimeout(() => resolve({ timeout: true }), timeoutMs),
    ),
  ]);
}

function parseSpfRecord(text) {
  const cleaned = String(text).trim().replace(/^"|"$/g, "");
  const parts = cleaned.split(/\s+/);
  const mechanisms = [];
  let policy = "";

  for (const part of parts) {
    if (part.toLowerCase() === "v=spf1") continue;
    if (
      part === "-all" ||
      part === "~all" ||
      part === "?all" ||
      part === "+all"
    ) {
      policy = part;
      continue;
    }
    mechanisms.push(part);
  }

  return { mechanisms, policy: policy || "~all" };
}

async function resolveTxt(domain) {
  try {
    const resolver = createResolver();

    const result = await withTimeout(resolver.resolveTxt(domain), DNS_TIMEOUT);
    if (result?.timeout) return null;

    for (const records of result) {
      const text = records.join("");
      if (text.toLowerCase().startsWith("v=spf1")) return text;
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveARecords(hostname) {
  try {
    const resolver = createResolver();

    const result = await withTimeout(resolver.resolve4(hostname), DNS_TIMEOUT);
    return result?.timeout ? [] : result || [];
  } catch {
    return [];
  }
}

async function resolveAaaaRecords(hostname) {
  try {
    const resolver = createResolver();

    const result = await withTimeout(resolver.resolve6(hostname), DNS_TIMEOUT);
    return result?.timeout ? [] : result || [];
  } catch {
    return [];
  }
}

async function resolveMxRecords(domain) {
  try {
    const resolver = createResolver();

    const result = await withTimeout(resolver.resolveMx(domain), DNS_TIMEOUT);
    if (result?.timeout) return [];
    return (result || []).map((mx) => mx.exchange);
  } catch {
    return [];
  }
}

function validateIpValue(value, family) {
  // ip4:/ip6: mechanisms may carry a CIDR suffix (e.g. "1.2.3.0/24") - only
  // the address part is validated, not the prefix length.
  const address = String(value).split("/")[0];

  return family === 4 ? net.isIPv4(address) : net.isIPv6(address);
}

async function flattenSpf(
  domain,
  spfText,
  depth = 0,
  visited = [],
  lookupLog = [],
  deadline = Date.now() + OVERALL_DEADLINE_MS,
) {
  if (depth > MAX_RECURSION) {
    return {
      ip4: [],
      ip6: [],
      warnings: ["Maximum recursion depth reached."],
      lookupLog,
    };
  }

  if (Date.now() > deadline) {
    return {
      ip4: [],
      ip6: [],
      warnings: [
        "Time limit for this SPF flatten reached; the result may be incomplete.",
      ],
      lookupLog,
    };
  }

  const { mechanisms, policy } = parseSpfRecord(spfText);
  const ip4 = [];
  const ip6 = [];
  const warnings = [];
  let resolvedPolicy = policy;

  for (const mech of mechanisms) {
    if (Date.now() > deadline) {
      warnings.push(
        "Time limit for this SPF flatten reached; the result may be incomplete.",
      );
      break;
    }

    if (mech.startsWith("ip4:")) {
      const value = mech.slice(4);

      if (validateIpValue(value, 4)) {
        ip4.push(value);
      } else {
        warnings.push(`Ignored invalid ip4 address: ${value}`);
      }
    } else if (mech.startsWith("ip6:")) {
      const value = mech.slice(4);

      if (validateIpValue(value, 6)) {
        ip6.push(value);
      } else {
        warnings.push(`Ignored invalid ip6 address: ${value}`);
      }
    } else if (mech.startsWith("include:")) {
      const includeDomain = mech.slice(8);

      if (visited.includes(includeDomain)) {
        warnings.push(`Recursive include detected: ${includeDomain}`);
        continue;
      }

      if (isBlockedTarget(includeDomain)) {
        warnings.push(
          `Skipped include pointing at a disallowed address: ${includeDomain}`,
        );
        continue;
      }

      if (lookupLog.length >= MAX_TOTAL_LOOKUPS) {
        warnings.push(
          `Maximum number of DNS lookups reached. Include skipped: ${includeDomain}`,
        );
        continue;
      }

      lookupLog.push({ type: "include", target: includeDomain });

      const includeSpf = await resolveTxt(includeDomain);
      if (!includeSpf) {
        warnings.push(`No SPF record found for include: ${includeDomain}`);
        continue;
      }

      const result = await flattenSpf(
        includeDomain,
        includeSpf,
        depth + 1,
        [...visited, includeDomain],
        lookupLog,
        deadline,
      );

      ip4.push(...result.ip4);
      ip6.push(...result.ip6);
      warnings.push(...result.warnings);
    } else if (mech.startsWith("a:") || mech === "a") {
      const target = mech === "a" ? domain : mech.slice(2);

      if (isBlockedTarget(target)) {
        warnings.push(
          `Skipped A mechanism pointing at a disallowed address: ${target}`,
        );
        continue;
      }

      if (lookupLog.length >= MAX_TOTAL_LOOKUPS) break;
      lookupLog.push({ type: "a", target });

      const aRecords = await resolveARecords(target);
      aRecords.forEach((ip) => ip4.push(ip));

      if (lookupLog.length >= MAX_TOTAL_LOOKUPS) break;
      lookupLog.push({ type: "aaaa", target });

      const aaaaRecords = await resolveAaaaRecords(target);
      aaaaRecords.forEach((ip) => ip6.push(ip));
    } else if (mech.startsWith("mx:") || mech === "mx") {
      const target = mech === "mx" ? domain : mech.slice(3);

      if (isBlockedTarget(target)) {
        warnings.push(
          `Skipped MX mechanism pointing at a disallowed address: ${target}`,
        );
        continue;
      }

      if (lookupLog.length >= MAX_TOTAL_LOOKUPS) break;
      lookupLog.push({ type: "mx", target });

      const mxHosts = await resolveMxRecords(target);

      for (const mxHost of mxHosts) {
        if (isBlockedTarget(mxHost)) {
          warnings.push(
            `Skipped MX host pointing at a disallowed address: ${mxHost}`,
          );
          continue;
        }

        if (lookupLog.length >= MAX_TOTAL_LOOKUPS) break;

        lookupLog.push({ type: "a", target: mxHost });
        const aRecords = await resolveARecords(mxHost);
        aRecords.forEach((ip) => ip4.push(ip));
      }
    } else if (mech.startsWith("redirect=")) {
      const redirectTarget = mech.slice(9);

      if (visited.includes(redirectTarget)) {
        warnings.push(`Recursive redirect detected: ${redirectTarget}`);
        continue;
      }

      if (isBlockedTarget(redirectTarget)) {
        warnings.push(
          `Skipped redirect pointing at a disallowed address: ${redirectTarget}`,
        );
        continue;
      }

      lookupLog.push({ type: "redirect", target: redirectTarget });

      const redirectSpf = await resolveTxt(redirectTarget);
      if (!redirectSpf) {
        warnings.push(`No SPF record found for redirect: ${redirectTarget}`);
        continue;
      }

      const result = await flattenSpf(
        redirectTarget,
        redirectSpf,
        depth + 1,
        [...visited, redirectTarget],
        lookupLog,
        deadline,
      );
      ip4.push(...result.ip4);
      ip6.push(...result.ip6);
      warnings.push(...result.warnings);
      resolvedPolicy = result.policy;
    } else if (mech.startsWith("exists:")) {
      warnings.push(`Exists mechanism cannot be flattened: ${mech}`);
    } else if (mech.startsWith("ptr:")) {
      warnings.push(`PTR mechanism is deprecated and was skipped: ${mech}`);
    }
  }

  return { ip4, ip6, policy: resolvedPolicy, warnings, lookupLog };
}

router.post("/flatten", spfFlattenLimiter, async (req, res) => {
  try {
    const { domain = "", spfRecord = "" } = req.body;

    const hasDomain = domain.trim();
    const hasSpfRecord = spfRecord.trim();

    if (!hasDomain && !hasSpfRecord) {
      return res.status(400).json({
        error: "Provide a domain name or an SPF record.",
        code: "spf.noInput",
      });
    }

    let activeDomain = hasDomain;
    let rawSpf = "";

    if (hasSpfRecord) {
      rawSpf = spfRecord;
    } else {
      if (isBlockedTarget(activeDomain)) {
        return res.status(403).json({
          error: "This domain is not allowed.",
          code: "net.domainNotAllowed",
        });
      }

      const txtRecord = await resolveTxt(activeDomain);
      if (!txtRecord) {
        return res.status(404).json({
          error: "No SPF record found.",
          code: "spf.notFound",
          success: false,
          domain: activeDomain,
        });
      }
      rawSpf = txtRecord;
    }

    const lookupLog = [];
    const { ip4, ip6, policy, warnings } = await flattenSpf(
      activeDomain,
      rawSpf,
      0,
      [],
      lookupLog,
    );

    const uniqueIp4 = [...new Set(ip4)];
    const uniqueIp6 = [...new Set(ip6)];

    const flattenedParts = ["v=spf1"];
    uniqueIp4.forEach((ip) => flattenedParts.push(`ip4:${ip}`));
    uniqueIp6.forEach((ip) => flattenedParts.push(`ip6:${ip}`));
    flattenedParts.push(policy);

    const flattenedRecord = flattenedParts.join(" ");

    const dnsLength = flattenedRecord.length;
    const lengthStatus =
      dnsLength > 510 ? "error" : dnsLength > 255 ? "warning" : "success";

    const hasWarnings =
      warnings.length > 0 || lookupLog.length > 10 || dnsLength > 255;

    const dnsLookupCount = lookupLog.length;

    res.json({
      success: true,
      domain: activeDomain,
      originalRecord: rawSpf,
      flattenedRecord,
      policy,
      dnsLookupCount,
      dnsLength,
      lengthStatus,
      ip4Count: uniqueIp4.length,
      ip6Count: uniqueIp6.length,
      ip4Addresses: uniqueIp4,
      ip6Addresses: uniqueIp6,
      warnings: [...new Set(warnings)],
      hasWarnings,
      lookupLog,
    });
  } catch (error) {
    res.status(500).json({
      error: `SPF flatten error: ${error.message}`,
      code: "spf.flattenFailed",
      success: false,
    });
  }
});

module.exports = router;
