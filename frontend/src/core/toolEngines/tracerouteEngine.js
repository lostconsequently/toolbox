import { API_BASE } from "../../services/api";
import { normalizeHost } from "./pingEngine";

export const TRACEROUTE_MAX_HOPS_OPTIONS = [
  { label: "10 hops", value: "10" },
  { label: "20 hops", value: "20" },
  { label: "30 hops (default)", value: "30" },
  { label: "64 hops", value: "64" },
];

export const TRACEROUTE_TIMEOUT_OPTIONS = [
  { label: "1000 ms", value: "1000" },
  { label: "2000 ms", value: "2000" },
  { label: "4000 ms (default)", value: "4000" },
  { label: "8000 ms", value: "8000" },
];

export { normalizeHost };

export function buildTracerouteStreamUrl({
  host,
  maxHops,
  timeoutMs,
  dnsLookup,
}) {
  const params = new URLSearchParams({
    host,
    maxHops: String(maxHops),
    timeout: String(timeoutMs),
    dnsLookup: String(Boolean(dnsLookup)),
  });

  return `${API_BASE}/traceroute/stream?${params.toString()}`;
}

export function formatHopLine(hop) {
  const timeLabels = hop.times.map((time) =>
    time === null ? "*" : `${time} ms`,
  );
  const hostLabel = hop.host || "Request timed out.";
  const hopLabel = String(hop.hopNumber).padStart(2, " ");

  return `${hopLabel}   ${timeLabels.join("   ")}   ${hostLabel}`;
}

export async function runTracerouteTool(tool, inputValues) {
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

  const url = buildTracerouteStreamUrl({
    host,
    maxHops: 30,
    timeoutMs: 4000,
    dnsLookup: false,
  });

  return new Promise((resolve, reject) => {
    const lines = [];
    const source = new EventSource(url);

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "start") {
        lines.push(
          `Tracing route to ${data.host} [${data.resolvedIp}] over a maximum of ${data.maxHops} hops:`,
        );
      } else if (data.type === "hop") {
        lines.push(formatHopLine(data));
      } else if (data.type === "summary") {
        lines.push(
          "",
          data.reachedTarget
            ? "Trace complete."
            : "Trace not completed (target not reached).",
        );
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
      reject(new Error("The traceroute stream ended unexpectedly."));
    };
  });
}
