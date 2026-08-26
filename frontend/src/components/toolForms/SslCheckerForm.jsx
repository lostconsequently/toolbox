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
  formatDate,
  lookupSsl,
  normalizeHost,
} from "../../core/toolEngines/sslEngine";

export default function SslCheckerForm({ compactMode = false }) {
  const [input, setInput] = useState("");
  const [port, setPort] = useState("443");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Enter a hostname to look up SSL information.",
  );

  const normalizedHost = normalizeHost(input);

  const runLookup = async (value = input, portValue = port) => {
    const normalized = normalizeHost(value);

    if (!normalized) {
      setResult(null);
      setStatus("Enter a hostname to look up SSL information.");
      return;
    }

    try {
      setStatus("Checking the SSL certificate.");

      const lookupResult = await lookupSsl(normalized, portValue || 443);

      setResult(lookupResult);

      setStatus("SSL certificate retrieved successfully.");
    } catch (error) {
      setResult(null);

      setStatus(error?.message || "SSL check failed.");
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      runLookup(input, port);
    }, 600);

    return () => clearTimeout(timeout);
  }, [input, port]);

  const reset = () => {
    setInput("");
    setPort("443");
    setResult(null);
    setStatus("Enter a hostname to look up SSL information.");
  };

  const deprecatedProtocol =
    result?.protocol === "TLSv1" || result?.protocol === "TLSv1.1";

  const sslStatus =
    result?.daysRemaining === null || result?.daysRemaining === undefined
      ? "neutral"
      : result.daysRemaining <= 30
        ? "error"
        : result.daysRemaining <= 60
          ? "warning"
          : "success";

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="SSL Checker"
        description="Check the SSL certificates of websites."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 90px auto auto",
            gap: "10px",
            alignItems: "end",
          }}
        >
          <FormField
            label="Hostname"
            value={input}
            onChange={setInput}
            placeholder="For example portal.microsoft.com"
            compactMode={compactMode}
            mono
          />

          <FormField
            label="Port"
            value={port}
            onChange={setPort}
            placeholder="443"
            compactMode={compactMode}
            mono
          />

          <ActionButton
            onClick={() => runLookup(input, port)}
            icon={<Search size={14} />}
            variant="primary"
            compactMode={compactMode}
            title="Run the SSL check"
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

        <StatusMessage status="neutral" compactMode={compactMode}>
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
                label={
                  !result
                    ? "Not checked"
                    : sslStatus === "success"
                      ? "Valid"
                      : sslStatus === "warning"
                        ? "Expiring soon"
                        : "Expiring soon"
                }
                status={sslStatus}
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Host"
            value={result?.host || normalizedHost || "Not filled in"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Common Name"
            value={result?.commonName || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Issuer"
            value={result?.issuer || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Valid from"
            value={formatDate(result?.validFrom)}
          />

          <InfoTile
            compactMode={compactMode}
            label="Expires on"
            value={formatDate(result?.validTo)}
          />

          <InfoTile
            compactMode={compactMode}
            label="Days remaining"
            value={
              result?.daysRemaining === null ||
              result?.daysRemaining === undefined
                ? "Not found"
                : `${result.daysRemaining} days`
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Wildcard"
            value={result?.wildcard ? "Yes" : "No"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Self Signed"
            value={result?.selfSigned ? "Yes" : "No"}
          />

          <InfoTile
            compactMode={compactMode}
            label="TLS protocol"
            value={
              !result?.protocol ? (
                "Not found"
              ) : (
                <StatusBadge
                  compactMode={compactMode}
                  label={
                    deprecatedProtocol
                      ? `${result.protocol} (outdated)`
                      : result.protocol
                  }
                  status={deprecatedProtocol ? "error" : "success"}
                />
              )
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Cipher suite"
            value={result?.cipher || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Certificate chain (received, not validated)"
            value={
              !result
                ? "Not found"
                : result.chainComplete
                  ? `${result.chainLength} certificates received up to the root/self-signed certificate`
                  : "Incomplete (an intermediate may be missing)"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="SAN"
            value={result?.san?.length ? result.san.join("\n") : "Not found"}
          />
        </ResultGrid>

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={result?.host || normalizedHost}
            label="Copy host"
            copiedLabel="Host copied"
            compactMode={compactMode}
            variant="primary"
          />

          <CopyButton
            value={result?.commonName || ""}
            label="Copy CN"
            copiedLabel="CN copied"
            compactMode={compactMode}
            variant="secondary"
          />

          <CopyButton
            value={result?.san?.length ? result.san.join("\n") : ""}
            label="Copy SAN"
            copiedLabel="SAN copied"
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
