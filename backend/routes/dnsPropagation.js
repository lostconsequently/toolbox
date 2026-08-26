const express = require("express");
const dns = require("node:dns").promises;
const net = require("node:net");

const { isBlockedTarget } = require("../utils/networkSecurity");
const { asyncHandler } = require("../utils/asyncHandler");
const { createRateLimiter } = require("../utils/rateLimiter");
const {
  translateDnsError,
  formatAnswer: baseFormatAnswer,
  resolveRecords,
  supportedRecordTypes,
  publicResolvers,
} = require("../utils/dnsRecords");

const router = express.Router();

const dnsPropagationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

const DNS_TIMEOUT = 5000;

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve({ timeout: true }), timeoutMs);
    }),
  ]);
}

function parseSpfSegments(value) {
  const parts = value.split(/\s+/);
  return parts.map((part) => {
    if (part.startsWith("include:"))
      return { type: "include", value: part.slice(8) };
    if (part.startsWith("ip4:")) return { type: "ip4", value: part.slice(4) };
    if (part.startsWith("ip6:")) return { type: "ip6", value: part.slice(4) };
    if (part.startsWith("a:")) return { type: "a", value: part.slice(2) };
    if (part.startsWith("mx:")) return { type: "mx", value: part.slice(3) };
    if (part.startsWith("ptr:")) return { type: "ptr", value: part.slice(4) };
    if (part.startsWith("exists:"))
      return { type: "exists", value: part.slice(7) };
    if (part.startsWith("redirect="))
      return { type: "redirect", value: part.slice(9) };
    if (part === "a") return { type: "a", value: "a" };
    if (part === "mx") return { type: "mx", value: "mx" };
    if (part === "ptr") return { type: "ptr", value: "ptr" };
    if (
      part === "all" ||
      part === "+all" ||
      part === "-all" ||
      part === "~all" ||
      part === "?all"
    )
      return { type: "policy", value: part };
    if (part.startsWith("v=spf1")) return { type: "version", value: part };
    return { type: "unknown", value: part };
  });
}

function parseKeyValueSegments(value) {
  const parts = value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map((part) => {
    const eqIndex = part.indexOf("=");
    if (eqIndex === -1) return { type: "unknown", value: part };
    const key = part.slice(0, eqIndex).trim();
    const val = part.slice(eqIndex + 1).trim();
    return { type: key, value: `${key}=${val}` };
  });
}

function parseTxtSegments(data) {
  const trimmed = data.trim();
  if (trimmed.startsWith("v=spf1"))
    return { recordType: "spf", segments: parseSpfSegments(trimmed) };
  if (trimmed.startsWith("v=DMARC1"))
    return { recordType: "dmarc", segments: parseKeyValueSegments(trimmed) };
  if (trimmed.startsWith("v=DKIM1"))
    return { recordType: "dkim", segments: parseKeyValueSegments(trimmed) };
  return null;
}

function countSpfIncludes(answers) {
  let total = 0;
  for (const answer of answers) {
    if (answer.segments?.recordType === "spf") {
      total += answer.segments.segments.filter(
        (s) => s.type === "include",
      ).length;
    }
  }
  return total;
}

function getSpfStatus(includeCount) {
  if (includeCount >= 10) return "error";
  if (includeCount >= 8) return "warning";
  return "success";
}

const resolvers = publicResolvers;

function normalizeDnsName(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function normalizeExpectedValue(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^"|"$/g, "")
    .replace(/\.$/, "")
    .replace(/\s+/g, " ");
}

function normalizeAnswerValue(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^"|"$/g, "")
    .replace(/\.$/, "")
    .replace(/\s+/g, " ");
}

// Structured record types have one unambiguous correct value, so a
// substring match would let a wrong-but-overlapping value (e.g. an MX with
// the right hostname but the wrong priority, "20 mail.x.com" vs "10
// mail.x.com") get reported as a match. Free-text types (TXT and friends -
// SPF/DMARC/DKIM) genuinely benefit from substring matching, since a
// technician often only wants to confirm a fragment (e.g. "include:...")
// is present somewhere in a longer record.
const EXACT_MATCH_RECORD_TYPES = new Set([
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "NS",
  "PTR",
]);

function getMatchStatus(answers, expectedValue = "", recordType = "") {
  const normalizedExpected = normalizeExpectedValue(expectedValue);

  if (!normalizedExpected) {
    return "notChecked";
  }

  if (!answers.length) {
    return "noMatch";
  }

  const useExactMatch = EXACT_MATCH_RECORD_TYPES.has(
    String(recordType).toUpperCase(),
  );

  const matched = answers.some((answer) => {
    const normalizedAnswer = normalizeAnswerValue(answer.data);

    if (useExactMatch) {
      return normalizedAnswer === normalizedExpected;
    }

    return (
      normalizedAnswer === normalizedExpected ||
      normalizedAnswer.includes(normalizedExpected) ||
      normalizedExpected.includes(normalizedAnswer)
    );
  });

  return matched ? "match" : "noMatch";
}

function getResolverStatus({ answers, matchStatus, error }) {
  if (error) {
    return "error";
  }

  if (!answers.length) {
    return "warning";
  }

  if (matchStatus === "noMatch") {
    return "warning";
  }

  return "success";
}

function getLowestTtl(answers) {
  const ttlValues = answers
    .map((answer) => answer.ttl)
    .filter((ttl) => Number.isFinite(ttl));

  if (!ttlValues.length) {
    return null;
  }

  return Math.min(...ttlValues);
}

function formatTxtRecord(record) {
  if (Array.isArray(record)) {
    return record.join("");
  }

  return String(record);
}

function formatAnswer(recordType, record) {
  const base = baseFormatAnswer(recordType, record);

  if (recordType === "TXT") {
    const segments = parseTxtSegments(base.data);

    return { ...base, segments: segments || undefined };
  }

  return base;
}

async function queryResolver({
  resolverConfig,
  name,
  recordType,
  expectedValue,
}) {
  const resolver = new dns.Resolver();

  resolver.setServers(resolverConfig.servers);

  try {
    const result = await withTimeout(
      resolveRecords(resolver, name, recordType),
      DNS_TIMEOUT,
    );

    if (result?.timeout) {
      return {
        resolver: resolverConfig.name,
        resolverId: resolverConfig.id,
        dnsStatusLabel: "TIMEOUT",
        status: "error",
        found: false,
        answerCount: 0,
        ttl: null,
        answers: [],
        matchStatus: expectedValue ? "noMatch" : "notChecked",
        error: "Resolver is not responding (TIMEOUT)",
        code: "dns.resolverTimeout",
      };
    }

    const records = result;

    const answers = records.map((record) => formatAnswer(recordType, record));

    const matchStatus = getMatchStatus(answers, expectedValue, recordType);

    return {
      resolver: resolverConfig.name,
      resolverId: resolverConfig.id,
      dnsStatusLabel: "NOERROR",
      status: getResolverStatus({
        answers,
        matchStatus,
        error: null,
      }),
      found: answers.length > 0,
      answerCount: answers.length,
      ttl: getLowestTtl(answers),
      answers,
      matchStatus,
    };
  } catch (error) {
    const code = error?.code || "DNS_ERROR";

    return {
      resolver: resolverConfig.name,
      resolverId: resolverConfig.id,
      dnsStatusLabel: code,
      status: "error",
      found: false,
      answerCount: 0,
      ttl: null,
      answers: [],
      matchStatus: expectedValue ? "noMatch" : "notChecked",
      error: translateDnsError(code),
    };
  }
}

function buildPlainText({ name, recordType, expectedValue, resolverResults }) {
  const lines = [`Domain: ${name}`, `Record type: ${recordType}`];

  if (expectedValue) {
    lines.push(`Expected value: ${expectedValue}`);
  }

  lines.push("");

  resolverResults.forEach((result) => {
    lines.push(result.resolver);
    lines.push(`Status: ${result.dnsStatusLabel}`);
    lines.push(`Found: ${result.found ? "Yes" : "No"}`);
    lines.push(`TTL: ${result.ttl ?? "-"}`);

    if (result.matchStatus === "match") {
      lines.push("Match: Ja");
    }

    if (result.matchStatus === "noMatch") {
      lines.push("Match: Nee");
    }

    if (result.error) {
      lines.push(`Error: ${result.error}`);
    }

    if (result.answers.length) {
      lines.push("Answers:");

      result.answers.forEach((answer) => {
        lines.push(`- ${answer.data}`);
      });
    }

    lines.push("");
  });

  return lines.join("\n").trim();
}

function isValidIp(value) {
  if (!value) return false;
  return net.isIPv4(value) || net.isIPv6(value);
}

router.get(
  "/",
  dnsPropagationLimiter,
  asyncHandler(async (req, res) => {
    const name = normalizeDnsName(req.query.name);
    const recordType = String(req.query.type || "A").toUpperCase();
    const expectedValue = normalizeExpectedValue(req.query.expected || "");
    const customResolver = String(req.query.customResolver || "").trim();

    if (!name) {
      return res.status(400).json({
        error: "A domain or hostname is required.",
        code: "dns.noName",
      });
    }

    if (isBlockedTarget(name)) {
      return res.status(403).json({
        error: "This address is not allowed.",
        code: "net.addressNotAllowed",
      });
    }

    if (!supportedRecordTypes.includes(recordType)) {
      return res.status(400).json({
        error: `Record type ${recordType} is not supported.`,
        code: "dns.unsupportedRecordType",
      });
    }

    const activeResolvers = [...resolvers];

    if (customResolver) {
      if (!isValidIp(customResolver)) {
        return res.status(400).json({
          error: "Invalid IP address for the custom resolver.",
          code: "dns.invalidCustomResolver",
        });
      }
      if (isBlockedTarget(customResolver)) {
        return res.status(403).json({
          error: "This custom resolver is not allowed.",
          code: "dns.customResolverNotAllowed",
        });
      }
      activeResolvers.push({
        id: "custom",
        name: `Custom (${customResolver})`,
        servers: [customResolver],
      });
    }

    const resolverResults = await Promise.all(
      activeResolvers.map((resolverConfig) =>
        queryResolver({
          resolverConfig,
          name,
          recordType,
          expectedValue,
        }),
      ),
    );

    const foundCount = resolverResults.filter((result) => result.found).length;

    const matchCount = resolverResults.filter(
      (result) => result.matchStatus === "match",
    ).length;

    const hasExpectedValue = Boolean(expectedValue);

    const status = resolverResults.every(
      (result) => result.status === "success",
    )
      ? "success"
      : resolverResults.some((result) => result.status === "success")
        ? "warning"
        : "error";

    // Count SPF includes from a single representative resolver's answer, not
    // summed across every resolver queried - resolvers that all successfully
    // answer typically return the *same* record, so flattening their
    // answers together previously multiplied the include count by however
    // many resolvers responded (e.g. 3 real includes x 5 resolvers = a
    // false "15/10, too many lookups" reading for a perfectly healthy SPF
    // record).
    const primaryResolverResult =
      resolverResults.find((result) => result.status === "success") ||
      resolverResults[0];

    const spfIncludeCount = primaryResolverResult
      ? countSpfIncludes(primaryResolverResult.answers)
      : 0;

    const spfStatus =
      spfIncludeCount > 0 ? getSpfStatus(spfIncludeCount) : undefined;

    const result = {
      type: "dnsPropagationViewer",
      name,
      recordType,
      expectedValue,
      hasExpectedValue,
      resolverCount: resolverResults.length,
      foundCount,
      matchCount,
      status,
      spfIncludeCount,
      spfStatus,
      resolverResults,
    };

    res.json({
      ...result,
      plainText: buildPlainText({
        name,
        recordType,
        expectedValue,
        resolverResults,
      }),
    });
  }),
);

module.exports = router;
