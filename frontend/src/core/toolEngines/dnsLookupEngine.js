import { api } from "../../services/api";

export const dnsLookupRecordTypes = [
  { value: "A", label: "A", defaultChecked: true },
  { value: "AAAA", label: "AAAA", defaultChecked: false },
  { value: "CNAME", label: "CNAME", defaultChecked: false },
  { value: "MX", label: "MX", defaultChecked: true },
  { value: "TXT", label: "TXT", defaultChecked: true },
  { value: "NS", label: "NS", defaultChecked: false },
  { value: "SOA", label: "SOA", defaultChecked: false },
  { value: "CAA", label: "CAA", defaultChecked: false },
  { value: "SRV", label: "SRV", defaultChecked: false },
  { value: "PTR", label: "PTR", defaultChecked: false },
];

export const dnsLookupDefaultTypes = dnsLookupRecordTypes
  .filter((type) => type.defaultChecked)
  .map((type) => type.value);

export const dnsLookupM365Preset = ["MX", "TXT", "CNAME"];

export const dnsLookupResolvers = [
  { value: "backend", label: "Default (backend)" },
  { value: "google", label: "Google Public DNS" },
  { value: "cloudflare", label: "Cloudflare 1.1.1.1" },
  { value: "quad9", label: "Quad9" },
  { value: "opendns", label: "OpenDNS" },
  { value: "adguard", label: "AdGuard DNS" },
];

const CUSTOM_TYPE_PATTERN = /^[A-Z]{1,10}$/;

export function isValidCustomRecordType(value = "") {
  return CUSTOM_TYPE_PATTERN.test(String(value).trim().toUpperCase());
}

export function normalizeDnsLookupName(value = "") {
  let input = String(value).trim().toLowerCase();

  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      input = new URL(input).hostname;
    } catch {}
  }

  return input.split("/")[0].replace(/\.$/, "");
}

export async function lookupDnsRecords(
  name,
  selectedTypes,
  expectedValues = {},
  resolverId = "backend",
) {
  const normalized = normalizeDnsLookupName(name);

  if (!normalized) {
    throw new Error("No domain or hostname provided.");
  }

  if (!selectedTypes?.length) {
    throw new Error("Select at least one record type.");
  }

  return api.lookupDnsRecords(
    normalized,
    selectedTypes,
    expectedValues,
    resolverId,
  );
}

export async function runDnsLookupTool(tool, inputValues) {
  return lookupDnsRecords(
    inputValues.name || inputValues.domain || inputValues.input || "",
    inputValues.types || dnsLookupDefaultTypes,
    inputValues.expected || {},
    inputValues.resolver || "backend",
  );
}
