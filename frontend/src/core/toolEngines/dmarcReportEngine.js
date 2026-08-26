function getTextContent(parent, tagName) {
  if (!parent) return "";
  const el = parent.getElementsByTagName(tagName)?.[0];
  return el?.textContent?.trim() || "";
}

function parseDateRange(metadata) {
  if (!metadata) return {};
  const begin = getTextContent(metadata, "begin");
  const end = getTextContent(metadata, "end");

  const beginTs = Number(begin) * 1000;
  const endTs = Number(end) * 1000;

  return {
    begin:
      begin && !Number.isNaN(beginTs) ? new Date(beginTs).toISOString() : "",
    end: end && !Number.isNaN(endTs) ? new Date(endTs).toISOString() : "",
    beginUnix: begin,
    endUnix: end,
  };
}

function parsePolicyPublished(policyEl) {
  return {
    domain: getTextContent(policyEl, "domain"),
    adkim: getTextContent(policyEl, "adkim"),
    aspf: getTextContent(policyEl, "aspf"),
    p: getTextContent(policyEl, "p"),
    sp: getTextContent(policyEl, "sp"),
    pct: getTextContent(policyEl, "pct"),
  };
}

function parseReasons(policyEvaluated) {
  if (!policyEvaluated) return [];

  return Array.from(policyEvaluated.getElementsByTagName("reason")).map(
    (reasonEl) => ({
      type: getTextContent(reasonEl, "type"),
      comment: getTextContent(reasonEl, "comment"),
    }),
  );
}

function parseRecord(recordEl) {
  const row = recordEl.getElementsByTagName("row")?.[0];
  const identifiers = recordEl.getElementsByTagName("identifiers")?.[0];
  const authResults = recordEl.getElementsByTagName("auth_results")?.[0];

  const policyEvaluated = row?.getElementsByTagName("policy_evaluated")?.[0];

  const authDkim = authResults?.getElementsByTagName("dkim")?.[0];
  const authSpf = authResults?.getElementsByTagName("spf")?.[0];

  return {
    sourceIp: getTextContent(row, "source_ip"),
    count: Number(getTextContent(row, "count")) || 0,
    disposition: getTextContent(policyEvaluated, "disposition"),
    dkimResult: getTextContent(policyEvaluated, "dkim"),
    spfResult: getTextContent(policyEvaluated, "spf"),
    reasons: parseReasons(policyEvaluated),
    headerFrom: getTextContent(identifiers, "header_from"),
    dkimDomain: getTextContent(authDkim, "domain"),
    dkimAuthResult: getTextContent(authDkim, "result"),
    spfDomain: getTextContent(authSpf, "domain"),
    spfAuthResult: getTextContent(authSpf, "result"),
  };
}

function yieldToMainThread() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const YIELD_EVERY = 500;

async function aggregateRecords(records) {
  let totalEmails = 0;
  let totalPass = 0;
  let totalFail = 0;
  const ipMap = {};

  for (let index = 0; index < records.length; index += 1) {
    const rec = records[index];

    totalEmails += rec.count;

    const passed = rec.dkimResult === "pass" || rec.spfResult === "pass";

    if (passed) {
      totalPass += rec.count;
    } else {
      totalFail += rec.count;
    }

    if (!ipMap[rec.sourceIp]) {
      ipMap[rec.sourceIp] = {
        ip: rec.sourceIp,
        count: 0,
        passCount: 0,
        failCount: 0,
        disposition: rec.disposition,
        dkimResult: rec.dkimResult,
        spfResult: rec.spfResult,
        headerFrom: rec.headerFrom,
        reasons: [],
      };
    }

    ipMap[rec.sourceIp].count += rec.count;

    if (passed) {
      ipMap[rec.sourceIp].passCount += rec.count;
    } else {
      ipMap[rec.sourceIp].failCount += rec.count;
    }

    if (rec.reasons.length > 0) {
      ipMap[rec.sourceIp].reasons.push(...rec.reasons);
    }

    if (index > 0 && index % YIELD_EVERY === 0) {
      await yieldToMainThread();
    }
  }

  const sourceIps = Object.values(ipMap).sort((a, b) => b.count - a.count);

  const topFailIps = sourceIps
    .filter((ip) => ip.failCount > 0)
    .sort((a, b) => b.failCount - a.failCount)
    .slice(0, 10);

  return {
    totalEmails,
    totalPass,
    totalFail,
    passRate: totalEmails > 0 ? Math.round((totalPass / totalEmails) * 100) : 0,
    failRate: totalEmails > 0 ? Math.round((totalFail / totalEmails) * 100) : 0,
    sourceIps,
    topFailIps,
    uniqueIps: sourceIps.length,
  };
}

export async function parseDmarcReport(xmlText, fileName = "") {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    const parseError = xmlDoc.getElementsByTagName("parsererror");

    if (parseError.length) {
      return {
        success: false,
        error: "Invalid XML file. This is not a valid DMARC report.",
      };
    }

    const feedback = xmlDoc.getElementsByTagName("feedback")?.[0];

    if (!feedback) {
      return {
        success: false,
        error:
          "No <feedback> root element found. This is not a DMARC aggregate report.",
      };
    }

    const metadata = feedback.getElementsByTagName("report_metadata")?.[0];
    const policyEl = feedback.getElementsByTagName("policy_published")?.[0];
    const recordElements = feedback.getElementsByTagName("record");

    const reportMetadata = {
      orgName: getTextContent(metadata, "org_name"),
      email: getTextContent(metadata, "email"),
      reportId: getTextContent(metadata, "report_id"),
      dateRange: metadata ? parseDateRange(metadata) : {},
    };

    const policyPublished = policyEl ? parsePolicyPublished(policyEl) : {};

    const records = Array.from(recordElements).map(parseRecord);
    const summary = await aggregateRecords(records);

    return {
      success: true,
      fileName,
      reportMetadata,
      policyPublished,
      summary,
    };
  } catch (error) {
    return {
      success: false,
      error: `Parse error: ${error.message}`,
    };
  }
}

async function decompressToText(blob, format) {
  const decompressedStream = blob
    .stream()
    .pipeThrough(new DecompressionStream(format));

  return new Response(decompressedStream).text();
}

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;

async function extractFirstZipEntryAsText(buffer) {
  const view = new DataView(buffer);

  if (view.getUint32(0, true) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error("The file is not a valid ZIP archive.");
  }

  const compressionMethod = view.getUint16(8, true);
  const compressedSize = view.getUint32(18, true);
  const nameLength = view.getUint16(26, true);
  const extraLength = view.getUint16(28, true);
  const dataStart = 30 + nameLength + extraLength;
  const compressedData = buffer.slice(dataStart, dataStart + compressedSize);

  if (compressionMethod === 0) {
    return new TextDecoder("utf-8").decode(compressedData);
  }

  if (compressionMethod === 8) {
    return decompressToText(new Blob([compressedData]), "deflate-raw");
  }

  throw new Error("The ZIP compression method is not supported.");
}

export async function readReportFile(file) {
  const name = String(file?.name || "").toLowerCase();

  if (name.endsWith(".gz")) {
    return decompressToText(file, "gzip");
  }

  if (name.endsWith(".zip")) {
    const buffer = await file.arrayBuffer();

    return extractFirstZipEntryAsText(buffer);
  }

  return file.text();
}

export async function runDmarcReportTool(tool, inputValues) {
  return inputValues.result || { success: false, error: "No data" };
}
