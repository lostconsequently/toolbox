import { useEffect, useState } from "react";
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

import {
  describeDomainStatus,
  formatDate,
  isValidDomain,
  lookupWhois,
  normalizeDomain,
} from "../../core/toolEngines/whoisEngine";

export default function WhoisLookupForm({ compactMode = false }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Enter a domain to look up Whois information.",
  );

  const normalizedDomain = normalizeDomain(input);

  const validDomain = isValidDomain(normalizedDomain);

  const runLookup = async (value = input) => {
    const normalized = normalizeDomain(value);

    if (!normalized) {
      setResult(null);
      setStatus("Enter a domain to look up Whois information.");
      return;
    }

    if (!isValidDomain(normalized)) {
      setResult(null);
      setStatus("Invalid domain. Use something like example.com.");
      return;
    }

    try {
      setStatus("Looking up Whois information.");

      const lookupResult = await lookupWhois(normalized);

      setResult(lookupResult);
      setStatus("Whois information found.");
    } catch (error) {
      setResult(null);

      setStatus(error?.message || "Whois lookup failed.");
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      runLookup(input);
    }, 600);

    return () => clearTimeout(timeout);
  }, [input]);

  const reset = () => {
    setInput("");
    setResult(null);
    setStatus("Enter a domain to look up Whois information.");
  };

  const expirationStatus =
    result?.daysUntilExpiration === null ||
    result?.daysUntilExpiration === undefined
      ? "neutral"
      : result.daysUntilExpiration <= 30
        ? "error"
        : result.daysUntilExpiration <= 90
          ? "warning"
          : "success";

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Whois lookup"
        description="Look up RDAP Whois information for a domain."
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
            label="Domain"
            value={input}
            onChange={setInput}
            placeholder="For example example.com"
            compactMode={compactMode}
            mono
          />

          <ActionButton
            onClick={() => runLookup(input)}
            icon={<Search size={14} />}
            variant="primary"
            compactMode={compactMode}
            title="Look up Whois information"
          >
            Look up
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
            !normalizedDomain ? "neutral" : validDomain ? "neutral" : "warning"
          }
          compactMode={compactMode}
        >
          {status}
        </StatusMessage>
      </FormSection>

      <FormSection title="Result" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Status"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={result ? "Found" : validDomain ? "Valid" : "Invalid"}
                status={result ? "success" : validDomain ? "warning" : "error"}
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Domain"
            value={result?.domain || normalizedDomain || "Not filled in"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Registrar"
            value={
              result?.registrar
                ? result.registrarIanaId
                  ? `${result.registrar} (IANA: ${result.registrarIanaId})`
                  : result.registrar
                : "Not found"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="DNSSEC"
            value={
              !result ? "Not found" : result.dnssec ? "Active" : "Inactive"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Registered"
            value={formatDate(result?.registered)}
          />

          <InfoTile
            compactMode={compactMode}
            label="Last updated"
            value={formatDate(result?.updated)}
          />

          <InfoTile
            compactMode={compactMode}
            label="Expires on"
            value={formatDate(result?.expires)}
          />

          <InfoTile
            compactMode={compactMode}
            label="Days remaining"
            value={
              result?.daysUntilExpiration === null ||
              result?.daysUntilExpiration === undefined
                ? "Not found"
                : `${result.daysUntilExpiration} days`
            }
            color={
              expirationStatus === "success"
                ? "#16a34a"
                : expirationStatus === "warning"
                  ? "#f59e0b"
                  : expirationStatus === "error"
                    ? "#dc2626"
                    : undefined
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Handle"
            value={result?.handle || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Domain status"
            value={
              result?.status?.length
                ? result.status.map(describeDomainStatus).join(", ")
                : "Not found"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Nameservers"
            value={
              result?.nameservers?.length
                ? result.nameservers.join("\n")
                : "Not found"
            }
          />
        </ResultGrid>

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={result?.domain || normalizedDomain}
            label="Copy domain"
            copiedLabel="Domain copied"
            compactMode={compactMode}
            variant="primary"
          />

          <CopyButton
            value={
              result?.nameservers?.length ? result.nameservers.join("\n") : ""
            }
            label="Copy nameservers"
            copiedLabel="Nameservers copied"
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
    </ToolFormLayout>
  );
}
