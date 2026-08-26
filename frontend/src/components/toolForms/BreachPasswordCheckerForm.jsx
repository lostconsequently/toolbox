import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import FormSection from "./shared/FormSection";
import FormField from "./shared/FormField";
import ActionButton from "./shared/ActionButton";
import ActionRow from "./shared/ActionRow";
import CheckboxOption from "./shared/CheckboxOption";
import ToolFormLayout from "./shared/ToolFormLayout";
import ResultGrid from "./shared/ResultGrid";
import InfoTile from "./shared/InfoTile";
import StatusBadge from "./shared/StatusBadge";
import StatusMessage from "./shared/StatusMessage";
import CopyButton from "./shared/CopyButton";

import {
  auditLogToCsv,
  buildAuditEntry,
  checkBreachPassword,
  checkBreachPasswordsBulk,
  formatBreachCount,
  getRiskLabel,
  MAX_BULK_PASSWORDS,
  parseBulkPasswords,
} from "../../core/toolEngines/breachEngine";
import {
  analyzePasswordStrength,
  generatePassword,
} from "../../core/toolEngines/passwordEngine";

const IDLE_MESSAGE =
  "Enter a password and click Check. The password is never sent or stored in full.";

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

function strengthStatus(strength) {
  if (strength === "Strong") {
    return "success";
  }

  if (strength === "Average") {
    return "warning";
  }

  return "error";
}

function downloadTextFile(
  filename,
  content,
  mimeType = "text/csv;charset=utf-8",
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export default function BreachPasswordCheckerForm({ compactMode = false }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(IDLE_MESSAGE);
  const [suggestion, setSuggestion] = useState(null);

  const [auditMode, setAuditMode] = useState(false);
  const [reference, setReference] = useState("");
  const [auditLog, setAuditLog] = useState([]);

  const [bulkInput, setBulkInput] = useState("");
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkStatus, setBulkStatus] = useState(
    `Paste at most ${MAX_BULK_PASSWORDS} passwords, one per line. Optionally use "reference,password" per line (for example the username).`,
  );

  const strengthInfo = useMemo(
    () => analyzePasswordStrength(password),
    [password],
  );

  const runCheck = async () => {
    if (!password) {
      setResult(null);
      setStatus(IDLE_MESSAGE);
      return;
    }

    try {
      setLoading(true);
      setStatus("Checking the password through Have I Been Pwned...");

      const lookupResult = await checkBreachPassword(password);

      setResult(lookupResult);

      setStatus(
        lookupResult.found
          ? "This password appears in known breaches."
          : "This password was not found in known breaches.",
      );

      if (auditMode) {
        setAuditLog((current) => [
          buildAuditEntry(reference, lookupResult),
          ...current,
        ]);
      }
    } catch (error) {
      setResult(null);
      setStatus(error?.message || "Check failed.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPassword("");
    setShowPassword(false);
    setResult(null);
    setSuggestion(null);
    setStatus(IDLE_MESSAGE);
  };

  const generateSuggestion = () => {
    try {
      const generated = generatePassword({
        length: 20,
        includeLowercase: true,
        includeUppercase: true,
        includeNumbers: true,
        includeSpecial: true,
        excludeAmbiguous: true,
      });

      setSuggestion(generated.password);
    } catch {
      setSuggestion(null);
    }
  };

  const runBulkCheck = async () => {
    const entries = parseBulkPasswords(bulkInput);

    if (!entries.length) {
      setBulkResults([]);
      setBulkStatus("Enter at least one password.");
      return;
    }

    setBulkRunning(true);
    setBulkResults([]);
    setBulkStatus(`0 of ${entries.length} passwords checked.`);

    const collected = await checkBreachPasswordsBulk(entries, {
      onProgress: (done, total) => {
        setBulkStatus(`${done} of ${total} passwords checked.`);
      },
    });

    setBulkResults(collected);
    setBulkRunning(false);

    const foundCount = collected.filter((entry) => entry.found).length;

    setBulkStatus(
      `Done: ${foundCount} of ${collected.length} passwords breached.`,
    );

    if (auditMode) {
      setAuditLog((current) => [
        ...collected.map((entry) =>
          buildAuditEntry(entry.label, {
            found: entry.found,
            count: entry.count,
            riskLevel: entry.riskLevel,
            advice: entry.advice || entry.error || "-",
          }),
        ),
        ...current,
      ]);
    }
  };

  const clearAuditLog = () => setAuditLog([]);

  const exportAuditLog = () => {
    downloadTextFile(`breach-audit-${Date.now()}.csv`, auditLogToCsv(auditLog));
  };

  const summaryText = result
    ? `Status: ${result.found ? "Breached" : "Not found"}\nTimes found: ${formatBreachCount(result.count)}\nRisk: ${getRiskLabel(result.riskLevel)}\nAdvice: ${result.advice}`
    : "";

  const bulkSummaryText = bulkResults
    .map(
      (entry) =>
        `${entry.label}: ${entry.error ? entry.error : entry.found ? `Breached (${formatBreachCount(entry.count)}, ${getRiskLabel(entry.riskLevel)})` : "Not found"}`,
    )
    .join("\n");

  const auditLogText = auditLog
    .map(
      (entry) =>
        `${new Date(entry.timestamp).toLocaleString()} | ${entry.reference} | ${entry.status} | ${entry.count} | ${entry.riskLevel}`,
    )
    .join("\n");

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Breach Password Checker"
        description="Safely check whether a password appears in known breaches through the Have I Been Pwned k-anonymity API. The password never leaves the browser or server in full, and is never logged or stored."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto auto auto",
            gap: "10px",
            alignItems: "end",
          }}
        >
          <FormField
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="Enter the password to check"
            compactMode={compactMode}
            mono
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                runCheck();
              }
            }}
          />

          <ActionButton
            onClick={() => setShowPassword((current) => !current)}
            icon={showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </ActionButton>

          <ActionButton
            onClick={runCheck}
            icon={<Search size={14} />}
            variant="primary"
            compactMode={compactMode}
            disabled={loading || !password}
            title="Check password"
          >
            {loading ? "Working..." : "Check"}
          </ActionButton>

          <ActionButton
            onClick={reset}
            icon={<X size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title="Clear"
          >
            Clear
          </ActionButton>
        </div>

        <StatusMessage
          status={result ? (result.found ? "error" : "success") : "neutral"}
          compactMode={compactMode}
        >
          {status}
        </StatusMessage>

        {password && (
          <div style={{ marginTop: "12px" }}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Password strength"
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={strengthInfo.strength}
                    status={strengthStatus(strengthInfo.strength)}
                  />
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="Entropy"
                value={`${strengthInfo.entropy} bits`}
              />

              <InfoTile
                compactMode={compactMode}
                label="AD compatible"
                value={
                  strengthInfo.adCompatible
                    ? "Likely suitable"
                    : "Check the policy"
                }
              />
            </ResultGrid>
          </div>
        )}
      </FormSection>

      <FormSection
        title="Audit mode"
        description="Log only the outcome per check (status, count, risk, advice) for a security audit or ticket. The password and its hash are never written to the log, and the log is kept in the browser only."
        compactMode={compactMode}
      >
        <CheckboxOption
          label="Enable audit mode"
          checked={auditMode}
          onChange={setAuditMode}
          compactMode={compactMode}
        />

        {auditMode && (
          <div style={{ marginTop: "10px" }}>
            <FormField
              label="Reference (for example a username or ticket number)"
              value={reference}
              onChange={setReference}
              placeholder="For example j.smith or TICKET-1042"
              compactMode={compactMode}
            />
          </div>
        )}

        {auditLog.length > 0 && (
          <>
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
                    <th style={tableHeaderStyle}>Timestamp</th>
                    <th style={tableHeaderStyle}>Reference</th>
                    <th style={tableHeaderStyle}>Status</th>
                    <th style={tableHeaderStyle}>Count</th>
                    <th style={tableHeaderStyle}>Risk</th>
                  </tr>
                </thead>

                <tbody>
                  {auditLog.map((entry, index) => (
                    <tr key={`${entry.timestamp}-${index}`}>
                      <td style={tableCellStyle}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td style={tableCellStyle}>{entry.reference}</td>
                      <td style={tableCellStyle}>
                        <StatusBadge
                          compactMode={compactMode}
                          label={entry.status}
                          status={
                            entry.status === "Breached" ? "error" : "success"
                          }
                        />
                      </td>
                      <td style={tableCellStyle}>
                        {formatBreachCount(entry.count)}
                      </td>
                      <td style={tableCellStyle}>{entry.riskLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ActionRow compactMode={compactMode}>
              <ActionButton
                onClick={exportAuditLog}
                icon={<Download size={14} />}
                variant="primary"
                compactMode={compactMode}
              >
                Export audit log (CSV)
              </ActionButton>

              <CopyButton
                value={auditLogText}
                label="Copy audit log"
                copiedLabel="Copied"
                compactMode={compactMode}
                variant="secondary"
              />

              <ActionButton
                onClick={clearAuditLog}
                icon={<Trash2 size={14} />}
                variant="secondary"
                compactMode={compactMode}
              >
                Clear audit log
              </ActionButton>
            </ActionRow>
          </>
        )}
      </FormSection>

      <FormSection title="Summary" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Status"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={
                  result
                    ? result.found
                      ? "Breached"
                      : "Not found"
                    : "Not checked yet"
                }
                status={
                  result ? (result.found ? "error" : "success") : "neutral"
                }
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Times found"
            value={result ? formatBreachCount(result.count) : "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Risk"
            value={
              result ? (
                <StatusBadge
                  compactMode={compactMode}
                  label={getRiskLabel(result.riskLevel)}
                  status={result.riskStatus}
                />
              ) : (
                "Not found"
              )
            }
            icon={<ShieldAlert size={14} />}
          />

          <InfoTile
            compactMode={compactMode}
            label="Advies"
            value={result?.advice || "Not found"}
          />
        </ResultGrid>

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={result?.hash || ""}
            label="Copy SHA1 hash"
            copiedLabel="Hash copied"
            compactMode={compactMode}
            variant="secondary"
          />

          <CopyButton
            value={summaryText}
            label="Copy result"
            copiedLabel="Result copied"
            compactMode={compactMode}
            variant="secondary"
          />
        </ActionRow>
      </FormSection>

      <FormSection
        title="Generate a new password"
        description="Use the Password Generator to propose a strong, unique replacement straight away."
        compactMode={compactMode}
      >
        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={generateSuggestion}
            icon={<RefreshCw size={14} />}
            variant="primary"
            compactMode={compactMode}
          >
            Generate strong password
          </ActionButton>

          {suggestion && (
            <CopyButton
              value={suggestion}
              label="Copy suggestion"
              copiedLabel="Copied"
              compactMode={compactMode}
              variant="secondary"
            />
          )}
        </ActionRow>

        {suggestion && (
          <div style={{ marginTop: "12px" }}>
            <FormField
              value={suggestion}
              onChange={() => {}}
              compactMode={compactMode}
              mono
              disabled
            />
          </div>
        )}
      </FormSection>

      <FormSection
        title="Bulk check (CSV / list)"
        description={`Useful for customer onboarding or security audits: check up to ${MAX_BULK_PASSWORDS} passwords at once. The checks run one after another (not concurrently) so the Have I Been Pwned API is not overloaded.`}
        compactMode={compactMode}
      >
        <FormField
          label="Passwords (one per line, optionally as reference,password)"
          value={bulkInput}
          onChange={setBulkInput}
          placeholder={"j.jansen,Welkom01!\nservice-backup,P@ssw0rd2024"}
          compactMode={compactMode}
          mono
          textarea
          rows={4}
        />

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={runBulkCheck}
            icon={<Upload size={14} />}
            variant="primary"
            compactMode={compactMode}
            disabled={bulkRunning}
          >
            {bulkRunning ? "Working..." : "Bulk check"}
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
                  <th style={tableHeaderStyle}>Reference</th>
                  <th style={tableHeaderStyle}>Password</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Count</th>
                  <th style={tableHeaderStyle}>Risk</th>
                </tr>
              </thead>

              <tbody>
                {bulkResults.map((entry, index) => (
                  <tr key={`${entry.label}-${index}`}>
                    <td style={tableCellStyle}>{entry.label}</td>
                    <td
                      style={{
                        ...tableCellStyle,
                        fontFamily: "var(--mono, monospace)",
                      }}
                    >
                      {entry.masked}
                    </td>
                    <td style={tableCellStyle}>
                      {entry.error ? (
                        <StatusBadge
                          compactMode={compactMode}
                          label="Error"
                          status="warning"
                        />
                      ) : (
                        <StatusBadge
                          compactMode={compactMode}
                          label={entry.found ? "Breached" : "Not found"}
                          status={entry.found ? "error" : "success"}
                        />
                      )}
                    </td>
                    <td style={tableCellStyle}>
                      {entry.error
                        ? entry.error
                        : formatBreachCount(entry.count)}
                    </td>
                    <td style={tableCellStyle}>
                      {entry.riskLevel ? getRiskLabel(entry.riskLevel) : "-"}
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
