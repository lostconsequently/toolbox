import { useEffect, useState } from "react";
import { RotateCcw, ExternalLink, Search } from "lucide-react";

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

import {
  formatDate,
  isValidReputationInput,
  lookupReputation,
  normalizeReputationInput,
} from "../../core/toolEngines/reputationEngine";

export default function ReputationCheckForm({ compactMode = false }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Enter an IP address, domain or hostname to check its reputation.",
  );

  const normalizedInput = normalizeReputationInput(input);

  const validInput = isValidReputationInput(normalizedInput);

  const runLookup = async (value = input) => {
    const normalized = normalizeReputationInput(value);

    if (!normalized) {
      setResult(null);
      setStatus(
        "Enter an IP address, domain or hostname to check its reputation.",
      );
      return;
    }

    if (!isValidReputationInput(normalized)) {
      setResult(null);
      setStatus("Invalid input. Use something like 8.8.8.8 or example.com.");
      return;
    }

    try {
      setStatus("Checking reputation.");

      const lookupResult = await lookupReputation(normalized);

      setResult(lookupResult);

      if (lookupResult.privateAddress) {
        setStatus(
          "Private or local IP address detected. Blacklist checks do not apply to it.",
        );
        return;
      }

      const baseMessage = lookupResult.reputation?.listed
        ? "The input has one or more blacklist listings."
        : "No blacklist listings found in this check.";

      setStatus(
        lookupResult.cached
          ? `${baseMessage} (cached result, at most 5 minutes old)`
          : baseMessage,
      );
    } catch (error) {
      setResult(null);

      setStatus(error?.message || "Reputation check failed.");
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      runLookup(input);
    }, 700);

    return () => clearTimeout(timeout);
  }, [input]);

  const reset = () => {
    setInput("");
    setResult(null);
    setStatus(
      "Enter an IP address, domain or hostname to check its reputation.",
    );
  };

  const reputation = result?.reputation;

  const ipInfo = result?.ipInfo;

  const whois = result?.whois;

  const ssl = result?.ssl;

  const spf = result?.spf;

  const dmarc = result?.dmarc;

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Reputation Check"
        description="Check an IP address, domain or hostname for reputation, blacklist status, Whois and SSL information."
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
            label="IP, domain or hostname"
            value={input}
            onChange={setInput}
            placeholder="For example 8.8.8.8 or example.com"
            compactMode={compactMode}
            mono
          />

          <ActionButton
            onClick={() => runLookup(input)}
            icon={<Search size={14} />}
            variant="primary"
            compactMode={compactMode}
            title="Check reputation"
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
            !normalizedInput ? "neutral" : validInput ? "neutral" : "warning"
          }
          compactMode={compactMode}
        >
          {status}
        </StatusMessage>
      </FormSection>

      <FormSection title="Summary" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Reputation"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={reputation?.label || (validInput ? "Valid" : "Invalid")}
                status={
                  reputation?.status || (validInput ? "warning" : "error")
                }
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Input"
            value={result?.input || normalizedInput || "Not filled in"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Type"
            value={result?.inputType || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Resolved IP"
            value={
              result?.resolvedIp
                ? result.resolvedIps?.length > 1
                  ? `${result.resolvedIp} (1 of ${result.resolvedIps.length})`
                  : result.resolvedIp
                : "Not found"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Other IPs"
            value={
              result?.resolvedIps?.length > 1
                ? result.resolvedIps.slice(1).join("\n")
                : "None"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Blacklists"
            value={
              reputation
                ? `${reputation.listedCount}/${reputation.checkedCount}`
                : "Not checked"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Provider"
            value={ipInfo?.isp || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Organization"
            value={ipInfo?.organization || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="ASN"
            value={ipInfo?.asn || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Land"
            value={ipInfo?.country || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="City"
            value={ipInfo?.city || "Not found"}
          />
        </ResultGrid>

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={result?.input || normalizedInput}
            label="Copy input"
            copiedLabel="Input copied"
            compactMode={compactMode}
            variant="primary"
          />

          <CopyButton
            value={result?.resolvedIp || ""}
            label="Copy IP"
            copiedLabel="IP copied"
            compactMode={compactMode}
            variant="secondary"
          />

          <CopyButton
            value={result ? JSON.stringify(result, null, 2) : ""}
            label="Copy JSON"
            copiedLabel="JSON copied"
            compactMode={compactMode}
            variant="secondary"
          />
        </ActionRow>
      </FormSection>

      <FormSection title="Blacklist checks" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          {reputation?.checks?.length ? (
            reputation.checks.map((check) => (
              <InfoTile
                compactMode={compactMode}
                key={check.zone}
                label={check.name}
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={
                      check.listed
                        ? "Listed"
                        : check.status === "timeout"
                          ? "Timeout"
                          : "Not listed"
                    }
                    status={
                      check.listed
                        ? "error"
                        : check.status === "timeout"
                          ? "warning"
                          : "success"
                    }
                  />
                }
              />
            ))
          ) : (
            <InfoTile
              compactMode={compactMode}
              label="Blacklist checks"
              value="No checks performed"
            />
          )}
        </ResultGrid>
      </FormSection>

      <FormSection title="SPF / DMARC" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="SPF"
            value={
              result?.inputType !== "domain" ? (
                "Not applicable"
              ) : (
                <StatusBadge
                  compactMode={compactMode}
                  label={spf?.present ? "Present" : "Missing"}
                  status={spf?.present ? "success" : "error"}
                />
              )
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="DMARC"
            value={
              result?.inputType !== "domain" ? (
                "Not applicable"
              ) : (
                <StatusBadge
                  compactMode={compactMode}
                  label={dmarc?.present ? "Present" : "Missing"}
                  status={dmarc?.present ? "success" : "error"}
                />
              )
            }
          />
        </ResultGrid>
      </FormSection>

      <FormSection title="Microsoft 365" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Microsoft Delist Portal"
            value="Check Microsoft 365 blocks"
          />

          <InfoTile
            compactMode={compactMode}
            label="Use when"
            value="Mail to M365 is being rejected"
          />
        </ResultGrid>

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={() =>
              window.open(
                "https://sender.office.com/",
                "_blank",
                "noopener,noreferrer",
              )
            }
            icon={<ExternalLink size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title="Open Microsoft Delist Portal"
          >
            Open Microsoft Delist Portal
          </ActionButton>
        </ActionRow>
      </FormSection>

      <FormSection title="Whois" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Domain"
            value={whois?.domain || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Registrar"
            value={whois?.registrar || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Registered"
            value={formatDate(whois?.registered)}
          />

          <InfoTile
            compactMode={compactMode}
            label="Expires on"
            value={formatDate(whois?.expires)}
          />

          <InfoTile
            compactMode={compactMode}
            label="Nameservers"
            value={
              whois?.nameservers?.length
                ? whois.nameservers.join("\n")
                : "Not found"
            }
          />
        </ResultGrid>
      </FormSection>

      <FormSection title="SSL" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Status"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={
                  ssl
                    ? ssl.daysRemaining <= 30
                      ? "Expiring soon"
                      : "Valid"
                    : "Not found"
                }
                status={
                  ssl
                    ? ssl.daysRemaining <= 30
                      ? "warning"
                      : "success"
                    : "neutral"
                }
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Common Name"
            value={ssl?.commonName || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Issuer"
            value={ssl?.issuer || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Expires on"
            value={formatDate(ssl?.validTo)}
          />

          <InfoTile
            compactMode={compactMode}
            label="Days remaining"
            value={
              ssl?.daysRemaining === null || ssl?.daysRemaining === undefined
                ? "Not found"
                : `${ssl.daysRemaining} days`
            }
          />
        </ResultGrid>
      </FormSection>
    </ToolFormLayout>
  );
}
