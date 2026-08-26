export const dmarcPolicies = [
  {
    label: "Monitoring p=none",
    value: "none",
  },
  {
    label: "Quarantine p=quarantine",
    value: "quarantine",
  },
  {
    label: "Reject p=reject",
    value: "reject",
  },
];

export const dmarcSubdomainPolicies = [
  {
    label: "No separate subdomain policy",
    value: "",
  },
  {
    label: "None sp=none",
    value: "none",
  },
  {
    label: "Quarantine sp=quarantine",
    value: "quarantine",
  },
  {
    label: "Reject sp=reject",
    value: "reject",
  },
];

export const dmarcAlignmentModes = [
  {
    label: "Relaxed",
    value: "r",
  },
  {
    label: "Strict",
    value: "s",
  },
];

export const dmarcFailureOptions = [
  {
    label: "Alle failures fo=1",
    value: "1",
  },
  {
    label: "Both checks fail (fo=0)",
    value: "0",
  },
  {
    label: "DKIM failure fo=d",
    value: "d",
  },
  {
    label: "SPF failure fo=s",
    value: "s",
  },
];

export function normalizeDmarcRecord(value = "") {
  return String(value).trim().replaceAll("\n", " ").replaceAll("\r", " ");
}

export function normalizeInput(value = "") {
  return String(value).trim().toLowerCase();
}

export function parseDmarcRecord(value = "") {
  const normalized = normalizeDmarcRecord(value);

  if (!normalized) {
    return {
      valid: true,
      tags: {},
    };
  }

  const tags = {};

  normalized
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const pieces = part.split("=");
      const key = normalizeInput(pieces[0]);
      const tagValue = pieces.slice(1).join("=").trim();

      if (key && tagValue) {
        tags[key] = tagValue;
      }
    });

  return {
    valid: true,
    tags,
  };
}

export function parseMultiValues(value = "") {
  const items = [];

  String(value)
    .split("\n")
    .forEach((line) => {
      line.split(",").forEach((item) => {
        const normalized = normalizeInput(item);

        if (normalized) {
          items.push(normalized);
        }
      });
    });

  return Array.from(new Set(items));
}

export function normalizeReportAddress(value = "") {
  const normalized = normalizeInput(value);

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("mailto:")) {
    return normalized;
  }

  return `mailto:${normalized}`;
}

export function formatReportAddresses(value = "") {
  return validateReportAddresses(value)
    .valid.map((item) => normalizeReportAddress(item))
    .filter(Boolean)
    .join(",");
}

const REPORT_SIZE_SUFFIX = /!\d+[kmgt]?$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.][^\s@]*\.[^\s@]+$/i;

export function stripReportSizeSuffix(value = "") {
  return String(value).replace(REPORT_SIZE_SUFFIX, "");
}

export function getReportSizeSuffix(value = "") {
  const match = String(value).match(REPORT_SIZE_SUFFIX);

  return match ? match[0] : "";
}

export function validateReportAddresses(value = "") {
  const items = parseMultiValues(value);
  const valid = [];
  const invalid = [];

  items.forEach((item) => {
    const withoutScheme = item.replace(/^mailto:/, "");
    const email = stripReportSizeSuffix(withoutScheme);

    if (EMAIL_PATTERN.test(email)) {
      valid.push(item);
    } else {
      invalid.push(item);
    }
  });

  return { valid, invalid };
}

export function extractDomainFromReportAddress(value = "") {
  const withoutScheme = String(value).replace(/^mailto:/, "");
  const email = stripReportSizeSuffix(withoutScheme);
  const atIndex = email.lastIndexOf("@");

  return atIndex === -1 ? "" : email.slice(atIndex + 1).toLowerCase();
}

export function getExternalReportTargets(policyDomain, addresses = []) {
  const normalizedPolicyDomain = normalizeInput(policyDomain);

  if (!normalizedPolicyDomain) {
    return [];
  }

  const reportDomains = Array.from(
    new Set(
      addresses
        .map((address) => extractDomainFromReportAddress(address))
        .filter((domain) => domain && domain !== normalizedPolicyDomain),
    ),
  );

  return reportDomains.map((reportDomain) => ({
    reportDomain,
    verificationHostname: `${normalizedPolicyDomain}._report._dmarc.${reportDomain}`,
    verificationValue: "v=DMARC1",
  }));
}

export function getPolicyStatus(policy) {
  if (policy === "reject") {
    return "success";
  }

  if (policy === "quarantine") {
    return "warning";
  }

  return "warning";
}

export function getPolicyLabel(policy) {
  if (policy === "reject") {
    return "Reject";
  }

  if (policy === "quarantine") {
    return "Quarantine";
  }

  return "Monitoring";
}

export function buildDmarcRecord({
  domain = "",
  existingRecord = "",
  policy = "none",
  subdomainPolicy = "",
  percentage = "100",
  ruaAddresses = "",
  rufAddresses = "",
  adkim = "r",
  aspf = "r",
  failureOption = "1",
}) {
  const parsed = parseDmarcRecord(existingRecord);

  const tags = {
    ...parsed.tags,
  };

  tags.v = "DMARC1";
  tags.p = policy || tags.p || "none";

  if (subdomainPolicy) {
    tags.sp = subdomainPolicy;
  }

  const pct = Number(percentage);

  if (Number.isInteger(pct) && pct >= 1 && pct < 100) {
    tags.pct = String(pct);
  }

  if (Number.isInteger(pct) && pct === 100) {
    delete tags.pct;
  }

  const rua = formatReportAddresses(ruaAddresses);

  if (rua) {
    tags.rua = rua;
  }

  const ruf = formatReportAddresses(rufAddresses);

  if (ruf) {
    tags.ruf = ruf;
  }

  tags.adkim = adkim || tags.adkim || "r";
  tags.aspf = aspf || tags.aspf || "r";

  if (ruf && failureOption) {
    tags.fo = failureOption;
  } else {
    delete tags.fo;
  }

  const tagOrder = ["v", "p", "sp", "pct", "rua", "ruf", "adkim", "aspf", "fo"];

  const orderedTags = [];

  tagOrder.forEach((key) => {
    if (tags[key]) {
      orderedTags.push(`${key}=${tags[key]}`);
    }
  });

  Object.keys(tags).forEach((key) => {
    if (!tagOrder.includes(key)) {
      orderedTags.push(`${key}=${tags[key]}`);
    }
  });

  const record = orderedTags.join("; ") + ";";

  const hasReporting = Boolean(tags.rua);

  const status = !hasReporting ? "warning" : getPolicyStatus(tags.p);

  const dnsLength = record.length;
  const lengthStatus =
    dnsLength > 510 ? "error" : dnsLength > 255 ? "warning" : "success";

  const normalizedDomain = normalizeInput(domain);

  const externalReportTargets = getExternalReportTargets(normalizedDomain, [
    ...validateReportAddresses(ruaAddresses).valid,
    ...validateReportAddresses(rufAddresses).valid,
  ]);

  return {
    type: "dmarcBuilder",
    domain: normalizedDomain,
    record,
    tags,
    policy: tags.p,
    subdomainPolicy: tags.sp || "Not set",
    percentage: tags.pct || "100",
    reportingEnabled: hasReporting,
    rua: tags.rua || "",
    ruf: tags.ruf || "",
    adkim: tags.adkim || "r",
    aspf: tags.aspf || "r",
    failureOption: tags.fo || "Not set",
    status,
    policyLabel: getPolicyLabel(tags.p),
    tagCount: Object.keys(tags).length,
    dnsLength,
    lengthStatus,
    externalReportTargets,
  };
}

export function getDmarcTagLabel(key = "") {
  if (key === "v") {
    return "Version";
  }

  if (key === "p") {
    return "Policy";
  }

  if (key === "sp") {
    return "Subdomain policy";
  }

  if (key === "pct") {
    return "Percentage";
  }

  if (key === "rua") {
    return "Aggregate reports";
  }

  if (key === "ruf") {
    return "Forensic reports";
  }

  if (key === "adkim") {
    return "DKIM alignment";
  }

  if (key === "aspf") {
    return "SPF alignment";
  }

  if (key === "fo") {
    return "Failure option";
  }

  return key;
}

export async function runDmarcTool(tool, inputValues) {
  return buildDmarcRecord(inputValues);
}
