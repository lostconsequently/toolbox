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
import FormField from "./shared/FormField";
import CheckboxOption from "./shared/CheckboxOption";

import {
  analyzeSignInLog,
  levelToStatus,
  DEFAULT_OPTIONS,
  ANOMALY_TYPES,
} from "../../core/toolEngines/signInAnomalyEngine";

function fmtTimestamp(raw, ms) {
  if (ms === null || ms === undefined) return raw || "-";

  return new Date(ms).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SignInAnomalyAnalyzerForm({ compactMode = false }) {
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Paste Entra ID sign-in logs (JSON, CSV or a pasted table), or upload a file.",
  );
  const [running, setRunning] = useState(false);
  const [onlyAnomalies, setOnlyAnomalies] = useState(true);

  const [businessStartHour, setBusinessStartHour] = useState(
    String(DEFAULT_OPTIONS.businessStartHour),
  );
  const [businessEndHour, setBusinessEndHour] = useState(
    String(DEFAULT_OPTIONS.businessEndHour),
  );
  const [timezoneOffset, setTimezoneOffset] = useState(
    String(DEFAULT_OPTIONS.timezoneOffsetMinutes / 60),
  );
  const [expectedCountries, setExpectedCountries] = useState("");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setResult(null);
    setStatus(
      selectedFile
        ? `Selected: ${selectedFile.name}`
        : "Paste Entra ID sign-in logs (JSON, CSV or a pasted table), or upload a file.",
    );
  };

  const runAnalysis = async () => {
    setRunning(true);
    setStatus("Analysing the log.");

    try {
      const text = file ? await file.text() : pastedText;

      const options = {
        businessStartHour: Number(businessStartHour) || 0,
        businessEndHour: Number(businessEndHour) || 24,
        timezoneOffsetMinutes: (Number(timezoneOffset) || 0) * 60,
        expectedCountries: expectedCountries
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      };

      const analysis = analyzeSignInLog(text, options);

      if (analysis.success) {
        setResult(analysis);
        setStatus(
          `${analysis.eventCount} events, ${analysis.userCount} users analysed. Risk level: ${analysis.overallLevel}.`,
        );
      } else {
        setResult(null);
        setStatus(analysis.error || "Analysis failed.");
      }
    } catch (error) {
      setResult(null);
      setStatus(error.message || "Could not process the log.");
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPastedText("");
    setResult(null);
    setStatus(
      "Paste Entra ID sign-in logs (JSON, CSV or a pasted table), or upload a file.",
    );
  };

  const hasError =
    result === null && status && status.toLowerCase().includes("failed");

  const visibleTimeline = useMemo(() => {
    if (!result) return [];
    return onlyAnomalies
      ? result.timeline.filter((event) => event.anomalyTypes.length > 0)
      : result.timeline;
  }, [result, onlyAnomalies]);

  const jsonExport = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ""),
    [result],
  );

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Sign-in Log Anomaly Analyzer"
        description="Paste or upload Microsoft Entra ID sign-in logs (JSON export, CSV export, or a table pasted from the portal). All processing happens locally in the browser — nothing is sent to an external service."
        compactMode={compactMode}
      >
        <div style={{ display: "grid", gap: "10px" }}>
          <input
            type="file"
            accept=".json,.csv,.txt"
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

          {!file && (
            <FormField
              label="Or paste the sign-in log here"
              value={pastedText}
              onChange={setPastedText}
              placeholder="Paste JSON, CSV or a table from the Entra ID sign-in logs..."
              compactMode={compactMode}
              textarea
              rows={6}
              mono
            />
          )}

          <ActionRow compactMode={compactMode} marginTop="0">
            <ActionButton
              onClick={runAnalysis}
              icon={<FileSearch size={14} />}
              variant="primary"
              compactMode={compactMode}
              disabled={(!file && !pastedText.trim()) || running}
            >
              {running ? "Analysing..." : "Analyse"}
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
      </FormSection>

      <FormSection
        title="Configuration"
        description="Optional — adjust if needed; the defaults work for most MSP customers in Europe."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "10px",
          }}
        >
          <FormField
            label="Working hours start (hour)"
            value={businessStartHour}
            onChange={setBusinessStartHour}
            type="number"
            compactMode={compactMode}
          />

          <FormField
            label="Working hours end (hour)"
            value={businessEndHour}
            onChange={setBusinessEndHour}
            type="number"
            compactMode={compactMode}
          />

          <FormField
            label="Time zone offset (hours from UTC)"
            value={timezoneOffset}
            onChange={setTimezoneOffset}
            type="number"
            compactMode={compactMode}
          />

          <FormField
            label="Expected countries (optional)"
            value={expectedCountries}
            onChange={setExpectedCountries}
            placeholder="NL,BE,DE"
            compactMode={compactMode}
          />
        </div>
      </FormSection>

      {result?.success && (
        <>
          <FormSection title="Summary" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Risk score"
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={`${result.overallScore}/100 — ${result.overallLevel}`}
                    status={levelToStatus(result.overallLevel)}
                  />
                }
              />
              <InfoTile
                compactMode={compactMode}
                label="Events"
                value={String(result.eventCount)}
              />
              <InfoTile
                compactMode={compactMode}
                label="Users"
                value={String(result.userCount)}
              />
              <InfoTile
                compactMode={compactMode}
                label="Anomaly types"
                value={String(result.groupedAnomalies.length)}
              />
              <InfoTile
                compactMode={compactMode}
                label="Time range"
                value={
                  result.timeRange.start
                    ? `${fmtTimestamp(null, result.timeRange.start)} — ${fmtTimestamp(null, result.timeRange.end)}`
                    : "Unknown"
                }
              />
              <InfoTile
                compactMode={compactMode}
                label="Input format"
                value={result.inputType === "json" ? "JSON" : "CSV/table"}
              />
            </ResultGrid>
          </FormSection>

          <FormSection title="Management summary" compactMode={compactMode}>
            <div
              style={{
                color: "var(--text)",
                fontSize: compactMode ? "12px" : "13px",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {result.managementSummary}
            </div>

            <ActionRow compactMode={compactMode}>
              <CopyButton
                value={result.managementSummary}
                label="Copy summary"
                copiedLabel="Copied"
                compactMode={compactMode}
                variant="secondary"
              />
            </ActionRow>
          </FormSection>

          <FormSection title="Technical summary" compactMode={compactMode}>
            <div
              style={{
                color: "var(--text)",
                fontSize: compactMode ? "12px" : "13px",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                fontFamily: "var(--mono, monospace)",
              }}
            >
              {result.technicalSummary}
            </div>

            <ActionRow compactMode={compactMode}>
              <CopyButton
                value={result.technicalSummary}
                label="Copy technical summary"
                copiedLabel="Copied"
                compactMode={compactMode}
                variant="secondary"
              />
            </ActionRow>
          </FormSection>

          <FormSection title="Detected anomalies" compactMode={compactMode}>
            {result.groupedAnomalies.length === 0 ? (
              <StatusMessage status="success" compactMode={compactMode}>
                No anomalies found.
              </StatusMessage>
            ) : (
              <ResultGrid compactMode={compactMode}>
                {result.groupedAnomalies.map((group) => (
                  <InfoTile
                    key={group.type}
                    compactMode={compactMode}
                    label={group.label}
                    value={
                      <StatusBadge
                        compactMode={compactMode}
                        label={`${group.eventCount} event(s) · ${group.userCount} user(s)`}
                        status={group.severity}
                      />
                    }
                  />
                ))}
              </ResultGrid>
            )}
          </FormSection>

          <FormSection
            title="Event timeline"
            description={`${visibleTimeline.length} of ${result.timeline.length} events shown.`}
            compactMode={compactMode}
          >
            <CheckboxOption
              label="Show only events with anomalies"
              checked={onlyAnomalies}
              onChange={setOnlyAnomalies}
              compactMode={compactMode}
            />

            <div
              style={{
                display: "grid",
                gap: "8px",
                marginTop: "10px",
                maxHeight: "600px",
                overflowY: "auto",
              }}
            >
              {visibleTimeline.map((event, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: "10px",
                    alignItems: "start",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    padding: compactMode ? "8px" : "10px",
                  }}
                >
                  <StatusBadge
                    compactMode={compactMode}
                    label={event.riskLevel}
                    status={levelToStatus(event.riskLevel)}
                  />

                  <div style={{ fontSize: compactMode ? "12px" : "13px" }}>
                    <div style={{ color: "var(--text)", fontWeight: "600" }}>
                      {event.user}
                    </div>

                    <div style={{ color: "var(--subtle)", marginTop: "2px" }}>
                      {fmtTimestamp(event.timestampRaw, event.timestampMs)} ·{" "}
                      {event.ip || "unknown IP"} ·{" "}
                      {[event.city, event.country].filter(Boolean).join(", ") ||
                        "unknown location"}
                    </div>

                    <div style={{ color: "var(--subtle)", marginTop: "2px" }}>
                      {event.device || "unknown device"} ·{" "}
                      {event.browser || "unknown browser"}
                      {event.clientApp ? ` · ${event.clientApp}` : ""}
                    </div>

                    {event.anomalyTypes.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                          marginTop: "6px",
                        }}
                      >
                        {event.anomalyTypes.map((type) => (
                          <StatusBadge
                            key={type}
                            compactMode={compactMode}
                            label={ANOMALY_TYPES[type]?.label || type}
                            status={ANOMALY_TYPES[type]?.severity || "neutral"}
                          />
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        color: "var(--text)",
                        marginTop: "6px",
                        fontStyle: "italic",
                      }}
                    >
                      {event.recommendedAction}
                    </div>
                  </div>

                  <StatusBadge
                    compactMode={compactMode}
                    label={event.success ? "Succeeded" : "Failed"}
                    status={event.success ? "success" : "error"}
                  />
                </div>
              ))}
            </div>
          </FormSection>

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
        </>
      )}
    </ToolFormLayout>
  );
}
