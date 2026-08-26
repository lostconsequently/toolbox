import { api } from "../../services/api";

export const commonPortPresets = [
  {
    label: "HTTPS (443)",
    value: "443",
    service: "HTTPS",
  },
  {
    label: "HTTP (80)",
    value: "80",
    service: "HTTP",
  },
  {
    label: "RDP (3389)",
    value: "3389",
    service: "RDP",
  },
  {
    label: "SMB (445)",
    value: "445",
    service: "SMB",
  },
  {
    label: "DNS (53)",
    value: "53",
    service: "DNS",
  },
  {
    label: "SSH (22)",
    value: "22",
    service: "SSH",
  },
  {
    label: "FTP (21)",
    value: "21",
    service: "FTP",
  },
  {
    label: "SMTP (25)",
    value: "25",
    service: "SMTP",
  },
  {
    label: "SMTP TLS (587)",
    value: "587",
    service: "SMTP TLS",
  },
  {
    label: "IMAPS (993)",
    value: "993",
    service: "IMAPS",
  },
  {
    label: "POP3S (995)",
    value: "995",
    service: "POP3S",
  },
  {
    label: "SQL Server (1433)",
    value: "1433",
    service: "SQL Server",
  },
  {
    label: "MySQL (3306)",
    value: "3306",
    service: "MySQL",
  },
  {
    label: "OpenEdge (3000)",
    value: "3000",
    service: "OpenEdge",
  },
  {
    label: "OpenEdge (3040)",
    value: "3040",
    service: "OpenEdge",
  },
  {
    label: "Webserver alt (8080)",
    value: "8080",
    service: "HTTP alt / UniFi inform",
  },
  {
    label: "Webserver alt (8443)",
    value: "8443",
    service: "HTTPS alt / UniFi UI",
  },
  {
    label: "SonicWall SSL-VPN (4433)",
    value: "4433",
    service: "SonicWall SSL-VPN",
  },
  {
    label: "FortiGate SSL-VPN (10443)",
    value: "10443",
    service: "FortiGate SSL-VPN",
  },
  {
    label: "OpenVPN TCP (1194)",
    value: "1194",
    service: "OpenVPN (TCP)",
  },
];

export function normalizeHost(value = "") {
  let host = String(value).trim();

  if (host.startsWith("http://") || host.startsWith("https://")) {
    try {
      host = new URL(host).hostname;
    } catch {}
  }

  return host;
}

export function normalizePort(value = "") {
  return String(value).trim();
}

export function isValidPort(value = "") {
  if (!/^\d{1,5}$/.test(String(value).trim())) {
    return false;
  }

  const port = Number(value);

  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

export function getPortService(portValue) {
  const match = commonPortPresets.find(
    (preset) => preset.value === String(portValue),
  );

  return match?.service || "Custom";
}

const errorCodeExplanations = {
  TIMEOUT:
    "No response within the timeout. Often a sign that a firewall silently drops the traffic instead of refusing it.",
  ECONNREFUSED:
    "The connection was actively refused. The network path is open, but nothing is listening on this port (or a firewall issues an active reject).",
  ENOTFOUND:
    "The hostname could not be resolved. This is a DNS problem, not a port or firewall problem.",
  EHOSTUNREACH:
    "The host is unreachable. Possibly a routing problem between you and the target.",
  ENETUNREACH:
    "The network is unreachable. Check your own network connection or routing.",
  ECONNRESET:
    "The connection was reset after it had been established. This can indicate a firewall terminating the session afterwards.",
};

export function getErrorCodeExplanation(errorCode) {
  if (!errorCode) {
    return null;
  }

  return errorCodeExplanations[errorCode] || null;
}

export function getPortTip(portValue) {
  if (String(portValue) === "25") {
    return "Note: many providers and Microsoft 365 block outbound traffic on port 25 by default.";
  }

  return null;
}

export async function checkPortStatus({ host, port }) {
  const normalizedHost = normalizeHost(host);

  const normalizedPort = normalizePort(port);

  if (!normalizedHost) {
    throw new Error("No host or IP provided.");
  }

  if (!isValidPort(normalizedPort)) {
    throw new Error("Invalid port. Use a port between 1 and 65535.");
  }

  const response = await api.checkPort({
    host: normalizedHost,
    port: normalizedPort,
  });

  return {
    type: "portCheck",
    host: response.host,
    port: response.port,
    service: getPortService(response.port),
    open: response.open,
    latencyMs: response.latencyMs,
    errorCode: response.errorCode,
    banner: response.banner || null,
  };
}

export const MAX_BULK_PORTS = 25;

export function parsePortList(value = "") {
  const seen = new Set();

  return String(value)
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }

      seen.add(item);

      return true;
    })
    .slice(0, MAX_BULK_PORTS);
}

export const m365PortBundle = "443,587,993,995";

export async function runPortTool(tool, inputValues) {
  const host =
    inputValues.host ||
    inputValues.ip ||
    inputValues.hostname ||
    inputValues.input ||
    "";

  const port = inputValues.port || "443";

  return checkPortStatus({
    host,
    port,
  });
}
