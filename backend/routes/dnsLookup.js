const express = require("express");
const { domainToASCII, domainToUnicode } = require("node:url");

const { isBlockedTarget } = require("../utils/networkSecurity");
const { asyncHandler } = require("../utils/asyncHandler");
const { createRateLimiter } = require("../utils/rateLimiter");
const {
  translateDnsError,
  formatAnswer,
  resolveRecords,
  createResolver,
  publicResolvers,
} = require("../utils/dnsRecords");

const router = express.Router();

const dnsLookupLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
});

const DNS_TIMEOUT = 5000;

const CUSTOM_TYPE_PATTERN = /^[A-Z]{1,10}$/;
// Bounds the number of parallel DNS queries a single request can trigger -
// without this, a client requesting a huge `types` list could fan out an
// unbounded number of concurrent resolver queries per request.
const MAX_RECORD_TYPES = 15;

/**
 * Races `promise` against a timeout. Unlike a bare Promise.race, this takes
 * an `onTimeout` callback that fires exactly once when the timeout wins, so
 * callers can cancel the underlying operation (e.g. a DNS resolver query).
 * If `promise` still rejects after losing the race, that rejection is
 * swallowed here (via the `settled` guard) instead of becoming an unhandled
 * rejection, since by then nothing is awaiting it and the timeout result
 * has already been returned to the caller.
 */
function withTimeout(promise, timeoutMs, onTimeout) {
  let settled = false;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      onTimeout?.();
      resolve({ timeout: true });
    }, timeoutMs);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function normalizeDnsName(value = "") {
  const cleaned = String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");

  // Converts any Unicode/IDN input (e.g. "münchen.de") to its ASCII
  // Punycode form ("xn--mnchen-3ya.de") so DNS queries always operate on
  // the form resolvers actually expect; domainToASCII returns "" for
  // invalid input, in which case we fall back to the cleaned raw value so
  // existing validation/error handling further down still applies.
  const ascii = domainToASCII(cleaned);

  return ascii || cleaned;
}

function normalizeCompareValue(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^"|"$/g, "")
    .replace(/\.$/, "")
    .replace(/\s+/g, " ");
}

function getLowestTtl(values) {
  const ttls = values.map((v) => v.ttl).filter((ttl) => Number.isFinite(ttl));

  if (!ttls.length) {
    return null;
  }

  return Math.min(...ttls);
}

// Types whose answer data is itself a hostname worth showing in readable
// Unicode form (e.g. a CNAME target that's an IDN) rather than raw Punycode.
const HOSTNAME_VALUE_TYPES = new Set(["CNAME", "NS", "PTR"]);

function toDisplayValue(recordType, data) {
  if (!HOSTNAME_VALUE_TYPES.has(recordType)) {
    return data;
  }

  try {
    return domainToUnicode(data) || data;
  } catch {
    return data;
  }
}

async function checkRecordType(resolverId, name, recordType, expectedValue) {
  // A fresh resolver per record type (cheap - just `new dns.Resolver()`)
  // instead of one resolver shared across every type in the request, so
  // cancelling a timed-out query below can't collaterally abort sibling
  // queries that are still in flight on a shared resolver instance.
  const resolver = createResolver(resolverId);

  try {
    const records = await withTimeout(
      resolveRecords(resolver, name, recordType),
      DNS_TIMEOUT,
      () => resolver.cancel(),
    );

    if (records?.timeout) {
      return {
        type: recordType,
        status: "timeout",
        count: 0,
        ttl: null,
        values: [],
        matchesExpected: null,
        error: "DNS query timeout (TIMEOUT)",
      };
    }

    const values = records.map((record) => formatAnswer(recordType, record));

    const normalizedExpected = normalizeCompareValue(expectedValue || "");

    const matchesExpected = normalizedExpected
      ? values.some((v) =>
          normalizeCompareValue(v.data).includes(normalizedExpected),
        )
      : null;

    return {
      type: recordType,
      status: values.length ? "found" : "not_found",
      count: values.length,
      ttl: getLowestTtl(values),
      values: values.map((v) => toDisplayValue(recordType, v.data)),
      matchesExpected,
    };
  } catch (error) {
    const code = error?.code || "DNS_ERROR";

    return {
      type: recordType,
      status: "not_found",
      count: 0,
      ttl: null,
      values: [],
      matchesExpected: null,
      error: translateDnsError(code),
    };
  }
}

function parseExpectedParam(value = "") {
  const expected = {};

  String(value)
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const separatorIndex = entry.indexOf(":");

      if (separatorIndex === -1) {
        return;
      }

      const type = entry.slice(0, separatorIndex).trim().toUpperCase();
      const value = entry.slice(separatorIndex + 1).trim();

      if (type && value) {
        expected[type] = value;
      }
    });

  return expected;
}

router.get(
  "/",
  dnsLookupLimiter,
  asyncHandler(async (req, res) => {
    const name = normalizeDnsName(req.query.name);

    const types = [
      ...new Set(
        String(req.query.types || "")
          .split(",")
          .map((type) => type.trim().toUpperCase())
          .filter((type) => CUSTOM_TYPE_PATTERN.test(type)),
      ),
    ].slice(0, MAX_RECORD_TYPES);

    if (!name) {
      return res.status(400).json({
        error: "No domain or hostname provided",
        code: "dns.noName",
      });
    }

    if (!types.length) {
      return res.status(400).json({
        error: "No record types selected",
        code: "dns.noRecordTypes",
      });
    }

    if (isBlockedTarget(name)) {
      return res.status(403).json({
        error: "This address is not allowed",
        code: "net.addressNotAllowed",
      });
    }

    const resolverId = String(req.query.resolver || "backend").trim();

    if (
      resolverId !== "backend" &&
      !publicResolvers.some((entry) => entry.id === resolverId)
    ) {
      return res.status(400).json({
        error: "Unknown resolver",
        code: "dns.unknownResolver",
      });
    }

    const expected = parseExpectedParam(req.query.expected);

    const results = await Promise.all(
      types.map((type) =>
        checkRecordType(resolverId, name, type, expected[type]),
      ),
    );

    const foundCount = results.filter((r) => r.status === "found").length;
    const missingCount = results.length - foundCount;

    const status =
      foundCount === results.length
        ? "success"
        : foundCount === 0
          ? "error"
          : "warning";

    res.json({
      success: true,
      name,
      resolverId,
      checkedCount: results.length,
      foundCount,
      missingCount,
      status,
      results,
    });
  }),
);

module.exports = router;
