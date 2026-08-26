import { useMemo, useState } from "react";
import { FileSearch, RotateCcw } from "lucide-react";

import FormSection from "./shared/FormSection";
import ActionButton from "./shared/ActionButton";
import ToolFormLayout from "./shared/ToolFormLayout";
import ResultGrid from "./shared/ResultGrid";
import InfoTile from "./shared/InfoTile";
import StatusBadge from "./shared/StatusBadge";
import StatusMessage from "./shared/StatusMessage";
import ActionRow from "./shared/ActionRow";
import CopyButton from "./shared/CopyButton";

import {
  parseMessageTraceCsv,
  formatDuration,
  classifyStatus,
} from "../../core/toolEngines/messageTraceEngine";

function fmtTimestamp(raw, ms) {
  if (ms === null || ms === undefined) return raw || "-";

  return new Date(ms).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function MessageTraceVisualizerForm({ compactMode = false }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Upload a message trace CSV export from Microsoft 365 (summary or detail/hop export).",
  );
  const [running, setRunning] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setResult(null);
    setSelectedGroupIndex(0);
    setStatus(
      selectedFile
        ? `Selected: ${selectedFile.name}`
        : "Upload a message trace CSV export from Microsoft 365 (summary or detail/hop export).",
    );
  };

  const runParse = async () => {
    if (!file) return;

    setRunning(true);
    setStatus("Parsing the CSV.");

    try {
      const content = await file.text();
      const parsed = parseMessageTraceCsv(content, file.name);

      if (parsed.success) {
        setResult(parsed);
        setSelectedGroupIndex(0);
        setStatus(
          parsed.mode === "detail"
            ? `${parsed.detail.groups.length} message(s) with hop data found.`
            : `${parsed.summary.total} message(s) found (summary export, no hop data).`,
        );
      } else {
        setResult(null);
        setStatus(parsed.error || "Parse error.");
      }
    } catch (error) {
      setResult(null);
      setStatus(error.message || "Could not read the file.");
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setSelectedGroupIndex(0);
    setStatus(
      "Upload a message trace CSV export from Microsoft 365 (summary or detail/hop export).",
    );
  };

  const hasError = result && !result.success;
  const group =
    result?.mode === "detail" ? result.detail.groups[selectedGroupIndex] : null;

  const jsonExport = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ""),
    [result],
  );

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Message Trace Visualizer"
        description="Upload the CSV export of a Microsoft 365 message trace. Works with both the summary list (Get-MessageTrace) and the per-message hop export (Get-MessageTraceDetail / 'View message trace details' → Export)."
        compactMode={compactMode}
      >
        <div style={{ display: "grid", gap: "10px" }}>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: compactMode ? "7px 9px" : "9px 10px",
              fontSize: compactMode ? "12px" : "13px",
            }}
          />

          <ActionRow compactMode={compactMode} marginTop="0">
            <ActionButton
              onClick={runParse}
              icon={<FileSearch size={14} />}
              variant="primary"
              compactMode={compactMode}
              disabled={!file || running}
            >
              {running ? "Parsing..." : "Parse CSV"}
            </ActionButton>

            <ActionButton
              onClick={reset}
              icon={<RotateCcw size={14} />}
              variant="secondary"
              compactMode={compactMode}
              disabled={running}
            >
              Clear
            </ActionButton>
          </ActionRow>
        </div>

        <StatusMessage
          status={result?.success ? "success" : hasError ? "error" : "neutral"}
          compactMode={compactMode}
        >
          {status}
        </StatusMessage>

        {result?.warnings?.map((warning) => (
          <StatusMessage
            key={warning}
            status="warning"
            compactMode={compactMode}
          >
            {warning}
          </StatusMessage>
        ))}
      </FormSection>

      {result?.success && (
        <FormSection title="Detected columns" compactMode={compactMode}>
          <ResultGrid compactMode={compactMode}>
            <InfoTile
              compactMode={compactMode}
              label="Mode"
              value={
                <StatusBadge
                  compactMode={compactMode}
                  label={
                    result.mode === "detail"
                      ? "Hop detail (per message)"
                      : "Summary (multiple messages)"
                  }
                  status={result.mode === "detail" ? "success" : "neutral"}
                />
              }
            />

            <InfoTile
              compactMode={compactMode}
              label="Rows read"
              value={String(result.rowCount)}
            />

            {result.detectedColumns.map((col) => (
              <InfoTile
                key={col.field}
                compactMode={compactMode}
                label={col.label}
                value={col.header}
              />
            ))}
          </ResultGrid>
        </FormSection>
      )}

      {result?.success && result.mode === "detail" && (
        <>
          <FormSection
            title="Messages"
            description="Sorted by longest total time first — the most interesting messages for troubleshooting are at the top."
            compactMode={compactMode}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {result.detail.groups.map((g, index) => (
                <button
                  key={g.messageId || index}
                  type="button"
                  onClick={() => setSelectedGroupIndex(index)}
                  style={{
                    background:
                      index === selectedGroupIndex
                        ? "var(--primary)"
                        : "var(--surface)",
                    color:
                      index === selectedGroupIndex ? "#ffffff" : "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: compactMode ? "6px 9px" : "8px 10px",
                    cursor: "pointer",
                    fontSize: compactMode ? "12px" : "13px",
                    textAlign: "left",
                    maxWidth: "260px",
                  }}
                  title={g.subject || g.messageId || "Message"}
                >
                  <div
                    style={{
                      fontWeight: "600",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {g.subject || g.messageId || `Message ${index + 1}`}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.85 }}>
                    {g.hopCount} hops · {formatDuration(g.totalDurationMs)}
                  </div>
                </button>
              ))}
            </div>
          </FormSection>

          {group && (
            <>
              <FormSection title="Message summary" compactMode={compactMode}>
                <ResultGrid compactMode={compactMode}>
                  <InfoTile
                    compactMode={compactMode}
                    label="Subject"
                    value={group.subject || "Unknown"}
                  />
                  <InfoTile
                    compactMode={compactMode}
                    label="Sender"
                    value={group.sender || "Unknown"}
                  />
                  <InfoTile
                    compactMode={compactMode}
                    label="Recipient"
                    value={group.recipient || "Unknown"}
                  />
                  <InfoTile
                    compactMode={compactMode}
                    label="Hop count"
                    value={String(group.hopCount)}
                  />
                  <InfoTile
                    compactMode={compactMode}
                    label="Total transit time"
                    value={
                      group.hasTimestamps ? (
                        <StatusBadge
                          compactMode={compactMode}
                          label={formatDuration(group.totalDurationMs)}
                          status={
                            group.totalDurationMs > 60_000
                              ? "error"
                              : group.totalDurationMs > 10_000
                                ? "warning"
                                : "success"
                          }
                        />
                      ) : (
                        "No timestamp data"
                      )
                    }
                  />
                  <InfoTile
                    compactMode={compactMode}
                    label="Slowest hop"
                    value={
                      group.bottleneck
                        ? `${group.bottleneck.event} (+${formatDuration(group.bottleneck.deltaFromPreviousMs)})`
                        : "Not available"
                    }
                  />
                </ResultGrid>
              </FormSection>

              <FormSection title="Hop timeline" compactMode={compactMode}>
                <div style={{ display: "grid", gap: "8px" }}>
                  {group.hops.map((hop, index) => (
                    <div
                      key={index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr auto auto",
                        gap: "10px",
                        alignItems: "center",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        background: "var(--surface)",
                        padding: compactMode ? "8px" : "10px",
                      }}
                    >
                      <StatusBadge
                        compactMode={compactMode}
                        label={hop.event}
                        status="neutral"
                      />

                      <div>
                        <div
                          style={{
                            color: "var(--text)",
                            fontSize: compactMode ? "12px" : "13px",
                          }}
                        >
                          {hop.detail || "-"}
                        </div>
                        <div
                          style={{
                            color: "var(--subtle)",
                            fontSize: "11px",
                            marginTop: "2px",
                          }}
                        >
                          {fmtTimestamp(hop.timestampRaw, hop.timestampMs)}
                        </div>
                      </div>

                      <StatusBadge
                        compactMode={compactMode}
                        label={
                          index === 0
                            ? "start"
                            : `+${formatDuration(hop.deltaFromPreviousMs)}`
                        }
                        status={index === 0 ? "neutral" : hop.severity}
                      />

                      <div
                        style={{
                          color: "var(--subtle)",
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        total {formatDuration(hop.deltaFromStartMs)}
                      </div>
                    </div>
                  ))}
                </div>
              </FormSection>
            </>
          )}
        </>
      )}

      {result?.success && result.mode === "summary" && (
        <>
          <FormSection title="Statistics" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Total messages"
                value={String(result.summary.total)}
              />
              {result.summary.avgSize !== null && (
                <InfoTile
                  compactMode={compactMode}
                  label="Avg. size"
                  value={`${result.summary.avgSize.toFixed(1)} KB`}
                />
              )}
              {result.summary.byStatus.map((entry) => (
                <InfoTile
                  key={entry.status}
                  compactMode={compactMode}
                  label={entry.status}
                  value={
                    <StatusBadge
                      compactMode={compactMode}
                      label={String(entry.count)}
                      status={classifyStatus(entry.status)}
                    />
                  }
                />
              ))}
            </ResultGrid>
          </FormSection>

          {result.summary.topSenders.length > 0 && (
            <FormSection
              title="Most frequent senders"
              compactMode={compactMode}
            >
              <ResultGrid compactMode={compactMode}>
                {result.summary.topSenders.map((entry) => (
                  <InfoTile
                    key={entry.value}
                    compactMode={compactMode}
                    label={entry.value}
                    value={`${entry.count} message(s)`}
                  />
                ))}
              </ResultGrid>
            </FormSection>
          )}

          {result.summary.topRecipients.length > 0 && (
            <FormSection
              title="Most frequent recipients"
              compactMode={compactMode}
            >
              <ResultGrid compactMode={compactMode}>
                {result.summary.topRecipients.map((entry) => (
                  <InfoTile
                    key={entry.value}
                    compactMode={compactMode}
                    label={entry.value}
                    value={`${entry.count} message(s)`}
                  />
                ))}
              </ResultGrid>
            </FormSection>
          )}

          <FormSection title="Messages" compactMode={compactMode}>
            <div
              style={{
                display: "grid",
                gap: "6px",
                maxHeight: "500px",
                overflowY: "auto",
              }}
            >
              {result.summary.messages.map((message, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr 1fr auto",
                    gap: "10px",
                    alignItems: "center",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    padding: compactMode ? "8px" : "10px",
                    fontSize: compactMode ? "12px" : "13px",
                  }}
                >
                  <StatusBadge
                    compactMode={compactMode}
                    label={message.status || "Unknown"}
                    status={classifyStatus(message.status)}
                  />

                  <div
                    style={{
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {message.subject || "(no subject)"}
                    <div style={{ color: "var(--subtle)", fontSize: "11px" }}>
                      {message.sender || "-"} → {message.recipient || "-"}
                    </div>
                  </div>

                  <div style={{ color: "var(--subtle)", fontSize: "11px" }}>
                    {fmtTimestamp(message.timestampRaw, message.timestampMs)}
                  </div>

                  <div
                    style={{
                      color: "var(--subtle)",
                      fontSize: "11px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {message.size || ""}
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
        </>
      )}

      {result?.success && (
        <FormSection title="Export" compactMode={compactMode}>
          <ActionRow compactMode={compactMode}>
            <CopyButton
              value={jsonExport}
              label="Copy JSON"
              copiedLabel="JSON copied"
              compactMode={compactMode}
              variant="secondary"
            />
          </ActionRow>
        </FormSection>
      )}
    </ToolFormLayout>
  );
}
