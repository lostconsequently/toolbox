import { api } from "../../services/api";

export function normalizeHost(value = "") {
  let host = String(value).trim();

  if (host.startsWith("http://") || host.startsWith("https://")) {
    try {
      host = new URL(host).hostname;
    } catch {}
  }

  return host;
}

export function daysUntil(date) {
  if (!date) {
    return null;
  }

  return Math.ceil((new Date(date) - new Date()) / 86400000);
}

export function formatDate(date) {
  if (!date) {
    return "Not found";
  }

  return new Date(date).toLocaleDateString();
}

export async function lookupSsl(host, port) {
  const normalized = normalizeHost(host);

  if (!normalized) {
    throw new Error("No host provided.");
  }

  const response = await api.lookupSsl(normalized, port);

  return {
    ...response,
    daysRemaining: daysUntil(response.validTo),
  };
}

export async function runSslTool(tool, inputValues) {
  return lookupSsl(
    inputValues.host || inputValues.input || "",
    inputValues.port,
  );
}
