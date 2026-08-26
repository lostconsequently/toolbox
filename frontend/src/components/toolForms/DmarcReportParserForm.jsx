import { useState } from "react";
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
  parseDmarcReport,
  readReportFile,
} from "../../core/toolEngines/dmarcReportEngine";

function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dispositionLabel(d) {
  if (d === "none") return "None";
  if (d === "quarantine") return "Quarantine";
  if (d === "reject") return "Reject";
  return d || "-";
}

function dispositionStatus(d) {
  if (d === "reject" || d === "quarantine") return "warning";
  return "success";
}

export default function DmarcReportParserForm({ compactMode = false }) {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Upload a DMARC aggregate report XML file.",
  );
  const [running, setRunning] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setResult(null);
    setStatus(
      selectedFile
        ? `Selected: ${selectedFile.name}`
        : "Upload a DMARC aggregate report XML file.",
    );
  };

  const runParse = async () => {
    if (!file) return;

    setRunning(true);
    setStatus("Parsing the XML.");

    try {
      const content = await readReportFile(file);
      setText(content);
      const parsed = await parseDmarcReport(content, file.name);

      if (parsed.success) {
        setResult(parsed);
        setStatus("Report parsed.");
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
    setText("");
    setResult(null);
    setStatus("Upload a DMARC aggregate report XML file.");
  };

  const summary = result?.summary;
  const metadata = result?.reportMetadata;
  const policy = result?.policyPublished;
  const hasError = result && !result.success;

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="DMARC Report Parser"
        description="Parse DMARC aggregate (RUA) reports. Upload the XML, .xml.gz or .zip file from your mailbox."
        compactMode={compactMode}
      >
        <div style={{ display: "grid", gap: "10px" }}>
          <input
            type="file"
            accept=".xml,.gz,.zip"
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
              {running ? "Parsing..." : "Parse report"}
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

      {result?.success && (
        <>
          <FormSection title="Rapport metadata" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Organization"
                value={metadata?.orgName || "-"}
              />
              <InfoTile
                compactMode={compactMode}
                label="Domain"
                value={policy?.domain || "-"}
              />
              <InfoTile
                compactMode={compactMode}
                label="Start"
                value={fmtDate(metadata?.dateRange?.begin)}
              />
              <InfoTile
                compactMode={compactMode}
                label="End"
                value={fmtDate(metadata?.dateRange?.end)}
              />
              <InfoTile
                compactMode={compactMode}
                label="Policy"
                value={dispositionLabel(policy?.p)}
              />
              <InfoTile
                compactMode={compactMode}
                label="Subdomain policy"
                value={dispositionLabel(policy?.sp)}
              />
              <InfoTile
                compactMode={compactMode}
                label="DKIM alignment"
                value={policy?.adkim === "s" ? "Strict" : "Relaxed"}
              />
              <InfoTile
                compactMode={compactMode}
                label="SPF alignment"
                value={policy?.aspf === "s" ? "Strict" : "Relaxed"}
              />
              <InfoTile
                compactMode={compactMode}
                label="Percentage"
                value={`${policy?.pct || 100}%`}
              />
              <InfoTile
                compactMode={compactMode}
                label="Report ID"
                value={
                  metadata?.reportId
                    ? metadata.reportId.slice(0, 40) + "…"
                    : "-"
                }
              />
            </ResultGrid>
          </FormSection>

          <FormSection title="Summary" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Total emails"
                value={String(summary?.totalEmails ?? 0)}
              />
              <InfoTile
                compactMode={compactMode}
                label="Passed"
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={`${summary?.totalPass ?? 0} (${summary?.passRate ?? 0}%)`}
                    status="success"
                  />
                }
              />
              <InfoTile
                compactMode={compactMode}
                label="Rejected"
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={`${summary?.totalFail ?? 0} (${summary?.failRate ?? 0}%)`}
                    status={summary?.totalFail > 0 ? "error" : "success"}
                  />
                }
              />
              <InfoTile
                compactMode={compactMode}
                label="Unique IPs"
                value={String(summary?.uniqueIps ?? 0)}
              />
            </ResultGrid>

            <StatusMessage
              status={
                summary?.passRate >= 99
                  ? "success"
                  : summary?.passRate >= 90
                    ? "warning"
                    : "error"
              }
              compactMode={compactMode}
            >
              {summary?.passRate >= 99
                ? "DMARC compliance is excellent."
                : summary?.passRate >= 90
                  ? "DMARC compliance is good. Check the failing IPs."
                  : summary?.passRate >= 75
                    ? "DMARC compliance is mediocre. A significant number of messages are failing."
                    : "DMARC compliance is low. Many messages fail authentication."}
            </StatusMessage>
          </FormSection>

          {summary?.topFailIps?.length > 0 && (
            <FormSection title="Top failing IPs" compactMode={compactMode}>
              <ResultGrid compactMode={compactMode}>
                {summary.topFailIps.map((ip) => (
                  <InfoTile
                    compactMode={compactMode}
                    key={ip.ip}
                    label={ip.ip}
                    value={
                      <StatusBadge
                        compactMode={compactMode}
                        label={`${ip.failCount} rejected of ${ip.count}`}
                        status="error"
                      />
                    }
                  />
                ))}
              </ResultGrid>
            </FormSection>
          )}

          <FormSection title="Source IPs" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              {summary?.sourceIps?.map((ip) => (
                <InfoTile
                  compactMode={compactMode}
                  key={ip.ip}
                  label={ip.ip}
                  value={
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <StatusBadge
                        compactMode={compactMode}
                        label={`${ip.count} mails`}
                        status={ip.failCount > 0 ? "warning" : "success"}
                      />
                      <StatusBadge
                        compactMode={compactMode}
                        label={dispositionLabel(ip.disposition)}
                        status={dispositionStatus(ip.disposition)}
                      />
                      <span
                        style={{
                          color: "var(--subtle)",
                          fontSize: "12px",
                          fontWeight: 400,
                        }}
                      >
                        DKIM:{ip.dkimResult} SPF:{ip.spfResult}
                      </span>
                      {ip.reasons?.length > 0 && (
                        <span
                          style={{
                            color: "var(--subtle)",
                            fontSize: "12px",
                            fontWeight: 400,
                          }}
                        >
                          Reason:{" "}
                          {Array.from(
                            new Set(
                              ip.reasons.map((r) => r.type).filter(Boolean),
                            ),
                          ).join(", ")}
                        </span>
                      )}
                    </div>
                  }
                />
              ))}
            </ResultGrid>
          </FormSection>

          <FormSection title="Raw XML" compactMode={compactMode}>
            <ActionRow compactMode={compactMode}>
              <CopyButton
                value={text}
                label="Copy XML"
                copiedLabel="XML copied"
                compactMode={compactMode}
                variant="primary"
              />
            </ActionRow>
          </FormSection>
        </>
      )}
    </ToolFormLayout>
  );
}
