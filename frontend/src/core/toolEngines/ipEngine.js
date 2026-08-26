import { api } from "../../services/api";

export function normalizeIpInput(value = "") {
  return String(value).trim();
}

function isLikelyIpv4Address(value = "") {
  const ipv4Regex =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

  return ipv4Regex.test(value);
}

function isLikelyIpv6Address(value = "") {
  if (!value.includes(":")) {
    return false;
  }

  if (!/^[a-fA-F0-9:]+$/.test(value)) {
    return false;
  }

  if ((value.match(/::/g) || []).length > 1) {
    return false;
  }

  const hasDoubleColon = value.includes("::");
  const groups = value.split(":").filter((group) => group !== "");

  if (groups.some((group) => group.length > 4)) {
    return false;
  }

  const maxGroups = hasDoubleColon ? 7 : 8;
  const minGroups = hasDoubleColon ? 1 : 8;

  return groups.length >= minGroups && groups.length <= maxGroups;
}

export function isLikelyIpAddress(value = "") {
  const input = normalizeIpInput(value);

  return isLikelyIpv4Address(input) || isLikelyIpv6Address(input);
}

function classifyIpv4Special(value) {
  const parts = value.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  const [first, second] = parts;

  if (first === 127) {
    return "Loopback";
  }

  if (first === 10) {
    return "Privé (RFC1918)";
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return "Privé (RFC1918)";
  }

  if (first === 192 && second === 168) {
    return "Privé (RFC1918)";
  }

  if (first === 169 && second === 254) {
    return "Link-local (APIPA)";
  }

  if (first === 100 && second >= 64 && second <= 127) {
    return "Carrier-Grade NAT (CGNAT)";
  }

  if (first === 198 && (second === 18 || second === 19)) {
    return "Benchmarking (RFC 2544)";
  }

  return null;
}

function getFirstHextetValue(value) {
  const first = value.split(":")[0];

  if (first === "") {
    return 0;
  }

  const parsed = parseInt(first, 16);

  return Number.isNaN(parsed) ? null : parsed;
}

function classifyIpv6Special(value) {
  const lower = value.toLowerCase();

  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") {
    return "Loopback";
  }

  if (lower === "::" || lower === "0:0:0:0:0:0:0:0") {
    return "Unspecified address";
  }

  const firstHextet = getFirstHextetValue(lower);

  if (firstHextet === null) {
    return null;
  }

  if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) {
    return "Link-local";
  }

  if (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) {
    return "Unique Local Address (ULA)";
  }

  return null;
}

export function classifySpecialAddress(value = "") {
  const input = normalizeIpInput(value);

  if (input.includes(":")) {
    return classifyIpv6Special(input);
  }

  return classifyIpv4Special(input);
}

export function isPrivateIpv4(value = "") {
  const input = normalizeIpInput(value);

  return classifyIpv4Special(input) !== null;
}

const hostingProviderRules = [
  { pattern: /amazon|\baws\b/i, category: "Amazon Web Services (AWS)" },
  { pattern: /microsoft|azure/i, category: "Microsoft Azure" },
  { pattern: /google/i, category: "Google Cloud" },
  { pattern: /digitalocean/i, category: "DigitalOcean" },
  { pattern: /\bovh\b/i, category: "OVH" },
  { pattern: /hetzner/i, category: "Hetzner" },
  { pattern: /cloudflare/i, category: "Cloudflare" },
  { pattern: /linode|akamai/i, category: "Linode / Akamai" },
];

export function classifyHostingProvider(organization, isp) {
  const combined = `${organization || ""} ${isp || ""}`.trim();

  if (!combined) {
    return null;
  }

  return (
    hostingProviderRules.find((rule) => rule.pattern.test(combined))
      ?.category || null
  );
}

export async function lookupIpAddress(value) {
  const query = normalizeIpInput(value);

  if (!query) {
    throw new Error("No IP address provided.");
  }

  const specialLabel = classifySpecialAddress(query);

  if (specialLabel) {
    return {
      type: "ipLookup",
      valid: true,
      privateAddress: true,
      specialLabel,
      ip: query,
      ipType: query.includes(":") ? "IPv6" : "IPv4",
      country: "Not applicable",
      region: "Not applicable",
      city: "Not applicable",
      isp: `${specialLabel} address`,
      organization: "Not applicable",
      hostingProvider: null,
      asn: "Not applicable",
      domain: "Not applicable",
      timezone: "Not applicable",
      latitude: null,
      longitude: null,
    };
  }

  const response = await api.lookupIp(query);

  return {
    type: "ipLookup",
    valid: true,
    privateAddress: false,
    specialLabel: null,
    ip: response.ip,
    ipType: response.type,
    country: response.country,
    region: response.region,
    city: response.city,
    isp: response.isp,
    organization: response.organization,
    hostingProvider: classifyHostingProvider(
      response.organization,
      response.isp,
    ),
    asn: response.asn,
    domain: response.domain,
    timezone: response.timezone,
    latitude: response.latitude,
    longitude: response.longitude,
  };
}

export async function detectOwnIp() {
  let response;

  try {
    response = await fetch("https://ipwho.is/");
  } catch {
    throw new Error("Could not detect your own IP (network error).");
  }

  if (!response.ok) {
    throw new Error("Could not detect your own IP.");
  }

  const data = await response.json();

  if (data.success === false || !data.ip) {
    throw new Error(data.message || "Could not detect your own IP.");
  }

  return data.ip;
}

export async function runIpTool(tool, inputValues) {
  const input =
    inputValues.ip || inputValues.ipAddress || inputValues.input || "";

  return lookupIpAddress(input);
}
