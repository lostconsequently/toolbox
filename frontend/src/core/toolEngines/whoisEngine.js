import { api } from "../../services/api";

export function normalizeDomain(value = "") {
  let input = String(value).trim().toLowerCase();

  if (!input) {
    return "";
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      return new URL(input).hostname;
    } catch {
      return input;
    }
  }

  input = input.split("/")[0];
  input = input.split(":")[0];

  return input;
}

const DOMAIN_REGEX =
  /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,63}$/;

export function isValidDomain(value = "") {
  const domain = normalizeDomain(value);

  return DOMAIN_REGEX.test(domain);
}

const EPP_STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  ok: "OK",
  pendingcreate: "Create pending",
  pendingdelete: "Delete pending",
  pendingrenew: "Renew pending",
  pendingrestore: "Restore pending",
  pendingtransfer: "Transfer pending",
  pendingupdate: "Update pending",
  redemptionperiod: "Redemption period after deletion",
  autorenewperiod: "Auto-renew period",
  renewperiod: "Renew period",
  transferperiod: "Transfer period",
  clientdeleteprohibited: "Delete prohibited (registrar)",
  serverdeleteprohibited: "Delete prohibited (registry)",
  clienthold: "Domain on hold (registrar)",
  serverhold: "Domain on hold (registry)",
  clientrenewprohibited: "Renew prohibited (registrar)",
  serverrenewprohibited: "Renew prohibited (registry)",
  clienttransferprohibited: "Transfer prohibited (registrar)",
  servertransferprohibited: "Transfer prohibited (registry)",
  clientupdateprohibited: "Update prohibited (registrar)",
  serverupdateprohibited: "Update prohibited (registry)",
};

export function describeDomainStatus(code = "") {
  const key = String(code).toLowerCase().replace(/\s+/g, "");
  const label = EPP_STATUS_LABELS[key];

  return label ? `${code} (${label})` : code;
}

export function formatDate(value) {
  if (!value) {
    return "Not found";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function daysUntil(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const millisecondsPerDay = 86400000;

  return Math.ceil((date.getTime() - Date.now()) / millisecondsPerDay);
}

export async function lookupWhois(domain) {
  const normalized = normalizeDomain(domain);

  if (!normalized) {
    throw new Error("No domain provided.");
  }

  if (!isValidDomain(normalized)) {
    throw new Error("Invalid domain.");
  }

  const response = await api.lookupWhois(normalized);

  return {
    type: "whoisLookup",
    domain: response.domain,
    handle: response.handle,
    registrar: response.registrar,
    registrarIanaId: response.registrarIanaId,
    status: response.status || [],
    registered: response.registered,
    expires: response.expires,
    updated: response.updated,
    nameservers: response.nameservers || [],
    dnssec: Boolean(response.dnssec),
    daysUntilExpiration: daysUntil(response.expires),
  };
}

export async function runWhoisTool(tool, inputValues) {
  const domain =
    inputValues.domain || inputValues.host || inputValues.input || "";

  return lookupWhois(domain);
}
