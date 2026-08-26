import { useState } from "react";
import {
  RotateCcw,
  Search,
  Mail,
  ShieldCheck,
  Fingerprint,
  Globe,
} from "lucide-react";

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
  dnsPropagationRecordTypes,
  lookupDnsPropagation,
  normalizeDnsName,
} from "../../core/toolEngines/dnsPropagationEngine";

const emptyState = {
  name: "",
  recordType: "A",
  expectedValue: "",
  customResolver: "",
};

function getBaseDomain(name) {
  return normalizeDnsName(name);
}

const m365Presets = [
  { label: "Autodiscover", icon: Mail, type: "CNAME", suffix: "autodiscover" },
  {
    label: "DKIM s1",
    icon: Fingerprint,
    type: "CNAME",
    suffix: "selector1._domainkey",
  },
  {
    label: "DKIM s2",
    icon: Fingerprint,
    type: "CNAME",
    suffix: "selector2._domainkey",
  },
  { label: "DMARC", icon: ShieldCheck, type: "TXT", suffix: "_dmarc" },
  { label: "SPF", icon: Globe, type: "TXT", suffix: "" },
];

const segmentColors = {
  include: "#f59e0b",
  ip4: "#3b82f6",
  ip6: "#8b5cf6",
  a: "#10b981",
  mx: "#06b6d4",
  ptr: "#ec4899",
  exists: "#f97316",
  redirect: "#ef4444",
  policy: "#ef4444",
  version: "#6b7280",
  unknown: "#9ca3af",
};

function getSegmentLabel(segment) {
  if (segment.type === "include") return "Include";
  if (segment.type === "ip4") return "IPv4";
  if (segment.type === "ip6") return "IPv6";
  if (segment.type === "policy") return "Policy";
  if (segment.type === "version") return "Version";
  if (segment.type === "redirect") return "Redirect";
  if (segment.type === "exists") return "Exists";
  return segment.type.charAt(0).toUpperCase() + segment.type.slice(1);
}

function getMatchLabel(matchStatus) {
  if (matchStatus === "match") {
    return "Match";
  }

  if (matchStatus === "noMatch") {
    return "No match";
  }

  return "Not checked";
}

function getMatchStatus(matchStatus) {
  if (matchStatus === "match") {
    return "success";
  }

  if (matchStatus === "noMatch") {
    return "warning";
  }

  return "neutral";
}

export default function DnsPropagationViewerForm({ compactMode = false }) {
  const [values, setValues] = useState(emptyState);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Enter a domain and record type to check DNS propagation.",
  );
  const [loading, setLoading] = useState(false);

  const updateValue = (key, value) => {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  };

  const reset = () => {
    setValues(emptyState);
    setResult(null);
    setStatus("Enter a domain and record type to check DNS propagation.");
  };

  const runLookup = async () => {
    const normalizedName = normalizeDnsName(values.name);

    if (!normalizedName) {
      setResult(null);
      setStatus("Enter a valid domain or hostname.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Checking DNS resolvers.");

      const lookupResult = await lookupDnsPropagation(values);

      setResult(lookupResult);

      if (lookupResult.status === "success") {
        setStatus("All resolvers return a usable result.");
      } else if (lookupResult.status === "warning") {
        setStatus("Not all resolvers return the same or a complete result.");
      } else {
        setStatus("No usable DNS result found.");
      }
    } catch (error) {
      setResult(null);
      setStatus(error?.message || "DNS propagation check failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="DNS Propagation Viewer"
        description="Check a DNS record through public resolvers such as Google Public DNS and Cloudflare 1.1.1.1."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 180px",
            gap: "10px",
          }}
        >
          <FormField
            label="Domain or hostname"
            value={values.name}
            onChange={(value) => updateValue("name", value)}
            placeholder="For example example.com or selector._domainkey.example.com"
            compactMode={compactMode}
            mono
          />

          <SelectField
            label="Record type"
            value={values.recordType}
            onChange={(value) => updateValue("recordType", value)}
            options={dnsPropagationRecordTypes}
            compactMode={compactMode}
          />
        </div>

        <div
          style={{
            marginTop: "12px",
          }}
        >
          <FormField
            label="Expected value"
            value={values.expectedValue}
            onChange={(value) => updateValue("expectedValue", value)}
            placeholder="Optional. For example include:spf.protection.outlook.com or mail.protection.outlook.com"
            compactMode={compactMode}
            textarea
            rows={3}
            mono
          />
        </div>

        <FormField
          label="Custom resolver (optional)"
          value={values.customResolver}
          onChange={(value) => updateValue("customResolver", value)}
          placeholder="E.g. 8.26.56.26"
          compactMode={compactMode}
          mono
        />

        <div
          style={{
            marginTop: "12px",
          }}
        >
          <div
            style={{
              color: "var(--subtle)",
              fontSize: compactMode ? "11px" : "12px",
              marginBottom: "6px",
            }}
          >
            M365 presets (fill in domain and record type)
          </div>

          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            {m365Presets.map((preset) => {
              const Icon = preset.icon;
              return (
                <ActionButton
                  key={preset.label}
                  onClick={() => {
                    const base = getBaseDomain(values.name);
                    if (!base) return;
                    const host = preset.suffix
                      ? `${preset.suffix}.${base}`
                      : base;
                    updateValue("name", host);
                    updateValue("recordType", preset.type);
                  }}
                  icon={<Icon size={14} />}
                  variant="secondary"
                  compactMode={compactMode}
                  title={`${preset.label} (${preset.type})`}
                >
                  {preset.label}
                </ActionButton>
              );
            })}
          </div>
        </div>

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={runLookup}
            icon={<Search size={14} />}
            variant="primary"
            compactMode={compactMode}
            title="Check DNS propagation"
            disabled={loading}
          >
            {loading ? "Checking..." : "Check"}
          </ActionButton>

          <ActionButton
            onClick={reset}
            icon={<RotateCcw size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title="Clear fields"
          >
            Clear
          </ActionButton>
        </ActionRow>

        <StatusMessage
          status={result?.status || "neutral"}
          compactMode={compactMode}
        >
          {status}
        </StatusMessage>
      </FormSection>

      {result && (
        <>
          <FormSection title="Summary" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Domain"
                value={result.name}
              />
              <InfoTile
                compactMode={compactMode}
                label="Record type"
                value={result.recordType}
              />
              <InfoTile
                compactMode={compactMode}
                label="Resolvers"
                value={String(result.resolverCount)}
              />
              <InfoTile
                compactMode={compactMode}
                label="Found"
                value={`${result.foundCount} of ${result.resolverCount}`}
              />
              <InfoTile
                compactMode={compactMode}
                label="Status"
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={
                      result.status === "success"
                        ? "Good"
                        : result.status === "warning"
                          ? "Note"
                          : "Not found"
                    }
                    status={result.status}
                  />
                }
              />
              {result.hasExpectedValue && (
                <InfoTile
                  compactMode={compactMode}
                  label="Matches"
                  value={`${result.matchCount} of ${result.resolverCount}`}
                />
              )}
              {result.spfIncludeCount > 0 && (
                <InfoTile
                  compactMode={compactMode}
                  label="SPF lookups"
                  value={
                    <StatusBadge
                      compactMode={compactMode}
                      label={`${result.spfIncludeCount}/10`}
                      status={result.spfStatus}
                    />
                  }
                />
              )}
            </ResultGrid>
          </FormSection>

          <FormSection title="Resolver results" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              {result.resolverResults.map((resolverResult) => (
                <InfoTile
                  compactMode={compactMode}
                  key={resolverResult.resolverId}
                  label={resolverResult.resolver}
                  value={
                    <div
                      style={{
                        display: "grid",
                        gap: "6px",
                      }}
                    >
                      <StatusBadge
                        compactMode={compactMode}
                        label={
                          resolverResult.status === "success"
                            ? "Success"
                            : resolverResult.status === "warning"
                              ? "Warning"
                              : "Error"
                        }
                        status={resolverResult.status}
                      />

                      <div>TTL: {resolverResult.ttl ?? "-"}</div>

                      <div>Answers: {resolverResult.answerCount}</div>

                      {result.hasExpectedValue && (
                        <StatusBadge
                          compactMode={compactMode}
                          label={getMatchLabel(resolverResult.matchStatus)}
                          status={getMatchStatus(resolverResult.matchStatus)}
                        />
                      )}

                      {resolverResult.answers.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: compactMode ? "6px" : "8px",
                          }}
                        >
                          {resolverResult.answers.map((answer, ai) => {
                            if (
                              answer.segments &&
                              answer.segments.segments.length
                            ) {
                              return (
                                <div
                                  key={ai}
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "4px",
                                    fontSize: compactMode ? "11px" : "12px",
                                  }}
                                >
                                  {answer.segments.segments.map((seg, si) => (
                                    <span
                                      key={si}
                                      title={getSegmentLabel(seg)}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        borderRadius: "4px",
                                        padding: "2px 6px",
                                        background: "var(--overlay)",
                                        border: `1px solid ${segmentColors[seg.type] || "#9ca3af"}`,
                                        color:
                                          segmentColors[seg.type] || "#9ca3af",
                                        fontSize: compactMode ? "10px" : "11px",
                                        fontFamily: "monospace",
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {seg.value}
                                    </span>
                                  ))}
                                </div>
                              );
                            }
                            return (
                              <pre
                                key={ai}
                                style={{
                                  margin: 0,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  fontSize: compactMode ? "11px" : "12px",
                                }}
                              >
                                {answer.data}
                              </pre>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  }
                />
              ))}
            </ResultGrid>
          </FormSection>

          <ActionRow compactMode={compactMode}>
            <CopyButton
              value={result.plainText}
              label="Copy result"
              copiedLabel="Result copied"
              compactMode={compactMode}
              variant="primary"
            />

            <CopyButton
              value={JSON.stringify(result, null, 2)}
              label="Copy JSON"
              copiedLabel="JSON copied"
              compactMode={compactMode}
              variant="secondary"
            />
          </ActionRow>
        </>
      )}
    </ToolFormLayout>
  );
}
