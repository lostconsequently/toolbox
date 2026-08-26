export const spfPresets = [
  {
    label: "Microsoft 365",
    value: "include:spf.protection.outlook.com",
  },
  {
    label: "Google Workspace",
    value: "include:_spf.google.com",
  },
  {
    label: "SendGrid",
    value: "include:sendgrid.net",
  },
  {
    label: "Mailchimp",
    value: "include:servers.mcsv.net",
  },
  {
    label: "SMTP2GO",
    value: "include:spf.smtp2go.com",
  },
  {
    label: "Mailgun",
    value: "include:mailgun.org",
  },
  {
    label: "Amazon SES",
    value: "include:amazonses.com",
  },
  {
    label: "Postmark",
    value: "include:spf.postmarkapp.com",
  },
  {
    label: "SparkPost",
    value: "include:spf.sparkpostmail.com",
  },
  {
    label: "Mailjet",
    value: "include:spf.mailjet.com",
  },
  {
    label: "Zendesk",
    value: "include:mail.zendesk.com",
  },
  {
    label: "Freshdesk",
    value: "include:email.freshdesk.com",
  },
  {
    label: "Exact Online",
    value: "include:_spf.exactonline.nl",
  },
];

export const spfPolicies = [
  {
    label: "Hard fail -all",
    value: "-all",
  },
  {
    label: "Soft fail ~all",
    value: "~all",
  },
  {
    label: "Neutral ?all",
    value: "?all",
  },
];

export const m365SpfSubIncludes = [
  "spf-a.protection.outlook.com",
  "spf-b.protection.outlook.com",
  "spf-c.protection.outlook.com",
  "spf-d.protection.outlook.com",
  "spf-e.protection.outlook.com",
  "spf-f.protection.outlook.com",
];

export function isM365SpfInclude(mechanisms = []) {
  return mechanisms.some((m) => m === "include:spf.protection.outlook.com");
}

const MECHANISM_PRIORITY = {
  ip4: 0,
  ip6: 1,
  include: 2,
  a: 3,
  mx: 4,
  exists: 5,
  redirect: 6,
  other: 7,
};

function getMechanismRank(mechanism) {
  if (mechanism.startsWith("ip4:")) return MECHANISM_PRIORITY.ip4;
  if (mechanism.startsWith("ip6:")) return MECHANISM_PRIORITY.ip6;
  if (mechanism.startsWith("include:")) return MECHANISM_PRIORITY.include;
  if (mechanism.startsWith("a:") || mechanism === "a")
    return MECHANISM_PRIORITY.a;
  if (mechanism.startsWith("mx:") || mechanism === "mx")
    return MECHANISM_PRIORITY.mx;
  if (mechanism.startsWith("exists:")) return MECHANISM_PRIORITY.exists;
  if (mechanism.startsWith("redirect=")) return MECHANISM_PRIORITY.redirect;
  return MECHANISM_PRIORITY.other;
}

function sortMechanisms(mechanisms) {
  return [...mechanisms].sort(
    (a, b) => getMechanismRank(a) - getMechanismRank(b),
  );
}

export function normalizeSpfRecord(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

export function normalizeInput(value = "") {
  return String(value).trim().toLowerCase();
}

export function parseSpfRecord(value = "") {
  const normalized = normalizeSpfRecord(value);

  if (!normalized) {
    return {
      version: "v=spf1",
      mechanisms: [],
      policy: "-all",
      valid: true,
    };
  }

  const parts = normalized.split(" ");

  const version = parts[0]?.toLowerCase() === "v=spf1" ? "v=spf1" : "v=spf1";

  const mechanisms = [];
  let policy = "-all";

  parts.forEach((part) => {
    const item = part.trim();

    if (!item || item.toLowerCase() === "v=spf1") {
      return;
    }

    if (
      item === "-all" ||
      item === "~all" ||
      item === "?all" ||
      item === "+all"
    ) {
      policy = item;
      return;
    }

    mechanisms.push(item);
  });

  return {
    version,
    mechanisms,
    policy,
    valid: true,
  };
}

export function uniqueItems(items = []) {
  return Array.from(
    new Set(items.map((item) => String(item).trim()).filter(Boolean)),
  );
}

export function buildMechanism(type, value) {
  const normalized = normalizeInput(value);

  if (!normalized) {
    return "";
  }

  if (type === "include") {
    return `include:${normalized}`;
  }

  if (type === "ip4") {
    return `ip4:${normalized}`;
  }

  if (type === "ip6") {
    return `ip6:${normalized}`;
  }

  if (type === "a") {
    return `a:${normalized}`;
  }

  if (type === "mx") {
    return `mx:${normalized}`;
  }

  if (type === "exists") {
    return `exists:${normalized}`;
  }

  if (type === "redirect") {
    return `redirect=${normalized}`;
  }

  return normalized;
}

export function estimateLookupCount(mechanisms = []) {
  return mechanisms.filter((mechanism) => {
    return (
      mechanism.startsWith("include:") ||
      mechanism.startsWith("a:") ||
      mechanism === "a" ||
      mechanism.startsWith("mx:") ||
      mechanism === "mx" ||
      mechanism.startsWith("redirect=") ||
      mechanism.startsWith("exists:")
    );
  }).length;
}

export function getMechanismType(mechanism = "") {
  if (mechanism.startsWith("include:")) {
    return "Include";
  }

  if (mechanism.startsWith("ip4:")) {
    return "IPv4";
  }

  if (mechanism.startsWith("ip6:")) {
    return "IPv6";
  }

  if (mechanism.startsWith("a:") || mechanism === "a") {
    return "A record";
  }

  if (mechanism.startsWith("mx:") || mechanism === "mx") {
    return "MX record";
  }

  if (mechanism.startsWith("redirect=")) {
    return "Redirect";
  }

  if (mechanism.startsWith("exists:")) {
    return "Exists";
  }

  return "Other";
}

export function chunkTxtValue(value = "", chunkSize = 255) {
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

export function buildSpfRecord({
  existingRecord = "",
  includeDomains = "",
  ip4Addresses = "",
  ip6Addresses = "",
  aDomains = "",
  mxDomains = "",
  existsDomains = "",
  redirectDomain = "",
  preset = "",
  policy = "-all",
}) {
  const parsed = parseSpfRecord(existingRecord);

  const newMechanisms = [
    ...parsed.mechanisms,
    preset,
    ...parseMultiLineValues(includeDomains).map((item) =>
      buildMechanism("include", item),
    ),

    ...validateIp4Entries(ip4Addresses).valid.map((item) =>
      buildMechanism("ip4", item),
    ),

    ...validateIp6Entries(ip6Addresses).valid.map((item) =>
      buildMechanism("ip6", item),
    ),

    ...parseMultiLineValues(aDomains).map((item) => buildMechanism("a", item)),

    ...parseMultiLineValues(mxDomains).map((item) =>
      buildMechanism("mx", item),
    ),

    ...parseMultiLineValues(existsDomains).map((item) =>
      buildMechanism("exists", item),
    ),

    ...parseMultiLineValues(redirectDomain).map((item) =>
      buildMechanism("redirect", item),
    ),
  ];

  const mechanisms = sortMechanisms(uniqueItems(newMechanisms));

  const hasRedirect = mechanisms.some((m) => m.startsWith("redirect="));

  const activePolicy = policy || parsed.policy || "-all";

  const record = hasRedirect
    ? ["v=spf1", ...mechanisms].join(" ")
    : ["v=spf1", ...mechanisms, activePolicy].join(" ");

  const lookupCount = estimateLookupCount(mechanisms);

  const dnsLength = record.length;
  const lengthStatus =
    dnsLength > 510 ? "error" : dnsLength > 255 ? "warning" : "success";

  return {
    type: "spfBuilder",
    record,
    chunkedRecord: chunkTxtValue(record)
      .map((chunk) => `"${chunk}"`)
      .join(" "),
    mechanisms,
    policy: activePolicy,
    lookupCount,
    lookupStatus:
      lookupCount >= 10 ? "error" : lookupCount >= 8 ? "warning" : "success",
    dnsLength,
    lengthStatus,
    hasRedirect,
    hasM365Include: isM365SpfInclude(mechanisms),
  };
}

export async function runSpfTool(tool, inputValues) {
  return buildSpfRecord(inputValues);
}

function parseMultiLineValues(value = "") {
  return String(value)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidIp4Octets(parts) {
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

export function validateIp4Cidr(entry) {
  const trimmed = String(entry).trim();
  if (!trimmed) return false;

  const parts = trimmed.split("/");

  if (parts.length > 2) return false;

  const ip = parts[0];
  const ipParts = ip.split(".");
  if (!isValidIp4Octets(ipParts)) return false;

  if (parts.length === 2) {
    const prefix = Number(parts[1]);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  }

  return true;
}

export function validateIp4Entries(value = "") {
  const items = parseMultiLineValues(value);
  const valid = [];
  const invalid = [];

  items.forEach((item) => {
    if (validateIp4Cidr(item)) {
      valid.push(item);
    } else {
      invalid.push(item);
    }
  });

  return { valid, invalid };
}

function isValidIp6Address(value) {
  if (!value.includes(":")) return false;
  if (!/^[a-fA-F0-9:]+$/.test(value)) return false;
  if ((value.match(/::/g) || []).length > 1) return false;

  const hasDoubleColon = value.includes("::");
  const groups = value.split(":").filter((group) => group !== "");

  if (groups.some((group) => group.length > 4)) return false;

  const maxGroups = hasDoubleColon ? 7 : 8;
  const minGroups = hasDoubleColon ? 1 : 8;

  return groups.length >= minGroups && groups.length <= maxGroups;
}

export function validateIp6Cidr(entry) {
  const trimmed = String(entry).trim();
  if (!trimmed) return false;

  const parts = trimmed.split("/");

  if (parts.length > 2) return false;
  if (!isValidIp6Address(parts[0])) return false;

  if (parts.length === 2) {
    const prefix = Number(parts[1]);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) return false;
  }

  return true;
}

export function validateIp6Entries(value = "") {
  const items = parseMultiLineValues(value);
  const valid = [];
  const invalid = [];

  items.forEach((item) => {
    if (validateIp6Cidr(item)) {
      valid.push(item);
    } else {
      invalid.push(item);
    }
  });

  return { valid, invalid };
}
