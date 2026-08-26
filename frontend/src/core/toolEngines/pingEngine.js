import { API_BASE } from "../../services/api";

export const PING_COUNT_OPTIONS = [
  { label: "1 ping", value: "1" },
  { label: "4 pings", value: "4" },
  { label: "10 pings", value: "10" },
  { label: "20 pings", value: "20" },
  { label: "Unlimited", value: "unlimited" },
];

export const PING_TIMEOUT_OPTIONS = [
  { label: "1000 ms", value: "1000" },
  { label: "2000 ms", value: "2000" },
  { label: "4000 ms (default)", value: "4000" },
  { label: "8000 ms", value: "8000" },
];

export const PING_SIZE_OPTIONS = [
  { label: "32 bytes (default)", value: "32" },
  { label: "64 bytes", value: "64" },
  { label: "128 bytes", value: "128" },
  { label: "512 bytes", value: "512" },
  { label: "1024 bytes", value: "1024" },
  { label: "1472 bytes (max without fragmentation)", value: "1472" },
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

export function buildPingStreamUrl({
  host,
  countOption,
  continuous,
  timeoutMs,
  size,
  dnsLookup,
  ipv4,
  ipv6,
}) {
  const isUnlimited = countOption === "unlimited" || continuous;

  const params = new URLSearchParams({
    host,
    count: isUnlimited ? "unlimited" : String(countOption),
    continuous: String(isUnlimited),
    timeout: String(timeoutMs),
    size: String(size),
    dnsLookup: String(Boolean(dnsLookup)),
    ipv4: String(Boolean(ipv4)),
    ipv6: String(Boolean(ipv6)),
  });

  return `${API_BASE}/ping/stream?${params.toString()}`;
}

export function getPingStatus({ lossPercent, avgMs } = {}) {
  if (lossPercent === null || lossPercent === undefined) {
    return { status: "neutral", label: "Not run yet" };
  }

  if (lossPercent >= 50) {
    return { status: "error", label: "Unreachable" };
  }

  if (
    lossPercent > 0 ||
    (avgMs !== null && avgMs !== undefined && avgMs > 150)
  ) {
    return { status: "warning", label: "Erratic" };
  }

  return { status: "success", label: "Reachable" };
}

export function formatReplyLine({ resolvedIp, size, event }) {
  if (event.success) {
    const timeLabel = event.timeMs === 0 ? "<1" : event.timeMs;

    return `Reply from ${resolvedIp}: bytes=${size} time=${timeLabel}ms TTL=${event.ttl}`;
  }

  return "Request timed out.";
}

export function formatStatisticsBlock({ resolvedIp, summary }) {
  const lines = [
    "",
    `Ping statistics for ${resolvedIp}:`,
    `    Packets: Sent = ${summary.sent}, Received = ${summary.received}, Lost = ${summary.lost} (${summary.lossPercent}% loss),`,
  ];

  if (summary.received > 0) {
    lines.push(
      "Approximate round trip times in milli-seconds:",
      `    Minimum = ${summary.minMs}ms, Maximum = ${summary.maxMs}ms, Average = ${summary.avgMs}ms`,
    );
  }

  return lines;
}

export const MAX_BULK_HOSTS = 20;

export function parseHostList(value = "") {
  const seen = new Set();

  return String(value)
    .split(/[\s,;]+/)
    .map((item) => normalizeHost(item))
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }

      seen.add(item);

      return true;
    })
    .slice(0, MAX_BULK_HOSTS);
}

export function runBulkPingHost(host) {
  const url = buildPingStreamUrl({
    host,
    countOption: "4",
    continuous: false,
    timeoutMs: 4000,
    size: 32,
    dnsLookup: false,
    ipv4: false,
    ipv6: false,
  });

  return new Promise((resolve) => {
    let resolvedIp = null;
    const source = new EventSource(url);

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "start") {
        resolvedIp = data.resolvedIp;
      } else if (data.type === "summary") {
        source.close();
        resolve({ host, resolvedIp, ...getPingStatus(data), ...data });
      } else if (data.type === "error") {
        source.close();
        resolve({
          host,
          resolvedIp,
          status: "error",
          label: "Error",
          error: data.message,
        });
      } else if (data.type === "done") {
        source.close();
      }
    };

    source.onerror = () => {
      source.close();
      resolve({
        host,
        resolvedIp,
        status: "error",
        label: "Error",
        error: "The ping stream ended unexpectedly.",
      });
    };
  });
}

export async function runPingTool(tool, inputValues) {
  const host = normalizeHost(
    inputValues.host ||
      inputValues.ip ||
      inputValues.hostname ||
      inputValues.input ||
      "",
  );

  if (!host) {
    throw new Error("No host or IP provided.");
  }

  const url = buildPingStreamUrl({
    host,
    countOption: "4",
    continuous: false,
    timeoutMs: 4000,
    size: 32,
    dnsLookup: false,
    ipv4: false,
    ipv6: false,
  });

  return new Promise((resolve, reject) => {
    const lines = [];
    let resolvedIp = host;
    const source = new EventSource(url);

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "start") {
        resolvedIp = data.resolvedIp;
        lines.push(
          `Pinging ${data.host} [${resolvedIp}] with ${data.packetSize} bytes of data:`,
        );
      } else if (data.type === "reply") {
        lines.push(formatReplyLine({ resolvedIp, size: 32, event: data }));
      } else if (data.type === "summary") {
        lines.push(...formatStatisticsBlock({ resolvedIp, summary: data }));
      } else if (data.type === "error") {
        source.close();
        reject(new Error(data.message));
      } else if (data.type === "done") {
        source.close();
        resolve(lines.join("\n"));
      }
    };

    source.onerror = () => {
      source.close();
      reject(new Error("The ping stream ended unexpectedly."));
    };
  });
}
