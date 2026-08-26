async function fetchDnsRecord(name, type) {
  const response = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
  );

  return response.json();
}

function getAnswerData(data) {
  return data.Answer?.map((record) => record.data) || [];
}

function hasAnswer(data) {
  return Array.isArray(data.Answer) && data.Answer.length > 0;
}

async function runDkimAnalysis(domain, selector) {
  const selectors = selector
    ? [selector]
    : ["selector1", "selector2", "default", "google", "k1", "mail"];

  const results = await Promise.all(
    selectors.map(async (currentSelector) => {
      const dkimDomain = `${currentSelector}._domainkey.${domain}`;

      try {
        const data = await fetchDnsRecord(dkimDomain, "TXT");

        if (!hasAnswer(data)) {
          return { selector: currentSelector, found: false };
        }

        const record = getAnswerData(data).join("\n\n");

        return {
          selector: currentSelector,
          found: true,
          hasDkim: record.includes("v=DKIM1"),
          hasPublicKey: record.includes("p="),
          record,
        };
      } catch {
        return { selector: currentSelector, found: false };
      }
    }),
  );

  return {
    type: "dnsAnalysis",
    view: "dkim",
    domain,
    results,
  };
}

async function runM365HealthCheck(domain) {
  const maxScore = 11;
  let score = 0;
  const findings = [];

  const [spfData, dmarcData, mxData, selector1Data, selector2Data] =
    await Promise.all([
      fetchDnsRecord(domain, "TXT"),
      fetchDnsRecord(`_dmarc.${domain}`, "TXT"),
      fetchDnsRecord(domain, "MX"),
      fetchDnsRecord(`selector1._domainkey.${domain}`, "TXT"),
      fetchDnsRecord(`selector2._domainkey.${domain}`, "TXT"),
    ]);

  const spfRecord =
    spfData.Answer?.find((record) =>
      record.data.toLowerCase().includes("v=spf1"),
    )?.data || "";

  const hasSpf = Boolean(spfRecord);
  const hasM365Spf = spfRecord.includes("spf.protection.outlook.com");
  const hasHardFail = spfRecord.includes("-all");

  if (hasSpf) score += 2;
  if (hasM365Spf) score += 2;
  if (hasHardFail) score += 1;

  findings.push({ label: "SPF Record", ok: hasSpf });
  findings.push({ label: "Microsoft 365 SPF Include", ok: hasM365Spf });
  findings.push({ label: "Hard Fail (-all)", ok: hasHardFail });

  const dkimChecks = [
    { selector: "selector1", data: selector1Data },
    { selector: "selector2", data: selector2Data },
  ];

  dkimChecks.forEach((check) => {
    const found = check.data.Answer?.some((record) =>
      record.data.includes("v=DKIM1"),
    );

    if (found) score += 1;

    findings.push({ label: check.selector, ok: Boolean(found) });
  });

  const dmarcRecord = getAnswerData(dmarcData).join(" ");
  const hasDmarc = dmarcRecord.includes("v=DMARC1");
  const rejectPolicy = dmarcRecord.includes("p=reject");

  if (hasDmarc) score += 1;
  if (rejectPolicy) score += 2;

  findings.push({ label: "DMARC Record", ok: hasDmarc });
  findings.push({ label: "DMARC Reject Policy", ok: rejectPolicy });

  const hasMx = mxData.Answer?.some((record) =>
    record.data.toLowerCase().includes("mail.protection.outlook.com"),
  );

  if (hasMx) score += 1;

  findings.push({ label: "Exchange Online MX", ok: hasMx });

  const status =
    score >= 9 ? "excellent" : score >= 7 ? "good" : "action-needed";

  return {
    type: "dnsAnalysis",
    view: "m365health",
    domain,
    score,
    maxScore,
    status,
    findings,
  };
}

async function runHealthCheck(domain) {
  const [spfData, dmarcData, mxData, nsData] = await Promise.all([
    fetchDnsRecord(domain, "TXT"),
    fetchDnsRecord(`_dmarc.${domain}`, "TXT"),
    fetchDnsRecord(domain, "MX"),
    fetchDnsRecord(domain, "NS"),
  ]);

  const spfFound = spfData.Answer?.some((record) =>
    record.data.toLowerCase().includes("v=spf1"),
  );

  const dmarcFound = dmarcData.Answer?.some((record) =>
    record.data.toLowerCase().includes("v=dmarc1"),
  );

  const mxFound = hasAnswer(mxData);
  const nsFound = hasAnswer(nsData);

  let score = 0;

  if (spfFound) score += 3;
  if (dmarcFound) score += 3;
  if (mxFound) score += 2;
  if (nsFound) score += 2;

  return {
    type: "dnsAnalysis",
    view: "healthcheck",
    domain,
    score,
    maxScore: 10,
    findings: [
      { label: "SPF Record", ok: Boolean(spfFound) },
      { label: "DMARC Record", ok: Boolean(dmarcFound) },
      { label: "MX Records", ok: Boolean(mxFound) },
      { label: "Nameservers", ok: Boolean(nsFound) },
    ],
  };
}

function buildDmarcAnalysis(lookupDomain, records) {
  const output = records.join("\n\n");

  const hasReject = output.includes("p=reject");
  const hasQuarantine = output.includes("p=quarantine");
  const hasNone = output.includes("p=none");
  const hasRua = output.includes("rua=");
  const hasRuf = output.includes("ruf=");

  const pctMatch = output.match(/pct=(\d+)/);
  const pct = pctMatch ? pctMatch[1] : "100";

  const policy = hasReject
    ? "reject"
    : hasQuarantine
      ? "quarantine"
      : hasNone
        ? "none"
        : null;

  return {
    type: "dnsAnalysis",
    view: "dmarc",
    domain: lookupDomain,
    policy,
    hasRua,
    hasRuf,
    pct,
    raw: output,
  };
}

function buildSpfAnalysis(lookupDomain, records) {
  const output = records.join("\n\n");

  const includeMatches = output.match(/include:/g) || [];
  const ipMatches = output.match(/ip4:/g) || [];

  const hasHardFail = output.includes("-all");
  const hasSoftFail = output.includes("~all");

  const hasOffice365 = output.includes("spf.protection.outlook.com");
  const hasMailChannels = output.includes("relay.mailchannels.net");

  return {
    type: "dnsAnalysis",
    view: "spf",
    domain: lookupDomain,
    failPolicy: hasHardFail ? "hard" : hasSoftFail ? "soft" : null,
    hasOffice365,
    hasMailChannels,
    includeCount: includeMatches.length,
    ipCount: ipMatches.length,
    raw: output,
  };
}

export async function runDnsTool(tool, inputValues) {
  const domain = inputValues.domain || inputValues.input;

  if (!domain) {
    return {
      type: "dnsAnalysis",
      view: "message",
      message: "No domain provided.",
    };
  }

  let config = {};

  try {
    config = JSON.parse(tool.config || "{}");
  } catch {
    config = {};
  }

  const recordType = config.recordType || "TXT";
  const prefix = config.prefix || "";
  const contains = config.contains || "";
  const mode = config.mode || "";
  const selector = inputValues.selector || "";

  const lookupDomain = prefix + domain;

  try {
    if (mode === "dkim") {
      return await runDkimAnalysis(domain, selector);
    }

    if (mode === "m365health") {
      return await runM365HealthCheck(domain);
    }

    if (mode === "healthcheck") {
      return await runHealthCheck(domain);
    }

    const data = await fetchDnsRecord(lookupDomain, recordType);

    if (!hasAnswer(data)) {
      return {
        type: "dnsAnalysis",
        view: "message",
        message: `No ${recordType} records found for ${lookupDomain}`,
      };
    }

    let records = getAnswerData(data);

    if (contains) {
      records = records.filter((record) =>
        record.toLowerCase().includes(contains.toLowerCase()),
      );
    }

    if (records.length === 0) {
      return {
        type: "dnsAnalysis",
        view: "message",
        message: `No matching ${recordType} records found for ${lookupDomain}`,
      };
    }

    if (prefix === "_dmarc.") {
      return buildDmarcAnalysis(lookupDomain, records);
    }

    if (contains && contains.toLowerCase() === "v=spf1") {
      return buildSpfAnalysis(lookupDomain, records);
    }

    return {
      type: "dnsAnalysis",
      view: "records",
      domain: lookupDomain,
      recordType,
      records,
    };
  } catch (error) {
    console.error("DNS Lookup Error:", error);

    return {
      type: "dnsAnalysis",
      view: "message",
      message: `DNS lookup failed for ${lookupDomain}`,
    };
  }
}
