import { api } from "../../services/api";

export const dnsPropagationRecordTypes = [
  {
    label: "A",
    value: "A",
  },
  {
    label: "AAAA",
    value: "AAAA",
  },
  {
    label: "CNAME",
    value: "CNAME",
  },
  {
    label: "MX",
    value: "MX",
  },
  {
    label: "TXT",
    value: "TXT",
  },
  {
    label: "NS",
    value: "NS",
  },
  {
    label: "SOA",
    value: "SOA",
  },
  {
    label: "CAA",
    value: "CAA",
  },
  {
    label: "SRV",
    value: "SRV",
  },
  {
    label: "PTR",
    value: "PTR",
  },
];

export function normalizeDnsName(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function isPlainIpv4(value) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
}

function isPlainIpv6(value) {
  return (
    value.includes(":") && !value.includes(".") && /^[0-9a-f:]+$/i.test(value)
  );
}

export function toReverseDnsName(value) {
  if (isPlainIpv4(value)) {
    return `${value.split(".").reverse().join(".")}.in-addr.arpa`;
  }

  if (isPlainIpv6(value)) {
    const groups = value.split(":");

    if (groups.includes("") || groups.length !== 8) {
      return value;
    }

    const nibbles = groups
      .map((group) => group.padStart(4, "0"))
      .join("")
      .split("")
      .reverse()
      .join(".");

    return `${nibbles}.ip6.arpa`;
  }

  return value;
}

export async function lookupDnsPropagation({
  name = "",
  recordType = "A",
  expectedValue = "",
  customResolver = "",
} = {}) {
  const trimmedName = normalizeDnsName(name);

  if (!trimmedName) {
    throw new Error("Enter a domain or hostname.");
  }

  const normalizedName =
    recordType === "PTR" ? toReverseDnsName(trimmedName) : trimmedName;

  return api.lookupDnsPropagation({
    name: normalizedName,
    recordType,
    expectedValue,
    customResolver,
  });
}

export async function runDnsPropagationTool(tool, inputValues) {
  return lookupDnsPropagation(inputValues);
}
