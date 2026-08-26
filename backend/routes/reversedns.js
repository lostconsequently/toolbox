const express = require("express");
const net = require("net");

const { isBlockedTarget } = require("../utils/networkSecurity");
const { createResolver } = require("../utils/dnsResolver");
const { asyncHandler } = require("../utils/asyncHandler");
const { createRateLimiter } = require("../utils/rateLimiter");

const router = express.Router();

const DNS_TIMEOUT = 5000;

const reverseDnsLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve({ timeout: true }), timeoutMs);
    }),
  ]);
}

// Forward-resolves a single PTR hostname and reports whether it points back
// at the original IP. Errors are reported distinctly from "resolved but
// didn't match" - a resolver hiccup (timeout/SERVFAIL) shouldn't look the
// same in the UI as a genuinely misconfigured PTR record.
async function checkForwardMatch(hostname, ip, resolver) {
  try {
    let forwardResult = await withTimeout(
      resolver.resolve4(hostname, { ttl: true }),
      DNS_TIMEOUT,
    );

    if (forwardResult?.timeout) {
      forwardResult = null;
    }

    if (!forwardResult || forwardResult.length === 0) {
      const aaaaResult = await withTimeout(
        resolver.resolve6(hostname, { ttl: true }),
        DNS_TIMEOUT,
      );

      if (aaaaResult && !aaaaResult.timeout) {
        forwardResult = aaaaResult;
      }
    }

    if (!forwardResult || forwardResult.length === 0) {
      return { hostname, valid: false, ips: [], ttl: null, error: false };
    }

    const ips = forwardResult.map((r) => r.address);

    const ttlValues = forwardResult
      .map((r) => r.ttl)
      .filter((t) => Number.isFinite(t));

    return {
      hostname,
      valid: ips.includes(ip),
      ips,
      ttl: ttlValues.length ? Math.min(...ttlValues) : null,
      error: false,
    };
  } catch (error) {
    return {
      hostname,
      valid: false,
      ips: [],
      ttl: null,
      error: true,
      errorCode: error.code || "DNS_ERROR",
    };
  }
}

router.get(
  "/:ip",
  reverseDnsLimiter,
  asyncHandler(async (req, res) => {
    const ip = String(req.params.ip || "").trim();

    if (!ip) {
      return res.status(400).json({
        error: "No IP provided",
        code: "ip.noAddress",
      });
    }

    if (!net.isIP(ip)) {
      return res.status(400).json({
        error: "Invalid IP address",
        code: "ip.invalidAddress",
      });
    }

    if (isBlockedTarget(ip)) {
      return res.status(403).json({
        error: "This address is not allowed",
        code: "net.addressNotAllowed",
      });
    }

    const resolver = createResolver();

    let hostnames = [];

    try {
      const reverseResult = await withTimeout(
        resolver.reverse(ip),
        DNS_TIMEOUT,
      );

      if (reverseResult?.timeout) {
        return res.json({
          success: true,
          ip,
          hostnames: [],
          found: false,
          ptrValid: false,
          ttl: null,
          error: "DNS query timeout",
          code: "dns.queryTimeout",
        });
      }

      hostnames = reverseResult;
    } catch (error) {
      if (error.code === "ENOTFOUND" || error.code === "ENODATA") {
        return res.json({
          success: true,
          ip,
          hostnames: [],
          found: false,
          ptrValid: false,
          ttl: null,
        });
      }

      throw error;
    }

    const found = hostnames.length > 0;

    let ptrValid = false;
    let ttl = null;
    let forwardIps = [];
    let forwardError = null;
    let hostnameResults = [];

    if (found) {
      hostnameResults = await Promise.all(
        hostnames.map((hostname) => checkForwardMatch(hostname, ip, resolver)),
      );

      const matchedResult = hostnameResults.find((result) => result.valid);

      if (matchedResult) {
        ptrValid = true;
        forwardIps = matchedResult.ips;
        ttl = matchedResult.ttl;
      } else {
        const firstResolved = hostnameResults.find((result) => !result.error);

        if (firstResolved) {
          forwardIps = firstResolved.ips;
        }

        // Only surface a top-level error when every hostname's forward
        // lookup genuinely failed - if at least one resolved (even without
        // matching), this is a real PTR/forward mismatch, not a lookup
        // failure.
        if (hostnameResults.every((result) => result.error)) {
          forwardError = hostnameResults[0]?.errorCode || "DNS_ERROR";
        }
      }
    }

    res.json({
      success: true,
      ip,
      hostnames,
      found,
      ptrValid,
      ttl,
      forwardIps,
      forwardError,
      hostnameResults,
    });
  }),
);

module.exports = router;
