import { useRef, useState } from "react";
import { RotateCcw, Search, Square } from "lucide-react";

import FormSection from "./shared/FormSection";
import FormField from "./shared/FormField";
import SelectField from "./shared/SelectField";
import ActionButton from "./shared/ActionButton";
import ToolFormLayout from "./shared/ToolFormLayout";
import ResultGrid from "./shared/ResultGrid";
import InfoTile from "./shared/InfoTile";
import StatusBadge from "./shared/StatusBadge";
import StatusMessage from "./shared/StatusMessage";
import ActionRow from "./shared/ActionRow";
import CopyButton from "./shared/CopyButton";

import {
  checkPortStatus,
  commonPortPresets,
  getErrorCodeExplanation,
  getPortService,
  getPortTip,
  isValidPort,
  m365PortBundle,
  MAX_BULK_PORTS,
  normalizeHost,
  normalizePort,
  parsePortList,
} from "../../core/toolEngines/portEngine";

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

const defaultPort = "443";

export default function PortCheckForm({ compactMode = false }) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState(defaultPort);
  const [selectedPreset, setSelectedPreset] = useState(defaultPort);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Enter a host and port to check the connection.",
  );

  const [bulkPorts, setBulkPorts] = useState("");
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkStatus, setBulkStatus] = useState(
    "Enter one or more ports (comma or newline separated) to check them all on the same host.",
  );
  const bulkCancelRef = useRef(false);

  const BULK_CONCURRENCY = 5;

  const normalizedHost = normalizeHost(host);

  const normalizedPort = normalizePort(port);

  const validPort = isValidPort(normalizedPort);

  const service = getPortService(normalizedPort);

  const portTip = getPortTip(normalizedPort);

  const errorExplanation = result?.errorCode
    ? getErrorCodeExplanation(result.errorCode)
    : null;

  const runCheck = async () => {
    if (!normalizedHost) {
      setResult(null);
      setStatus("No host or IP provided.");
      return;
    }

    if (!validPort) {
      setResult(null);
      setStatus("Invalid port. Use a port between 1 and 65535.");
      return;
    }

    try {
      setStatus("Checking the port.");

      const portResult = await checkPortStatus({
        host: normalizedHost,
        port: normalizedPort,
      });

      setResult(portResult);

      setStatus(
        portResult.open
          ? "The port is open."
          : "The port is closed or unreachable.",
      );
    } catch (error) {
      setResult(null);

      setStatus(error?.message || "Port check failed.");
    }
  };

  const reset = () => {
    setHost("");
    setPort(defaultPort);
    setSelectedPreset(defaultPort);
    setResult(null);
    setStatus("Enter a host and port to check the connection.");
  };

  const handlePresetChange = (value) => {
    setSelectedPreset(value);
    setPort(value);
  };

  const useM365Bundle = () => {
    setBulkPorts(m365PortBundle);
  };

  const runBulkCheck = async () => {
    if (!normalizedHost) {
      setBulkStatus("No host or IP provided.");
      return;
    }

    const ports = parsePortList(bulkPorts).filter((value) =>
      isValidPort(value),
    );

    if (!ports.length) {
      setBulkResults([]);
      setBulkStatus("Enter at least one valid port (1-65535).");
      return;
    }

    bulkCancelRef.current = false;
    setBulkRunning(true);
    setBulkResults([]);
    setBulkStatus(`0 of ${ports.length} ports checked.`);

    const collected = new Array(ports.length).fill(null);
    let completedCount = 0;
    let nextIndex = 0;

    const worker = async () => {
      while (true) {
        if (bulkCancelRef.current) return;

        const index = nextIndex;
        nextIndex += 1;

        if (index >= ports.length) return;

        const portValue = ports[index];

        try {
          collected[index] = await checkPortStatus({
            host: normalizedHost,
            port: portValue,
          });
        } catch (error) {
          collected[index] = {
            host: normalizedHost,
            port: portValue,
            service: getPortService(portValue),
            open: false,
            latencyMs: undefined,
            errorCode: null,
            banner: null,
            error: error?.message || "Check failed.",
          };
        }

        completedCount += 1;
        setBulkResults(collected.filter(Boolean));
        setBulkStatus(`${completedCount} of ${ports.length} ports checked.`);
      }
    };

    const workerCount = Math.min(BULK_CONCURRENCY, ports.length);

    await Promise.all(Array.from({ length: workerCount }, worker));

    setBulkRunning(false);

    if (bulkCancelRef.current) {
      setBulkStatus(
        `Cancelled after ${completedCount} of ${ports.length} ports.`,
      );
      return;
    }

    const openCount = collected.filter((entry) => entry && entry.open).length;

    setBulkStatus(`Done: ${openCount} of ${ports.length} ports open.`);
  };

  const cancelBulkCheck = () => {
    bulkCancelRef.current = true;
  };

  const bulkSummaryText = bulkResults
    .map(
      (entry) =>
        `${normalizedHost}:${entry.port} (${entry.service}) - ${entry.open ? "open" : "closed"}`,
    )
    .join("\n");

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Port checker"
        description="Check whether a single TCP port is reachable on a host or IP address."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 140px",
            gap: "10px",
            alignItems: "end",
          }}
        >
          <FormField
            label="Host of IP"
            value={host}
            onChange={setHost}
            placeholder="For example server01 or 8.8.8.8"
            compactMode={compactMode}
            mono
          />

          <FormField
            label="Port"
            type="number"
            value={port}
            onChange={setPort}
            placeholder="443"
            compactMode={compactMode}
            mono
          />
        </div>

        <div
          style={{
            marginTop: "10px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto auto",
            gap: "10px",
            alignItems: "end",
          }}
        >
          <SelectField
            label="Common ports"
            value={selectedPreset}
            onChange={handlePresetChange}
            options={commonPortPresets}
            compactMode={compactMode}
          />

          <ActionButton
            onClick={runCheck}
            icon={<Search size={14} />}
            variant="primary"
            compactMode={compactMode}
            title="Check port"
          >
            Check
          </ActionButton>

          <ActionButton
            onClick={reset}
            icon={<RotateCcw size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title="Clear input"
          >
            Clear
          </ActionButton>
        </div>

        <StatusMessage
          status={
            !normalizedHost ? "neutral" : validPort ? "neutral" : "warning"
          }
          compactMode={compactMode}
        >
          {status}
        </StatusMessage>

        {portTip && (
          <StatusMessage status="warning" compactMode={compactMode}>
            {portTip}
          </StatusMessage>
        )}
      </FormSection>

      <FormSection title="Result" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Status"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={
                  result ? (result.open ? "Open" : "Closed") : "Not checked yet"
                }
                status={
                  result ? (result.open ? "success" : "error") : "neutral"
                }
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Host"
            value={normalizedHost || "Not filled in"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Port"
            value={normalizedPort || "Not filled in"}
          />

          <InfoTile compactMode={compactMode} label="Service" value={service} />

          <InfoTile
            compactMode={compactMode}
            label="Response time"
            value={
              result?.latencyMs !== undefined
                ? `${result.latencyMs} ms`
                : "Not available"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Error code"
            value={result?.errorCode || "None"}
          />

          {result?.banner && (
            <InfoTile
              compactMode={compactMode}
              label="Server banner"
              value={result.banner}
            />
          )}
        </ResultGrid>

        {errorExplanation && (
          <StatusMessage status="warning" compactMode={compactMode}>
            {errorExplanation}
          </StatusMessage>
        )}

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={normalizedHost}
            label="Copy host"
            copiedLabel="Host copied"
            compactMode={compactMode}
            variant="primary"
          />

          <CopyButton
            value={normalizedPort}
            label="Copy port"
            copiedLabel="Port copied"
            compactMode={compactMode}
            variant="secondary"
          />

          <CopyButton
            value={
              result
                ? [
                    `${normalizedHost}:${normalizedPort} (${service}) - ${result.open ? "open" : "closed"}`,
                    result.latencyMs !== undefined
                      ? `Response time: ${result.latencyMs} ms`
                      : null,
                    result.errorCode ? `Error code: ${result.errorCode}` : null,
                    errorExplanation,
                    result.banner ? `Server banner: ${result.banner}` : null,
                  ]
                    .filter(Boolean)
                    .join("\n")
                : ""
            }
            label="Copy result"
            copiedLabel="Result copied"
            compactMode={compactMode}
            variant="secondary"
          />
        </ActionRow>
      </FormSection>

      <FormSection
        title="Bulk port check"
        description={`Check several ports on the same host at once (for example for a Microsoft 365 connectivity check). At most ${MAX_BULK_PORTS} ports per check.`}
        compactMode={compactMode}
      >
        <FormField
          label="Ports (comma or newline separated)"
          value={bulkPorts}
          onChange={setBulkPorts}
          placeholder={"443, 587, 993, 995"}
          compactMode={compactMode}
          mono
          textarea
          rows={3}
        />

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={runBulkCheck}
            icon={<Search size={14} />}
            variant="primary"
            compactMode={compactMode}
            disabled={bulkRunning}
            title="Check all listed ports"
          >
            {bulkRunning ? "Working..." : "Check all ports"}
          </ActionButton>

          <ActionButton
            onClick={cancelBulkCheck}
            icon={<Square size={14} />}
            variant="danger"
            compactMode={compactMode}
            disabled={!bulkRunning}
            title="Cancel bulk port check"
          >
            Stop
          </ActionButton>

          <ActionButton
            onClick={useM365Bundle}
            icon={<RotateCcw size={14} />}
            variant="secondary"
            compactMode={compactMode}
            disabled={bulkRunning}
            title="Fill in the Microsoft 365 connectivity ports"
          >
            M365 bundle
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
          <div
            style={{
              marginTop: "12px",
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Port</th>
                  <th style={tableHeaderStyle}>Service</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Response time</th>
                  <th style={tableHeaderStyle}>Error code</th>
                </tr>
              </thead>

              <tbody>
                {bulkResults.map((entry) => (
                  <tr key={entry.port}>
                    <td style={tableCellStyle}>{entry.port}</td>
                    <td style={tableCellStyle}>{entry.service}</td>
                    <td style={tableCellStyle}>
                      <StatusBadge
                        compactMode={compactMode}
                        label={entry.open ? "Open" : "Closed"}
                        status={entry.open ? "success" : "error"}
                      />
                    </td>
                    <td style={tableCellStyle}>
                      {entry.latencyMs !== undefined
                        ? `${entry.latencyMs} ms`
                        : "-"}
                    </td>
                    <td style={tableCellStyle}>
                      {entry.errorCode || entry.error || "-"}
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
