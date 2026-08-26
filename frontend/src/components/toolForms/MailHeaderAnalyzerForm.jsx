import { useState } from "react";
import { RotateCcw, Search } from "lucide-react";

import FormSection from "./shared/FormSection";
import FormField from "./shared/FormField";
import ActionButton from "./shared/ActionButton";
import ToolFormLayout from "./shared/ToolFormLayout";
import ResultGrid from "./shared/ResultGrid";
import InfoTile from "./shared/InfoTile";
import StatusBadge from "./shared/StatusBadge";
import StatusMessage from "./shared/StatusMessage";
import ActionRow from "./shared/ActionRow";
import CopyButton from "./shared/CopyButton";

import { runMailTool } from "../../core/toolEngines/mailEngine";

const HOP_DELAY_WARNING_SECONDS = 300;

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

function getAuthStatus(value) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "pass") {
    return "success";
  }

  if (normalized === "fail") {
    return "error";
  }

  if (
    normalized === "softfail" ||
    normalized === "neutral" ||
    normalized === "none"
  ) {
    return "warning";
  }

  return "neutral";
}

function getRiskStatus(level) {
  if (level === "Low") return "success";
  if (level === "Medium") return "warning";
  return "error";
}

function buildMailSummaryText(data) {
  const lines = [
    "Mail header analysis",
    `Subject: ${data.message.subject}`,
    `From: ${data.message.from}`,
    `Risk: ${data.summary.riskLevel} (${data.summary.riskScore}/10)`,
    `SPF: ${data.summary.spf}`,
    `DKIM: ${data.summary.dkim}`,
    `DMARC: ${data.summary.dmarc}`,
    `CompAuth: ${data.summary.compAuth}`,
    `Microsoft 365: ${data.summary.microsoft365 ? "Detected" : "Not detected"}`,
    `Originating IP: ${data.technical.originatingIp}`,
    `Hop count: ${data.route.hopCount}`,
    "",
    "Points of attention:",
    ...data.summary.attentionPoints.map((point) => `- ${point}`),
  ];

  return lines.join("\n");
}

export default function MailHeaderAnalyzerForm({ compactMode = false }) {
  const [header, setHeader] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Paste a full mail header to analyse it.",
  );
  const [running, setRunning] = useState(false);

  const runAnalysis = async () => {
    if (!header.trim()) {
      setStatus("Paste a full mail header to analyse it.");
      return;
    }

    setRunning(true);
    setStatus("Analysing the mail header.");

    try {
      const analysis = await runMailTool(null, { header });

      if (typeof analysis === "string") {
        setResult(null);
        setStatus(analysis);
        return;
      }

      setResult(analysis);
      setStatus(
        `Risk: ${analysis.summary.riskLevel} (${analysis.summary.riskScore}/10)`,
      );
    } catch (error) {
      setResult(null);
      setStatus(error.message || "Analysis failed.");
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setHeader("");
    setResult(null);
    setStatus("Paste a full mail header to analyse it.");
  };

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Mail Header Analyzer"
        description="Paste the full mail header (including the Received and Authentication-Results lines) to analyse SPF, DKIM, DMARC, routing and Microsoft 365 signals."
        compactMode={compactMode}
      >
        <FormField
          label="Mailheader"
          value={header}
          onChange={setHeader}
          placeholder="Paste the full mail header here"
          compactMode={compactMode}
          textarea
          rows={10}
          mono
        />

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={runAnalysis}
            icon={<Search size={14} />}
            variant="primary"
            compactMode={compactMode}
            disabled={running}
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

        <StatusMessage
          status={result ? getRiskStatus(result.summary.riskLevel) : "neutral"}
          compactMode={compactMode}
        >
          {status}
        </StatusMessage>
      </FormSection>

      {result && (
        <>
          <FormSection title="Summary" compactMode={compactMode}>
            <ActionRow compactMode={compactMode} marginTop="0">
              <CopyButton
                value={buildMailSummaryText(result)}
                label="Copy summary"
                copiedLabel="Copied"
                compactMode={compactMode}
                variant="secondary"
              />
            </ActionRow>

            <div style={{ marginTop: "12px" }}>
              <ResultGrid compactMode={compactMode}>
                <InfoTile
                  compactMode={compactMode}
                  label="Risk level"
                  value={
                    <StatusBadge
                      compactMode={compactMode}
                      label={result.summary.riskLevel}
                      status={getRiskStatus(result.summary.riskLevel)}
                    />
                  }
                />
                <InfoTile
                  compactMode={compactMode}
                  label="Risk score"
                  value={`${result.summary.riskScore}/10`}
                />
                <InfoTile
                  compactMode={compactMode}
                  label="SPF"
                  value={
                    <StatusBadge
                      compactMode={compactMode}
                      label={result.summary.spf}
                      status={getAuthStatus(result.summary.spf)}
                    />
                  }
                />
                <InfoTile
                  compactMode={compactMode}
                  label="DKIM"
                  value={
                    <StatusBadge
                      compactMode={compactMode}
                      label={result.summary.dkim}
                      status={getAuthStatus(result.summary.dkim)}
                    />
                  }
                />
                <InfoTile
                  compactMode={compactMode}
                  label="DMARC"
                  value={
                    <StatusBadge
                      compactMode={compactMode}
                      label={result.summary.dmarc}
                      status={getAuthStatus(result.summary.dmarc)}
                    />
                  }
                />
                <InfoTile
                  compactMode={compactMode}
                  label="CompAuth"
                  value={
                    <StatusBadge
                      compactMode={compactMode}
                      label={result.summary.compAuth}
                      status={getAuthStatus(result.summary.compAuth)}
                    />
                  }
                />
                <InfoTile
                  compactMode={compactMode}
                  label="CompAuth reason"
                  value={result.authentication.compAuthReason}
                />
                <InfoTile
                  compactMode={compactMode}
                  label="Microsoft 365"
                  value={
                    result.summary.microsoft365 ? "Detected" : "Not detected"
                  }
                />
                <InfoTile
                  compactMode={compactMode}
                  label="Safe Links"
                  value={result.summary.safeLinks ? "Detected" : "Not found"}
                />
              </ResultGrid>
            </div>

            <div style={{ marginTop: "12px" }}>
              <div
                style={{
                  color: "var(--subtle)",
                  fontSize: "13px",
                  marginBottom: "6px",
                }}
              >
                Points of attention
              </div>

              <ul
                style={{ margin: 0, paddingLeft: "18px", color: "var(--text)" }}
              >
                {result.summary.attentionPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          </FormSection>

          {result.bounce.detected && (
            <FormSection title="Bounce / NDR" compactMode={compactMode}>
              <StatusMessage status="warning" compactMode={compactMode}>
                This message looks like a bounce / NDR (non-delivery report).
              </StatusMessage>

              <div style={{ marginTop: "12px" }}>
                <ResultGrid compactMode={compactMode}>
                  <InfoTile
                    compactMode={compactMode}
                    label="SMTP code"
                    value={result.bounce.smtpCode}
                  />
                  <InfoTile
                    compactMode={compactMode}
                    label="Diagnostic message"
                    value={result.bounce.diagnosticText}
                  />
                </ResultGrid>
              </div>
            </FormSection>
          )}

          {(result.spoofing.displayNameSpoof ||
            result.spoofing.lookalikeDomain) && (
            <FormSection
              title="Spoofing detection"
              description="Compares the display name and sender domain against known brands to spot display-name spoofing and look-alike domains."
              compactMode={compactMode}
            >
              {result.spoofing.displayNameSpoof && (
                <StatusMessage status="error" compactMode={compactMode}>
                  Display-name spoofing: "
                  {result.spoofing.displayNameSpoof.displayName}" claims to be{" "}
                  {result.spoofing.displayNameSpoof.brand}, but sends from{" "}
                  {result.spoofing.displayNameSpoof.domain}.
                </StatusMessage>
              )}

              {result.spoofing.lookalikeDomain && (
                <StatusMessage status="error" compactMode={compactMode}>
                  Look-alike domain: {result.spoofing.lookalikeDomain.domain}{" "}
                  closely resembles{" "}
                  {result.spoofing.lookalikeDomain.legitDomain} (
                  {result.spoofing.lookalikeDomain.brand}).
                </StatusMessage>
              )}
            </FormSection>
          )}

          <FormSection title="Message" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Subject"
                value={result.message.subject}
              />
              <InfoTile
                compactMode={compactMode}
                label="From"
                value={result.message.from}
              />
              <InfoTile
                compactMode={compactMode}
                label="Reply-To"
                value={result.message.replyTo}
              />
              <InfoTile
                compactMode={compactMode}
                label="Return-Path"
                value={result.message.returnPath}
              />
              <InfoTile
                compactMode={compactMode}
                label="Message-ID"
                value={result.message.messageId}
              />
            </ResultGrid>
          </FormSection>

          <FormSection
            title="Authentication per hop"
            description="Every Authentication-Results header the message picked up on the way, shown separately."
            compactMode={compactMode}
          >
            {result.authentication.results.length === 0 ? (
              <StatusMessage status="neutral" compactMode={compactMode}>
                No Authentication-Results headers found.
              </StatusMessage>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {result.authentication.results.map((entry, index) => (
                  <div
                    key={index}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "10px",
                      background: "var(--surface)",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--text)",
                        fontWeight: "600",
                        marginBottom: "8px",
                        wordBreak: "break-word",
                      }}
                    >
                      {entry.host}
                    </div>

                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      <StatusBadge
                        compactMode={compactMode}
                        label={`SPF: ${entry.spf}`}
                        status={getAuthStatus(entry.spf)}
                      />
                      <StatusBadge
                        compactMode={compactMode}
                        label={`DKIM: ${entry.dkim}`}
                        status={getAuthStatus(entry.dkim)}
                      />
                      <StatusBadge
                        compactMode={compactMode}
                        label={`DMARC: ${entry.dmarc}`}
                        status={getAuthStatus(entry.dmarc)}
                      />
                      <StatusBadge
                        compactMode={compactMode}
                        label={`CompAuth: ${entry.compAuth}`}
                        status={getAuthStatus(entry.compAuth)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          <FormSection title="Antispam" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="SCL"
                value={result.antispam.spamConfidenceLevel}
              />
              <InfoTile
                compactMode={compactMode}
                label="BCL"
                value={result.antispam.bulkComplaintLevel}
              />
              <InfoTile
                compactMode={compactMode}
                label="Filter verdict"
                value={result.antispam.filterVerdictLabel}
              />
              <InfoTile
                compactMode={compactMode}
                label="Category"
                value={result.antispam.categoryLabel}
              />
            </ResultGrid>
          </FormSection>

          <FormSection title="Mail route" compactMode={compactMode}>
            <div
              style={{
                color: "var(--subtle)",
                fontSize: "13px",
                marginBottom: "10px",
              }}
            >
              Hop count: {result.route.hopCount}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Hop</th>
                    <th style={tableHeaderStyle}>Submitting host</th>
                    <th style={tableHeaderStyle}>Receiving host</th>
                    <th style={tableHeaderStyle}>Microsoft Component</th>
                    <th style={tableHeaderStyle}>Time</th>
                    <th style={tableHeaderStyle}>Delay</th>
                    <th style={tableHeaderStyle}>Type</th>
                  </tr>
                </thead>

                <tbody>
                  {result.route.hops.map((hop, index) => {
                    const previousHop = result.route.hops[index - 1];

                    const delay =
                      previousHop?.timestamp && hop.timestamp
                        ? Math.abs(
                            Math.round(
                              (hop.timestamp - previousHop.timestamp) / 1000,
                            ),
                          )
                        : null;

                    return (
                      <tr key={hop.hop}>
                        <td style={tableCellStyle}>{hop.hop}</td>
                        <td style={tableCellStyle}>{hop.from}</td>
                        <td style={tableCellStyle}>{hop.by}</td>
                        <td style={tableCellStyle}>{hop.component}</td>
                        <td style={tableCellStyle}>{hop.time}</td>
                        <td style={tableCellStyle}>
                          {delay === null ? (
                            "-"
                          ) : delay > HOP_DELAY_WARNING_SECONDS ? (
                            <StatusBadge
                              compactMode={compactMode}
                              label={`${delay}s`}
                              status="warning"
                            />
                          ) : (
                            `${delay}s`
                          )}
                        </td>
                        <td style={tableCellStyle}>{hop.type}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </FormSection>

          <FormSection title="Technical details" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Originating IP"
                value={result.technical.originatingIp}
              />
            </ResultGrid>

            <div style={{ marginTop: "10px" }}>
              <div
                style={{
                  color: "var(--subtle)",
                  fontSize: "13px",
                  marginBottom: "6px",
                }}
              >
                All IP addresses
              </div>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  color: "var(--text)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                {result.technical.ipAddresses.length
                  ? result.technical.ipAddresses.join("\n")
                  : "None found"}
              </pre>
            </div>
          </FormSection>
        </>
      )}
    </ToolFormLayout>
  );
}
