function unfoldHeader(header) {
  return header.replace(/\r?\n[ \t]+/g, " ");
}

function getHeaderValue(header, name) {
  const regex = new RegExp(`^${name}:(.*)$`, "im");

  return header.match(regex)?.[1]?.trim() || "Not found";
}

function isExplicitAuthFail(value) {
  const normalized = value.toLowerCase();

  return ["fail", "softfail", "neutral", "none"].includes(normalized);
}

function isMissing(value) {
  return value === "Not found";
}

function extractAuthServId(line) {
  const firstSegment = line
    .replace(/^Authentication-Results:\s*/i, "")
    .split(";")[0]
    .trim();

  if (!firstSegment || /^\w+=/.test(firstSegment)) {
    return "Unknown";
  }

  return firstSegment;
}

function parseAuthResultLine(line) {
  const spf =
    line.match(/spf=(pass|fail|softfail|neutral|none)/i)?.[1] || "Not found";
  const dkim = line.match(/dkim=(pass|fail|none)/i)?.[1] || "Not found";
  const dmarc = line.match(/dmarc=(pass|fail|none)/i)?.[1] || "Not found";
  const compAuth = line.match(/compauth=(pass|fail|none)/i)?.[1] || "Not found";

  const compAuthReason =
    line.match(/compauth=\w+[;\s]+reason=(\d+)/i)?.[1] || "Not found";

  return {
    host: extractAuthServId(line),
    spf,
    dkim,
    dmarc,
    compAuth,
    compAuthReason,
    raw: line.trim(),
  };
}

function parseAuthenticationResults(header) {
  const lines = header.match(/^Authentication-Results:.*$/gim) || [];

  return lines.map(parseAuthResultLine);
}

const antispamVerdictLabels = {
  SKI: "Skipped (trusted sender)",
  SKN: "Skipped (false positive correction)",
  SKS: "Skipped (allowed sender)",
  SKA: "Skipped (allowed recipient)",
  SKB: "Skipped (backscatter)",
  SPM: "Marked as spam",
  NSPM: "Not spam",
  BLK: "Blocked",
};

const antispamCategoryLabels = {
  SPM: "Spam",
  HSPM: "Spam (high confidence)",
  PHSH: "Phishing",
  BULK: "Bulk mail",
  SPOOF: "Spoofing detected",
  DIMP: "Domain impersonation",
  UIMP: "User impersonation",
  MALW: "Malware",
};

function parseAntispamReport(header) {
  const reportMatch = header.match(
    /X-Forefront-Antispam-Report:\s*([^\r\n]*)/i,
  );

  if (!reportMatch) {
    return null;
  }

  const fields = {};

  reportMatch[1].split(";").forEach((part) => {
    const separatorIndex = part.indexOf(":");

    if (separatorIndex === -1) {
      return;
    }

    const key = part.slice(0, separatorIndex).trim().toUpperCase();
    const value = part.slice(separatorIndex + 1).trim();

    if (key && value) {
      fields[key] = value;
    }
  });

  return {
    filterVerdict: fields.SFV || "Not found",
    filterVerdictLabel:
      antispamVerdictLabels[fields.SFV] || fields.SFV || "Not found",
    category: fields.CAT || "Not found",
    categoryLabel:
      antispamCategoryLabels[fields.CAT] || fields.CAT || "Not found",
    raw: reportMatch[1].trim(),
  };
}

const bounceSubjectKeywords = [
  "undeliverable",
  "delivery status notification",
  "mail delivery failed",
  "returned mail",
  "non-delivery report",
];

function detectBounce(fullContent, subject) {
  const lowerSubject = subject.toLowerCase();

  const hasDsnContentType = /Content-Type:\s*message\/delivery-status/i.test(
    fullContent,
  );
  const hasFailedAction = /^Action:\s*failed/im.test(fullContent);
  const hasSubjectKeyword = bounceSubjectKeywords.some((keyword) =>
    lowerSubject.includes(keyword),
  );

  const detected = hasDsnContentType || hasFailedAction || hasSubjectKeyword;

  if (!detected) {
    return { detected: false };
  }

  const smtpCode =
    fullContent.match(
      /Diagnostic-Code:\s*smtp;\s*(\d{3}(?:\s+\d\.\d\.\d)?)/i,
    )?.[1] ||
    fullContent.match(/^Status:\s*(\d\.\d+\.\d+)/im)?.[1] ||
    null;

  const diagnosticText =
    fullContent.match(/Diagnostic-Code:\s*(.+)/i)?.[1]?.trim() || null;

  return {
    detected: true,
    smtpCode,
    diagnosticText,
  };
}

const knownBrands = [
  {
    name: "Microsoft",
    domains: [
      "microsoft.com",
      "outlook.com",
      "office.com",
      "office365.com",
      "live.com",
    ],
  },
  { name: "Google", domains: ["google.com", "gmail.com"] },
  { name: "Apple", domains: ["apple.com", "icloud.com"] },
  { name: "Amazon", domains: ["amazon.com", "amazon.nl", "amazon.de"] },
  { name: "PayPal", domains: ["paypal.com"] },
  { name: "DHL", domains: ["dhl.com", "dhl.nl"] },
  { name: "PostNL", domains: ["postnl.nl", "postnl.post"] },
  { name: "ING", domains: ["ing.nl", "ing.com"] },
  { name: "Rabobank", domains: ["rabobank.nl"] },
  { name: "ABN AMRO", domains: ["abnamro.nl", "abnamro.com"] },
  { name: "LinkedIn", domains: ["linkedin.com"] },
  { name: "Facebook", domains: ["facebook.com", "meta.com"] },
  { name: "DocuSign", domains: ["docusign.com", "docusign.net"] },
];

function parseFromHeader(value) {
  const match = value.match(/^"?([^"<]*)"?\s*<([^>]+)>$/);

  if (match) {
    return { displayName: match[1].trim(), email: match[2].trim() };
  }

  return { displayName: "", email: value.trim() };
}

function getDomainFromEmail(email) {
  return email.split("@")[1]?.toLowerCase().trim() || "";
}

function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] =
          1 +
          Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
      }
    }
  }

  return matrix[rows - 1][cols - 1];
}

function isLegitDomainForBrand(domain, brand) {
  return brand.domains.some(
    (legit) => domain === legit || domain.endsWith(`.${legit}`),
  );
}

function detectBrandSpoofing(fromHeader) {
  const { displayName, email } = parseFromHeader(fromHeader);
  const domain = getDomainFromEmail(email);

  if (!displayName || !domain) {
    return { displayNameSpoof: null, lookalikeDomain: null };
  }

  const lowerDisplayName = displayName.toLowerCase();

  let displayNameSpoof = null;
  let lookalikeDomain = null;

  for (const brand of knownBrands) {
    const legit = isLegitDomainForBrand(domain, brand);

    if (
      !displayNameSpoof &&
      lowerDisplayName.includes(brand.name.toLowerCase()) &&
      !legit
    ) {
      displayNameSpoof = { brand: brand.name, displayName, domain };
    }

    if (!lookalikeDomain && !legit) {
      for (const legitDomain of brand.domains) {
        const distance = levenshteinDistance(domain, legitDomain);

        if (
          distance > 0 &&
          distance <= 2 &&
          Math.abs(domain.length - legitDomain.length) <= 3
        ) {
          lookalikeDomain = {
            brand: brand.name,
            domain,
            legitDomain,
            distance,
          };
          break;
        }
      }
    }

    if (displayNameSpoof && lookalikeDomain) {
      break;
    }
  }

  return { displayNameSpoof, lookalikeDomain };
}

function parseMailRoute(receivedHeaders) {
  const chronological = [...receivedHeaders].reverse();

  return chronological.map((hop, index) => {
    const fromMatch = hop.match(/from\s+([^\s(]+)/i);
    const byMatch = hop.match(/by\s+([^\s(]+)/i);
    const withMatch = hop.match(/with\s+([^\s;]+)/i);
    const datePart = hop.split(";").pop()?.trim() || "";
    const parsedDate = new Date(datePart);

    const receiver = byMatch?.[1] || "Unknown";

    let component = "Extern";

    if (receiver.includes("mail.protection.outlook.com")) {
      component = "Microsoft EOP";
    } else if (
      receiver.includes("outlook.office365.com") ||
      receiver.includes("prod.outlook.com")
    ) {
      component = "Exchange Online";
    } else if (receiver.includes("outlook.com")) {
      component = "Microsoft Outlook";
    }

    return {
      hop: index + 1,
      from: fromMatch?.[1] || "Unknown",
      by: receiver,
      component,
      type: withMatch?.[1] || "Unknown",
      time: Number.isNaN(parsedDate.getTime())
        ? "Unknown"
        : parsedDate.toLocaleString(),

      timestamp: Number.isNaN(parsedDate.getTime())
        ? null
        : parsedDate.getTime(),
      raw: hop,
    };
  });
}

export async function runMailTool(tool, inputValues) {
  const rawHeader = inputValues.header || "";

  if (!rawHeader) {
    return "No mail header provided.";
  }

  const header = unfoldHeader(rawHeader);

  const subject = getHeaderValue(header, "Subject");
  const from = getHeaderValue(header, "From");
  const replyTo = getHeaderValue(header, "Reply-To");
  const returnPath = getHeaderValue(header, "Return-Path");

  const messageId =
    getHeaderValue(header, "Message-ID") !== "Not found"
      ? getHeaderValue(header, "Message-ID")
      : getHeaderValue(header, "Message-Id");

  const authResults = parseAuthenticationResults(header);

  const primaryAuth = authResults[0] || {
    spf: "Not found",
    dkim: "Not found",
    dmarc: "Not found",
    compAuth: "Not found",
    compAuthReason: "Not found",
  };

  const { spf, dkim, dmarc, compAuth, compAuthReason } = primaryAuth;

  const bcl = header.match(/BCL:(\d+)/i)?.[1] || "Not found";

  const scl = header.match(/SCL:(-?\d+)/i)?.[1] || "Not found";

  const antispamReport = parseAntispamReport(header);

  const bounce = detectBounce(rawHeader, subject);

  const { displayNameSpoof, lookalikeDomain } = detectBrandSpoofing(from);

  const ips = [
    ...new Set(
      (header.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []).filter((candidate) =>
        candidate.split(".").every((octet) => Number(octet) <= 255),
      ),
    ),
  ];

  const originatingIp =
    header.match(/client-ip=([0-9.]+)/i)?.[1] ||
    header.match(/sender IP is ([0-9.]+)/i)?.[1] ||
    ips[0] ||
    "Not found";

  const isExchangeOnline =
    header.includes("outlook.office365.com") ||
    header.includes("prod.outlook.com");

  const isEOP = header.includes("mail.protection.outlook.com");

  const isM365 = isExchangeOnline || isEOP;

  const receivedHeaders = header.match(/^Received:.*$/gim) || [];

  const mailRoute = parseMailRoute(receivedHeaders);

  const domainBearingFields = [
    from,
    replyTo,
    returnPath,
    messageId,
    ...receivedHeaders,
  ].join(" ");

  const domains = [
    ...new Set(
      domainBearingFields.match(/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [],
    ),
  ];

  const hopCount = (header.match(/^Received:/gim) || []).length;

  const risks = [];
  const warnings = [];

  if (isExplicitAuthFail(spf)) {
    risks.push(`SPF result: ${spf}`);
  } else if (isMissing(spf)) {
    warnings.push("SPF result not found");
  }

  if (isExplicitAuthFail(dkim)) {
    risks.push(`DKIM result: ${dkim}`);
  } else if (isMissing(dkim)) {
    warnings.push("DKIM result not found");
  }

  if (isExplicitAuthFail(dmarc)) {
    risks.push(`DMARC result: ${dmarc}`);
  } else if (isMissing(dmarc)) {
    warnings.push("DMARC result not found");
  }

  if (
    replyTo !== "Not found" &&
    from !== "Not found" &&
    !from.toLowerCase().includes(replyTo.replace(/[<>]/g, "").toLowerCase())
  ) {
    risks.push("Reply-To differs from From");
  }

  if (
    antispamReport &&
    ["PHSH", "SPOOF", "DIMP", "UIMP", "MALW"].includes(antispamReport.category)
  ) {
    risks.push(`Antispam category: ${antispamReport.categoryLabel}`);
  }

  if (displayNameSpoof) {
    risks.push(
      `Display-name spoofing: "${displayNameSpoof.displayName}" claims to be ${displayNameSpoof.brand} but sends from ${displayNameSpoof.domain}`,
    );
  }

  if (lookalikeDomain) {
    risks.push(
      `Look-alike domain: ${lookalikeDomain.domain} closely resembles ${lookalikeDomain.legitDomain} (${lookalikeDomain.brand})`,
    );
  }

  const riskLevel =
    risks.length === 0 ? "Low" : risks.length <= 2 ? "Medium" : "High";

  const hasSafeLinks = header.includes("safelinks.protection.outlook.com");

  let riskScore = 0;

  riskScore += risks.length * 2;

  if (!isM365) {
    riskScore += 2;
  }

  riskScore = Math.min(riskScore, 10);

  return {
    type: "mailHeaderAnalysis",

    summary: {
      riskLevel,
      riskScore,
      spf,
      dkim,
      dmarc,
      compAuth,
      microsoft365: isM365,
      safeLinks: hasSafeLinks,

      attentionPoints:
        risks.length > 0 ? risks : ["No immediate concerns found"],

      warnings,
    },

    message: {
      subject,
      from,
      replyTo,
      returnPath,
      messageId,
    },

    authentication: {
      spf,
      dkim,
      dmarc,
      compAuth,
      compAuthReason,
      results: authResults,
    },

    microsoft365: {
      detected: isM365,
      exchangeOnlineProtection: isEOP,
      exchangeOnline: isExchangeOnline,
      safeLinks: hasSafeLinks,
    },

    antispam: {
      bulkComplaintLevel: bcl,
      spamConfidenceLevel: scl,
      filterVerdict: antispamReport?.filterVerdict || "Not found",
      filterVerdictLabel: antispamReport?.filterVerdictLabel || "Not found",
      category: antispamReport?.category || "Not found",
      categoryLabel: antispamReport?.categoryLabel || "Not found",
    },

    bounce,

    spoofing: {
      displayNameSpoof,
      lookalikeDomain,
    },

    route: {
      hopCount,
      hops: mailRoute,
    },

    domains,

    technical: {
      originatingIp,
      ipAddresses: ips,
    },
  };
}
