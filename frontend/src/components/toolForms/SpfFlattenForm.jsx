import { useState } from "react";
import { FileSearch, RotateCcw } from "lucide-react";

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

import { flattenSpf } from "../../core/toolEngines/spfFlattenEngine";

export default function SpfFlattenForm({ compactMode = false }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("Enter a domain name or SPF record.");
  const [loading, setLoading] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  const runFlatten = async () => {
    const value = input.trim().replace(/^"|"$/g, "");
    if (!value) {
      setStatus("Enter a domain name or SPF record.");
      return;
    }

    setHasAttempted(true);
    setLoading(true);
    setStatus("Analysing the SPF record...");

    try {
      const isSpfRecord = value.toLowerCase().startsWith("v=spf1");
      const payload = isSpfRecord ? { spfRecord: value } : { domain: value };
      const data = await flattenSpf(payload);

      if (!data.success) {
        setResult(null);
        setStatus(data.error || "SPF flatten failed.");
        return;
      }

      setResult(data);
      const totalIps = data.ip4Count + data.ip6Count;
      setStatus(`${data.dnsLookupCount} lookups, ${totalIps} IPs found.`);
    } catch (error) {
      setResult(null);
      setStatus(error.message || "SPF flatten failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runFlatten();
    }
  };

  const reset = () => {
    setInput("");
    setResult(null);
    setLoading(false);
    setHasAttempted(false);
    setStatus("Enter a domain name or SPF record.");
  };

  const statusVariant = result
    ? result.hasWarnings
      ? "warning"
      : "success"
    : hasAttempted
      ? "danger"
      : "neutral";

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="SPF Flatten"
        description="Analyse an SPF record, follow includes and generate a flattened version with IP ranges."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto auto",
            gap: "10px",
            alignItems: "end",
          }}
        >
          <FormField
            label="Domain or SPF record"
            value={input}
            onChange={setInput}
            onKeyDown={handleKeyDown}
            placeholder={
              "example.nl\nof\nv=spf1 include:spf.protection.outlook.com -all"
            }
            compactMode={compactMode}
            textarea
            rows={3}
            mono
          />

          <ActionButton
            onClick={runFlatten}
            icon={<FileSearch size={14} />}
            variant="primary"
            compactMode={compactMode}
            disabled={loading || !input.trim()}
          >
            {loading ? "Working..." : "Analyse"}
          </ActionButton>

          <ActionButton
            onClick={reset}
            icon={<RotateCcw size={14} />}
            variant="secondary"
            compactMode={compactMode}
            disabled={loading}
          >
            Clear
          </ActionButton>
        </div>

        <StatusMessage status={statusVariant} compactMode={compactMode}>
          {status}
        </StatusMessage>
      </FormSection>

      {result && (
        <>
          <FormSection title="Summary" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Status"
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={result.hasWarnings ? "Warnings" : "Good"}
                    status={result.hasWarnings ? "warning" : "success"}
                  />
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="DNS lookups"
                value={`${result.dnsLookupCount}`}
              />

              <InfoTile
                compactMode={compactMode}
                label="IPv4 addresses"
                value={String(result.ip4Count)}
              />

              <InfoTile
                compactMode={compactMode}
                label="IPv6 addresses"
                value={String(result.ip6Count)}
              />

              <InfoTile
                compactMode={compactMode}
                label="DNS length"
                value={
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <StatusBadge
                      compactMode={compactMode}
                      label={`${result.dnsLength} chars`}
                      status={result.lengthStatus}
                    />
                    <span style={{ fontSize: "11px", opacity: 0.7 }}>
                      Recommended: max 255 • Max: 510
                    </span>
                  </div>
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="Policy"
                value={result.policy}
              />
            </ResultGrid>
            <div
              style={{
                fontSize: "12px",
                opacity: 0.7,
                marginTop: "8px",
                lineHeight: 1.5,
              }}
            >
              <strong>Guidelines:</strong> an SPF record may contain at most 10
              DNS lookups (includes, a, mx, ptr).
              <br />
              The recommended maximum length is 255 characters; some DNS
              providers support up to 510 characters by using multiple strings.
            </div>
          </FormSection>

          {result.warnings?.length > 0 && (
            <FormSection title="Warnings" compactMode={compactMode}>
              <ResultGrid compactMode={compactMode}>
                {result.warnings.map((w, i) => (
                  <InfoTile
                    compactMode={compactMode}
                    key={i}
                    label={`Warning ${i + 1}`}
                    value={w}
                  />
                ))}
              </ResultGrid>
            </FormSection>
          )}

          <FormSection title="Original SPF record" compactMode={compactMode}>
            <FormField
              label=""
              value={result.originalRecord}
              onChange={() => {}}
              compactMode={compactMode}
              textarea
              rows={4}
              mono
              disabled
            />
            <ActionRow compactMode={compactMode}>
              <CopyButton
                value={result.originalRecord}
                label="Copy original"
                copiedLabel="Original copied"
                compactMode={compactMode}
                variant="secondary"
              />
            </ActionRow>
          </FormSection>

          <FormSection title="Flattened SPF record" compactMode={compactMode}>
            <FormField
              label=""
              value={result.flattenedRecord}
              onChange={() => {}}
              compactMode={compactMode}
              textarea
              rows={4}
              mono
              disabled
            />
            <ActionRow compactMode={compactMode}>
              <CopyButton
                value={result.flattenedRecord}
                label="Copy flattened"
                copiedLabel="Flattened copied"
                compactMode={compactMode}
                variant="primary"
              />
            </ActionRow>
          </FormSection>

          {result.ip4Addresses?.length > 0 && (
            <FormSection title="IPv4 addresses" compactMode={compactMode}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "10px",
                }}
              >
                {result.ip4Addresses.map((ip) => (
                  <InfoTile
                    compactMode={compactMode}
                    key={ip}
                    label="IPv4"
                    value={ip}
                  />
                ))}
              </div>
              <ActionRow compactMode={compactMode}>
                <CopyButton
                  value={result.ip4Addresses.join("\n")}
                  label="Copy IPs"
                  copiedLabel="IPs copied"
                  compactMode={compactMode}
                  variant="secondary"
                />
              </ActionRow>
            </FormSection>
          )}

          {result.ip6Addresses?.length > 0 && (
            <FormSection title="IPv6 addresses" compactMode={compactMode}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "10px",
                }}
              >
                {result.ip6Addresses.map((ip) => (
                  <InfoTile
                    compactMode={compactMode}
                    key={ip}
                    label="IPv6"
                    value={ip}
                  />
                ))}
              </div>
              <ActionRow compactMode={compactMode}>
                <CopyButton
                  value={result.ip6Addresses.join("\n")}
                  label="Copy IPs"
                  copiedLabel="IPs copied"
                  compactMode={compactMode}
                  variant="secondary"
                />
              </ActionRow>
            </FormSection>
          )}
        </>
      )}
    </ToolFormLayout>
  );
}
