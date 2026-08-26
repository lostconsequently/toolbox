import { useEffect, useRef, useState } from "react";
import { Play, Square, Trash2 } from "lucide-react";

import ToolFormLayout from "./shared/ToolFormLayout";
import FormSection from "./shared/FormSection";
import FormField from "./shared/FormField";
import SelectField from "./shared/SelectField";
import CheckboxOption from "./shared/CheckboxOption";
import InfoTile from "./shared/InfoTile";
import ResultGrid from "./shared/ResultGrid";
import StatusBadge from "./shared/StatusBadge";
import StatusMessage from "./shared/StatusMessage";
import ActionRow from "./shared/ActionRow";
import ActionButton from "./shared/ActionButton";
import CopyButton from "./shared/CopyButton";

import {
  PING_COUNT_OPTIONS,
  PING_TIMEOUT_OPTIONS,
  PING_SIZE_OPTIONS,
  MAX_BULK_HOSTS,
  normalizeHost,
  buildPingStreamUrl,
  getPingStatus,
  formatReplyLine,
  formatStatisticsBlock,
  parseHostList,
  runBulkPingHost,
} from "../../core/toolEngines/pingEngine";

const AUTO_SCROLL_THRESHOLD_PX = 32;

const tableHeaderStyle = {
  background: "var(--primary)",
  color: "#ffffff",
  border: "1px solid var(--border)",
  padding: "8px",
  textAlign: "left",
  fontSize: "13px",
};

const tableCellStyle = {
  border: "1px solid var(--border)",
  padding: "8px",
  color: "var(--text)",
  verticalAlign: "top",
  fontSize: "13px",
};

function computeClientSummary(samples, sent) {
  const received = samples.length;
  const lost = sent - received;
  const lossPercent = sent > 0 ? Math.round((lost / sent) * 100) : 0;

  const minMs = received ? Math.min(...samples) : null;
  const maxMs = received ? Math.max(...samples) : null;
  const avgMs = received
    ? Math.round(samples.reduce((total, value) => total + value, 0) / received)
    : null;

  let jitterMs = null;

  if (received > 1) {
    const diffs = [];

    for (let i = 1; i < samples.length; i += 1) {
      diffs.push(Math.abs(samples[i] - samples[i - 1]));
    }

    jitterMs =
      Math.round(
        (diffs.reduce((total, value) => total + value, 0) / diffs.length) * 10,
      ) / 10;
  }

  return { sent, received, lost, lossPercent, minMs, maxMs, avgMs, jitterMs };
}

export default function PingToolForm({ compactMode = false }) {
  const [host, setHost] = useState("");
  const [countOption, setCountOption] = useState("4");
  const [continuous, setContinuous] = useState(false);
  const [timeoutMs, setTimeoutMs] = useState("4000");
  const [size, setSize] = useState("32");
  const [dnsLookup, setDnsLookup] = useState(true);
  const [ipv4, setIpv4] = useState(false);
  const [ipv6, setIpv6] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [lines, setLines] = useState([]);
  const [startInfo, setStartInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  const [statusText, setStatusText] = useState(
    "Enter a hostname or IP address to ping.",
  );

  const eventSourceRef = useRef(null);
  const samplesRef = useRef([]);
  const sentRef = useRef(0);
  const resolvedIpRef = useRef("");
  const sizeRef = useRef(32);
  const outputRef = useRef(null);
  const stickToBottomRef = useRef(true);

  const [bulkHosts, setBulkHosts] = useState("");
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkStatus, setBulkStatus] = useState(
    `Enter multiple hosts (comma or newline separated) to ping them all. At most ${MAX_BULK_HOSTS} hosts per check.`,
  );
  const bulkCancelRef = useRef(false);

  const BULK_CONCURRENCY = 4;

  const normalizedHost = normalizeHost(host);

  const isEffectivelyContinuous = continuous || countOption === "unlimited";

  const pingStatus = getPingStatus(summary || {});

  useEffect(() => {
    if (ipv4 && ipv6) {
      setIpv6(false);
    }
  }, [ipv4, ipv6]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current || !outputRef.current) return;

    outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [lines]);

  const handleOutputScroll = () => {
    const el = outputRef.current;

    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    stickToBottomRef.current = distanceFromBottom < AUTO_SCROLL_THRESHOLD_PX;
  };

  const appendLines = (newLines) => {
    setLines((prev) => [...prev, ...newLines]);
  };

  const closeStream = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  };

  const start = () => {
    if (!normalizedHost) {
      setStatusText("No hostname or IP address provided.");
      return;
    }

    if (isRunning) return;

    setLines([]);
    setStartInfo(null);
    setSummary(null);
    samplesRef.current = [];
    sentRef.current = 0;
    resolvedIpRef.current = normalizedHost;
    sizeRef.current = Number(size);
    stickToBottomRef.current = true;
    setIsRunning(true);
    setStatusText(
      isEffectivelyContinuous
        ? "Continuous ping started..."
        : "Running ping...",
    );

    const url = buildPingStreamUrl({
      host: normalizedHost,
      countOption,
      continuous,
      timeoutMs,
      size,
      dnsLookup,
      ipv4,
      ipv6,
    });

    const source = new EventSource(url);

    eventSourceRef.current = source;

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "start") {
        resolvedIpRef.current = data.resolvedIp;

        setStartInfo({
          host: data.host,
          resolvedIp: data.resolvedIp,
          reverseHostname: data.reverseHostname,
          packetSize: data.packetSize,
        });

        appendLines([
          `Pinging ${data.host} [${data.resolvedIp}] with ${data.packetSize} bytes of data:`,
        ]);

        return;
      }

      if (data.type === "reply") {
        if (data.success) {
          samplesRef.current.push(data.timeMs);
        }

        sentRef.current += 1;

        appendLines([
          formatReplyLine({
            resolvedIp: resolvedIpRef.current,
            size: sizeRef.current,
            event: data,
          }),
        ]);

        return;
      }

      if (data.type === "summary") {
        setSummary(data);
        appendLines(
          formatStatisticsBlock({
            resolvedIp: resolvedIpRef.current,
            summary: data,
          }),
        );

        return;
      }

      if (data.type === "error") {
        appendLines([`Error: ${data.message}`]);
        setStatusText(data.message);
        setIsRunning(false);
        closeStream();

        return;
      }

      if (data.type === "autostopped") {
        appendLines([data.message]);
        setStatusText(data.message);

        return;
      }

      if (data.type === "done") {
        setIsRunning(false);
        setStatusText((current) =>
          current && current.includes("Stopped automatically")
            ? current
            : "Done.",
        );
        closeStream();
      }
    };

    source.onerror = () => {
      if (eventSourceRef.current !== source) return;

      appendLines(["The connection to the server was lost unexpectedly."]);
      setStatusText("Connection lost.");
      setIsRunning(false);
      closeStream();
    };
  };

  const stop = () => {
    closeStream();
    setIsRunning(false);

    const clientSummary = computeClientSummary(
      samplesRef.current,
      sentRef.current,
    );

    setSummary(clientSummary);
    appendLines(["Stopped by the user."]);
    appendLines(
      formatStatisticsBlock({
        resolvedIp: resolvedIpRef.current,
        summary: clientSummary,
      }),
    );
    setStatusText("Ping stopped.");
  };

  const clearOutput = () => {
    if (isRunning) return;

    setLines([]);
    setStartInfo(null);
    setSummary(null);
    setStatusText("Enter a hostname or IP address to ping.");
  };

  const runBulkPing = async () => {
    const hosts = parseHostList(bulkHosts);

    if (!hosts.length) {
      setBulkResults([]);
      setBulkStatus("Enter at least one valid host or IP address.");
      return;
    }

    bulkCancelRef.current = false;
    setBulkRunning(true);
    setBulkResults([]);
    setBulkStatus(`0 of ${hosts.length} hosts checked.`);

    const collected = new Array(hosts.length).fill(null);
    let completedCount = 0;
    let nextIndex = 0;

    const worker = async () => {
      while (true) {
        if (bulkCancelRef.current) return;

        const index = nextIndex;
        nextIndex += 1;

        if (index >= hosts.length) return;

        const hostResult = await runBulkPingHost(hosts[index]);

        collected[index] = hostResult;
        completedCount += 1;
        setBulkResults(collected.filter(Boolean));
        setBulkStatus(`${completedCount} of ${hosts.length} hosts checked.`);
      }
    };

    const workerCount = Math.min(BULK_CONCURRENCY, hosts.length);

    await Promise.all(Array.from({ length: workerCount }, worker));

    setBulkRunning(false);

    if (bulkCancelRef.current) {
      setBulkStatus(
        `Cancelled after ${completedCount} of ${hosts.length} hosts.`,
      );
      return;
    }

    const reachableCount = collected.filter(
      (entry) => entry && entry.status !== "error",
    ).length;

    setBulkStatus(
      `Done: ${reachableCount} of ${hosts.length} hosts reachable.`,
    );
  };

  const cancelBulkPing = () => {
    bulkCancelRef.current = true;
  };

  const bulkSummaryText = bulkResults
    .map((entry) =>
      entry.status === "error"
        ? `${entry.host} - error (${entry.error})`
        : `${entry.host} (${entry.resolvedIp}) - ${entry.label}, ${entry.lossPercent}% loss, gem. ${entry.avgMs ?? "-"} ms`,
    )
    .join("\n");

  const outputText = lines.join("\n");

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Ping Tool"
        description="Test the reachability and latency of a host - internet, VPN, printer, firewall, Microsoft 365 and general network diagnostics."
        compactMode={compactMode}
      >
        <FormField
          label="Hostname or IP address"
          value={host}
          onChange={setHost}
          placeholder="For example 8.8.8.8 or server01.local"
          compactMode={compactMode}
          mono
          disabled={isRunning}
        />

        <div
          style={{
            marginTop: "10px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "10px",
          }}
        >
          <SelectField
            label="Ping count"
            value={countOption}
            onChange={setCountOption}
            options={PING_COUNT_OPTIONS}
            compactMode={compactMode}
          />

          <div>
            <SelectField
              label="Timeout"
              value={timeoutMs}
              onChange={setTimeoutMs}
              options={PING_TIMEOUT_OPTIONS}
              compactMode={compactMode}
            />
            <div
              style={{
                marginTop: "4px",
                fontSize: "11px",
                color: "var(--subtle)",
              }}
            >
              On Linux/macOS servers this may be rounded to whole seconds.
            </div>
          </div>

          <SelectField
            label="Packet size"
            value={size}
            onChange={setSize}
            options={PING_SIZE_OPTIONS}
            compactMode={compactMode}
          />
        </div>

        <div
          style={{
            marginTop: "12px",
            display: "flex",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <CheckboxOption
            label="Continuous ping (until stopped)"
            checked={continuous}
            onChange={setContinuous}
            compactMode={compactMode}
          />

          <CheckboxOption
            label="Show DNS lookup"
            checked={dnsLookup}
            onChange={setDnsLookup}
            compactMode={compactMode}
          />

          <CheckboxOption
            label="Force IPv4"
            checked={ipv4}
            onChange={setIpv4}
            compactMode={compactMode}
          />

          <CheckboxOption
            label="Force IPv6"
            checked={ipv6}
            onChange={setIpv6}
            compactMode={compactMode}
          />
        </div>

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={start}
            icon={<Play size={14} />}
            variant="primary"
            compactMode={compactMode}
            disabled={isRunning || !normalizedHost}
            title="Start ping"
          >
            {isRunning ? "Working..." : "Start ping"}
          </ActionButton>

          <ActionButton
            onClick={stop}
            icon={<Square size={14} />}
            variant="danger"
            compactMode={compactMode}
            disabled={!isRunning}
            title="Stop ping"
          >
            Stop
          </ActionButton>

          <ActionButton
            onClick={clearOutput}
            icon={<Trash2 size={14} />}
            variant="secondary"
            compactMode={compactMode}
            disabled={isRunning || lines.length === 0}
            title="Clear output"
          >
            Clear
          </ActionButton>
        </ActionRow>

        <StatusMessage
          status={isRunning ? "neutral" : summary ? "success" : "neutral"}
          compactMode={compactMode}
        >
          {statusText}
        </StatusMessage>
      </FormSection>

      <FormSection title="Live output" compactMode={compactMode}>
        <div
          ref={outputRef}
          onScroll={handleOutputScroll}
          style={{
            background: "#0b1120",
            color: "#d1fae5",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "10px",
            fontFamily: "var(--mono, monospace)",
            fontSize: compactMode ? "12px" : "13px",
            lineHeight: 1.5,
            height: compactMode ? "220px" : "300px",
            overflowY: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {lines.length === 0
            ? "No output yet. Click “Start ping”."
            : outputText}
        </div>

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={outputText}
            label="Copy output"
            copiedLabel="Output copied"
            compactMode={compactMode}
            variant="secondary"
          />
        </ActionRow>
      </FormSection>

      <FormSection title="Result" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Status"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={pingStatus.label}
                status={pingStatus.status}
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Hostname"
            value={startInfo?.host || normalizedHost || "Not filled in"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Resolved IP"
            value={startInfo?.resolvedIp || "Not known yet"}
          />

          {startInfo?.reverseHostname && (
            <InfoTile
              compactMode={compactMode}
              label="Reverse DNS"
              value={startInfo.reverseHostname}
            />
          )}

          <InfoTile
            compactMode={compactMode}
            label="Average latency"
            value={
              summary?.avgMs !== null && summary?.avgMs !== undefined
                ? `${summary.avgMs} ms`
                : "Not available"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Packet loss"
            value={summary ? `${summary.lossPercent}%` : "Not available"}
            color={summary && summary.lossPercent > 0 ? "#dc2626" : undefined}
          />

          <InfoTile
            compactMode={compactMode}
            label="Min latency"
            value={
              summary?.minMs !== null && summary?.minMs !== undefined
                ? `${summary.minMs} ms`
                : "Not available"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Max latency"
            value={
              summary?.maxMs !== null && summary?.maxMs !== undefined
                ? `${summary.maxMs} ms`
                : "Not available"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Jitter"
            value={
              summary?.jitterMs !== null && summary?.jitterMs !== undefined
                ? `${summary.jitterMs} ms`
                : "Not available"
            }
          />
        </ResultGrid>
      </FormSection>

      <FormSection
        title="Bulk ping"
        description={`Ping several hosts at once with a short, fixed check (4 pings per host). Useful for quickly seeing which servers, printers or sites are reachable. At most ${MAX_BULK_HOSTS} hosts per check.`}
        compactMode={compactMode}
      >
        <FormField
          label="Hosts (comma or newline separated)"
          value={bulkHosts}
          onChange={setBulkHosts}
          placeholder={"8.8.8.8, server01.example.local, printer01"}
          compactMode={compactMode}
          mono
          textarea
          rows={3}
        />

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={runBulkPing}
            icon={<Play size={14} />}
            variant="primary"
            compactMode={compactMode}
            disabled={bulkRunning}
            title="Ping all listed hosts"
          >
            {bulkRunning ? "Working..." : "Ping alle hosts"}
          </ActionButton>

          <ActionButton
            onClick={cancelBulkPing}
            icon={<Square size={14} />}
            variant="danger"
            compactMode={compactMode}
            disabled={!bulkRunning}
            title="Cancel bulk ping"
          >
            Stop
          </ActionButton>

          {bulkResults.length > 0 && (
            <CopyButton
              value={bulkSummaryText}
              label="Copy all results"
              copiedLabel="Copied"
              compactMode={compactMode}
              variant="secondary"
            />
          )}
        </ActionRow>

        <StatusMessage status="neutral" compactMode={compactMode}>
          {bulkStatus}
        </StatusMessage>

        {bulkResults.length > 0 && (
          <div style={{ marginTop: "12px", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Host</th>
                  <th style={tableHeaderStyle}>Resolved IP</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Avg. latency</th>
                  <th style={tableHeaderStyle}>Packet loss</th>
                </tr>
              </thead>

              <tbody>
                {bulkResults.map((entry) => (
                  <tr key={entry.host}>
                    <td style={tableCellStyle}>{entry.host}</td>
                    <td style={tableCellStyle}>{entry.resolvedIp || "-"}</td>
                    <td style={tableCellStyle}>
                      <StatusBadge
                        compactMode={compactMode}
                        label={entry.label}
                        status={entry.status}
                      />
                    </td>
                    <td style={tableCellStyle}>
                      {entry.avgMs !== null && entry.avgMs !== undefined
                        ? `${entry.avgMs} ms`
                        : "-"}
                    </td>
                    <td style={tableCellStyle}>
                      {entry.lossPercent !== undefined
                        ? `${entry.lossPercent}%`
                        : entry.error || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>
    </ToolFormLayout>
  );
}
