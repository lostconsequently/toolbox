export const dkimProviders = [
  {
    label: "Microsoft 365",
    value: "m365",
    mode: "m365",
    notes: [
      {
        label: "Configuration",
        text: "Add both CNAME records, then enable DKIM in Microsoft Defender / Exchange Online (Threat policies > DKIM).",
      },
      {
        label: "Note",
        text: "Microsoft derives the exact CNAME values from the domain and the onmicrosoft.com domain; no public key is needed.",
      },
    ],
  },
  {
    label: "Google Workspace",
    value: "google-workspace",
    mode: "generic",
    defaultSelector: "google",
    notes: [
      {
        label: "Configuration",
        text: "Generate the DKIM key in the Google Admin console under Apps > Google Workspace > Gmail > Authenticate email, then paste the public key here.",
      },
    ],
  },
  {
    label: "SendGrid",
    value: "sendgrid",
    mode: "generic",
    defaultSelector: "s1",
    notes: [
      {
        label: "Note",
        text: "SendGrid usually uses domain authentication with CNAME records instead of a standalone TXT key. Check the SendGrid dashboard for the exact values.",
      },
    ],
  },
  {
    label: "Mailgun",
    value: "mailgun",
    mode: "generic",
    defaultSelector: "mailo",
    notes: [
      {
        label: "Configuration",
        text: "The selector and public key are in Mailgun under Sending > Domain settings > DNS records.",
      },
    ],
  },
  {
    label: "Amazon SES",
    value: "amazon-ses",
    mode: "generic",
    defaultSelector: "",
    notes: [
      {
        label: "Note",
        text: "Amazon SES usually generates 3 separate CNAME tokens per domain. Enter the selector and public key per token here, or use the CNAME variant from the SES console.",
      },
    ],
  },
  {
    label: "SMTP2GO",
    value: "smtp2go",
    mode: "generic",
    defaultSelector: "smtp2go",
    notes: [
      {
        label: "Configuration",
        text: "The selector and public key are in SMTP2GO under Sender Domains.",
      },
    ],
  },
  {
    label: "Brevo",
    value: "brevo",
    mode: "generic",
    defaultSelector: "mail",
    notes: [
      {
        label: "Configuration",
        text: "The selector and public key are in Brevo under Senders, Domains & Dedicated IPs.",
      },
    ],
  },
  {
    label: "Mailjet",
    value: "mailjet",
    mode: "generic",
    defaultSelector: "mailjet",
    notes: [
      {
        label: "Configuration",
        text: "The selector and public key are in Mailjet under Account settings > DNS records.",
      },
    ],
  },
  {
    label: "Custom DKIM",
    value: "custom",
    mode: "custom",
    defaultSelector: "",
    notes: [
      {
        label: "Configuration",
        text: "Use this for your own mail servers or providers not in the list. Fill in the selector, domain, public key, key type and any extra tags yourself.",
      },
    ],
  },
];

export const dkimAlgorithmOptions = [
  { label: "Default (no h= tag)", value: "" },
  { label: "SHA-1", value: "sha1" },
  { label: "SHA-256", value: "sha256" },
];

export const dkimKeyTypeOptions = [
  { label: "RSA", value: "rsa" },
  { label: "Ed25519", value: "ed25519" },
];

export function getDkimProvider(value) {
  return (
    dkimProviders.find((provider) => provider.value === value) ||
    dkimProviders[0]
  );
}

export function normalizeDomain(value = "") {
  let domain = String(value).trim().toLowerCase();

  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    try {
      domain = new URL(domain).hostname;
    } catch {}
  }

  return domain.replace(/\.$/, "");
}

export function normalizeSelector(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

export function normalizeInitialDomain(value = "") {
  let initial = String(value).trim().toLowerCase();

  if (initial.startsWith("http://") || initial.startsWith("https://")) {
    try {
      initial = new URL(initial).hostname;
    } catch {}
  }

  return initial.replace(/\.onmicrosoft\.com\.?$/, "").replace(/\.$/, "");
}

const DOMAIN_REGEX =
  /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,63}$/;

export function isValidDomain(value = "") {
  return DOMAIN_REGEX.test(value);
}

export function sanitizePublicKey(value = "") {
  return String(value)
    .replace(/-----BEGIN [^-]+-----/gi, "")
    .replace(/-----END [^-]+-----/gi, "")
    .replace(/["']/g, "")
    .replace(/\s+/g, "");
}

export function isValidPublicKey(value = "") {
  return /^[A-Za-z0-9+/]+=*$/.test(value) && value.length >= 40;
}

const PUBLIC_KEY_LENGTH_RANGES = {
  rsa: { min: 200, max: 800 },
  ed25519: { min: 40, max: 60 },
};

export function getPublicKeyLengthWarning(keyType = "rsa", sanitizedKey = "") {
  const range =
    PUBLIC_KEY_LENGTH_RANGES[keyType] || PUBLIC_KEY_LENGTH_RANGES.rsa;

  if (sanitizedKey.length < range.min || sanitizedKey.length > range.max) {
    return `Public key length (${sanitizedKey.length} characters) is outside the expected range for ${keyType.toUpperCase()} (${range.min}-${range.max}) — check that the key was pasted complete and undamaged.`;
  }

  return null;
}

export function buildDkimHostname(selector, domain) {
  return `${selector}._domainkey.${domain}`;
}

export function buildDkimTxtValue({
  keyType = "rsa",
  algorithm = "",
  publicKey = "",
} = {}) {
  const parts = ["v=DKIM1", `k=${keyType || "rsa"}`];

  if (algorithm) {
    parts.push(`h=${algorithm}`);
  }

  parts.push(`p=${publicKey}`);

  return parts.join("; ");
}

const MAX_TXT_LENGTH = 255;

export function chunkTxtValue(value = "", chunkSize = MAX_TXT_LENGTH) {
  const text = String(value);

  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
}

export function buildFullRecordText({ hostname, type, value }) {
  if (type === "TXT") {
    const quoted = chunkTxtValue(value)
      .map((chunk) => `"${chunk}"`)
      .join(" ");

    return `${hostname}\tIN\tTXT\t${quoted}`;
  }

  return `${hostname}\tIN\tCNAME\t${value}`;
}

function buildLengthStatus(length) {
  return length > MAX_TXT_LENGTH ? "warning" : "success";
}

export function buildDkimRecord({
  provider = "m365",
  domain = "",
  initialDomain = "",
  selector = "",
  publicKey = "",
  algorithm = "",
  keyType = "rsa",
} = {}) {
  const selectedProvider = getDkimProvider(provider);
  const normalizedDomain = normalizeDomain(domain);

  const warnings = [];
  const records = [];

  let status = "success";

  const flagWarning = (message) => {
    warnings.push(message);

    if (status !== "error") {
      status = "warning";
    }
  };

  const flagError = (message) => {
    warnings.push(message);
    status = "error";
  };

  if (!normalizedDomain) {
    flagWarning("Enter a domain name.");
  } else if (!isValidDomain(normalizedDomain)) {
    flagError("The domain name looks invalid.");
  }

  if (selectedProvider.mode === "m365") {
    const normalizedInitial = normalizeInitialDomain(initialDomain);

    if (!normalizedInitial) {
      flagWarning("Enter the initial domain (the onmicrosoft.com domain).");
    }

    if (
      normalizedDomain &&
      isValidDomain(normalizedDomain) &&
      normalizedInitial
    ) {
      const dashedDomain = normalizedDomain.replace(/\./g, "-");

      ["selector1", "selector2"].forEach((sel) => {
        const hostname = buildDkimHostname(sel, normalizedDomain);
        const value = `${sel}-${dashedDomain}._domainkey.${normalizedInitial}.onmicrosoft.com`;

        records.push({
          selector: sel,
          hostname,
          type: "CNAME",
          value,
          length: value.length,
          lengthStatus: "success",
          fullRecord: buildFullRecordText({ hostname, type: "CNAME", value }),
        });
      });
    }
  } else {
    const rawSelector = String(selector || "").trim();
    const normalizedSelector = normalizeSelector(
      selector || selectedProvider.defaultSelector || "",
    );

    if (!normalizedSelector) {
      flagWarning("Enter a selector.");
    } else if (
      rawSelector &&
      normalizeSelector(rawSelector) !== rawSelector.toLowerCase()
    ) {
      flagWarning(
        `Selector "${rawSelector}" contains characters not allowed in a DNS hostname and was changed to "${normalizedSelector}". Check that this still matches the selector configured at the provider.`,
      );
    }

    const sanitizedKey = sanitizePublicKey(publicKey);
    const keyProvided = Boolean(sanitizedKey);
    let keyValid = false;

    if (!keyProvided) {
      flagWarning(
        "Enter the public key (obtain it from the mail provider or with openssl).",
      );
    } else {
      keyValid = isValidPublicKey(sanitizedKey);

      if (!keyValid) {
        flagError("The public key does not look like a valid base64 value.");
      } else {
        const effectiveKeyTypeForCheck =
          selectedProvider.mode === "custom" ? keyType || "rsa" : "rsa";
        const lengthWarning = getPublicKeyLengthWarning(
          effectiveKeyTypeForCheck,
          sanitizedKey,
        );

        if (lengthWarning) {
          flagWarning(lengthWarning);
        }
      }
    }

    const effectiveKeyType =
      selectedProvider.mode === "custom" ? keyType || "rsa" : "rsa";
    const effectiveAlgorithm =
      selectedProvider.mode === "custom" ? algorithm : "";

    if (
      normalizedDomain &&
      isValidDomain(normalizedDomain) &&
      normalizedSelector
    ) {
      const hostname = buildDkimHostname(normalizedSelector, normalizedDomain);

      const txtValue = buildDkimTxtValue({
        keyType: effectiveKeyType,
        algorithm: effectiveAlgorithm,
        publicKey: keyValid ? sanitizedKey : sanitizedKey || "PUBLIC_KEY_HIER",
      });

      records.push({
        selector: normalizedSelector,
        hostname,
        type: "TXT",
        value: txtValue,
        length: txtValue.length,
        lengthStatus: buildLengthStatus(txtValue.length),
        fullRecord: buildFullRecordText({
          hostname,
          type: "TXT",
          value: txtValue,
        }),
      });
    }
  }

  records.forEach((record) => {
    if (record.lengthStatus === "warning") {
      flagWarning(
        `${record.hostname}: the record value is ${record.length} characters, longer than ${MAX_TXT_LENGTH} per DNS character string. The record below was therefore split automatically into multiple quoted strings ("chunk1" "chunk2" ...) — paste it exactly like that, do not split it differently by hand.`,
      );
    }
  });

  return {
    type: "dkimBuilder",
    provider: selectedProvider.label,
    providerMode: selectedProvider.mode,
    domain: normalizedDomain,
    records,
    warnings,
    status,
    notes: selectedProvider.notes || [],
    combinedRecordText: records.map((record) => record.fullRecord).join("\n\n"),
  };
}

export async function runDkimBuilderTool(tool, inputValues) {
  return buildDkimRecord(inputValues);
}
