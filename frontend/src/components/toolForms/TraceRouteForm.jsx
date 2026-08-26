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
  TRACEROUTE_MAX_HOPS_OPTIONS,
  TRACEROUTE_TIMEOUT_OPTIONS,
  normalizeHost,
  buildTracerouteStreamUrl,
  formatHopLine,
} from "../../core/toolEngines/tracerouteEngine";

const AUTO_SCROLL_THRESHOLD_PX = 32;

export default function TraceRouteForm({ compactMode = false }) {
  const [host, setHost] = useState("");
  const [maxHops, setMaxHops] = useState("30");
  const [timeoutMs, setTimeoutMs] = useState("4000");
  const [dnsLookup, setDnsLookup] = useState(true);

  const [isRunning, setIsRunning] = useState(false);
  const [lines, setLines] = useState([]);
  const [startInfo, setStartInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  const [hopCount, setHopCount] = useState(0);
  const [respondingHops, setRespondingHops] = useState(0);
  const [statusText, setStatusText] = useState(
    "Enter a hostname or IP address to trace the route.",
  );

  const eventSourceRef = useRef(null);
  const outputRef = useRef(null);
  const stickToBottomRef = useRef(true);

  const normalizedHost = normalizeHost(host);

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

  const statusBadge = !summary
    ? { status: "neutral", label: "Not run yet" }
    : summary.reachedTarget
      ? { status: "success", label: "Target reached" }
      : { status: "warning", label: "Target not reached" };

  const start = () => {
    if (!normalizedHost || isRunning) {
      if (!normalizedHost) setStatusText("No hostname or IP address provided.");
      return;
    }

    setLines([]);
    setStartInfo(null);
    setSummary(null);
    setHopCount(0);
    setRespondingHops(0);
    stickToBottomRef.current = true;
    setIsRunning(true);
    setStatusText("Tracing the route...");

    const url = buildTracerouteStreamUrl({
      host: normalizedHost,
      maxHops,
      timeoutMs,
      dnsLookup,
    });

    const source = new EventSource(url);

    eventSourceRef.current = source;

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "start") {
        setStartInfo(data);
        appendLines([
          `Tracing route to ${data.host} [${data.resolvedIp}] over a maximum of ${data.maxHops} hops:`,
          "",
        ]);
        return;
      }

      if (data.type === "hop") {
        setHopCount((prev) => Math.max(prev, data.hopNumber));

        if (data.times.some((time) => time !== null)) {
          setRespondingHops((prev) => prev + 1);
        }

        appendLines([formatHopLine(data)]);
        return;
      }

      if (data.type === "summary") {
        setSummary(data);
        appendLines([
          "",
          data.reachedTarget
            ? "Trace complete."
            : "Trace not completed (target not reached within the maximum hops).",
        ]);
        return;
      }

      if (data.type === "error") {
        appendLines([`Error: ${data.message}`]);
        setStatusText(data.message);
        setIsRunning(false);
        closeStream();
        return;
      }

      if (data.type === "done") {
        setIsRunning(false);
        setStatusText("Done.");
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
    appendLines(["Stopped by the user."]);
    setStatusText("Traceroute stopped.");
  };

  const clearOutput = () => {
    if (isRunning) return;

    setLines([]);
    setStartInfo(null);
    setSummary(null);
    setHopCount(0);
    setRespondingHops(0);
    setStatusText("Enter a hostname or IP address to trace the route.");
  };

  const outputText = lines.join("\n");

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Traceroute"
        description="Follow the network path to a host, hop by hop - useful for seeing where a connection slows down or stalls (VPN, firewall, ISP routing)."
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
            label="Max. hops"
            value={maxHops}
            onChange={setMaxHops}
            options={TRACEROUTE_MAX_HOPS_OPTIONS}
            compactMode={compactMode}
          />

          <SelectField
            label="Timeout per hop"
            value={timeoutMs}
            onChange={setTimeoutMs}
            options={TRACEROUTE_TIMEOUT_OPTIONS}
            compactMode={compactMode}
          />
        </div>

        <div style={{ marginTop: "12px" }}>
          <CheckboxOption
            label="Show DNS lookup (hostnames per hop)"
            checked={dnsLookup}
            onChange={setDnsLookup}
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
            title="Start traceroute"
          >
            {isRunning ? "Working..." : "Start traceroute"}
          </ActionButton>

          <ActionButton
            onClick={stop}
            icon={<Square size={14} />}
            variant="danger"
            compactMode={compactMode}
            disabled={!isRunning}
            title="Stop traceroute"
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
          status={
            isRunning
              ? "neutral"
              : summary
                ? summary.reachedTarget
                  ? "success"
                  : "warning"
                : "neutral"
          }
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
            ? "No output yet. Click “Start traceroute”."
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
                label={statusBadge.label}
                status={statusBadge.status}
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

          <InfoTile
            compactMode={compactMode}
            label="Hop count"
            value={hopCount || "Not available"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Responding hops"
            value={
              hopCount ? `${respondingHops} / ${hopCount}` : "Not available"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Max hops configured"
            value={maxHops}
          />
        </ResultGrid>
      </FormSection>
    </ToolFormLayout>
  );
}
