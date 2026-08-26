import { api } from "../../services/api";

export function normalizeReputationInput(value = "") {
  let input = String(value).trim().toLowerCase();

  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      input = new URL(input).hostname;
    } catch {
      return input;
    }
  }

  input = input.split("/")[0];

  return input;
}

const DOMAIN_REGEX =
  /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,63}$/;

function isValidIpv4(value = "") {
  const parts = value.split(".");

  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      return false;
    }

    const number = Number(part);

    return number >= 0 && number <= 255;
  });
}

export function isValidReputationInput(value = "") {
  const input = normalizeReputationInput(value);

  if (!input) {
    return false;
  }

  return isValidIpv4(input) || DOMAIN_REGEX.test(input);
}

export function formatDate(value) {
  if (!value) {
    return "Not found";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

export async function lookupReputation(value) {
  const normalized = normalizeReputationInput(value);

  if (!normalized) {
    throw new Error("No IP, domain or host provided.");
  }

  if (!isValidReputationInput(normalized)) {
    throw new Error(
      "Invalid input. Use a public IP address, domain or hostname.",
    );
  }

  const response = await api.lookupReputation(normalized);

  return {
    type: "reputationCheck",
    input: response.input,
    inputType: response.inputType,
    resolvedIp: response.resolvedIp,
    resolvedIps: response.resolvedIps || [],
    privateAddress: response.privateAddress,
    reputation: response.reputation,
    ipInfo: response.ipInfo,
    whois: response.whois,
    ssl: response.ssl,
    spf: response.spf,
    dmarc: response.dmarc,
    cached: Boolean(response.cached),
  };
}

export async function runReputationTool(tool, inputValues) {
  const input =
    inputValues.query ||
    inputValues.domain ||
    inputValues.ip ||
    inputValues.input ||
    "";

  return lookupReputation(input);
}
