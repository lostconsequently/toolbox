import { useState } from "react";

import { RotateCcw, Search, ShieldCheck, ShieldX } from "lucide-react";

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

import { lookupReverseDns } from "../../core/toolEngines/reverseDnsEngine";

export default function ReverseDnsForm({ compactMode = false }) {
  const [input, setInput] = useState("");

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("Enter an IP address.");

  const runLookup = async (value = input) => {
    if (!value.trim()) {
      setResult(null);

      setStatus("Enter an IP address.");

      return;
    }

    setLoading(true);

    setStatus("Checking...");

    try {
      const lookupResult = await lookupReverseDns(value);

      setResult(lookupResult);

      setStatus(
        lookupResult.found ? "PTR record found." : "No PTR record found.",
      );
    } catch (error) {
      setResult(null);

      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setInput("");
    setResult(null);
    setLoading(false);
    setStatus("Enter an IP address.");
  };

  const statusVariant = result
    ? result.found
      ? "success"
      : "warning"
    : "neutral";

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Reverse DNS Lookup"
        description="Look up PTR records for IPv4 and IPv6 addresses."
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
            label="IP address"
            value={input}
            onChange={setInput}
            placeholder="8.8.8.8 of 2001:db8::1"
            compactMode={compactMode}
            mono
          />

          <ActionButton
            onClick={() => runLookup(input)}
            icon={<Search size={14} />}
            variant="primary"
            compactMode={compactMode}
            disabled={loading}
          >
            {loading ? "Working..." : "Look up"}
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

      <FormSection title="Result" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Status"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={result?.found ? "Found" : "Not found"}
                status={result?.found ? "success" : "warning"}
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="IP"
            value={result?.ip || "-"}
          />

          <InfoTile
            compactMode={compactMode}
            label="PTR Record"
            value={
              result?.hostnames?.length ? result.hostnames.join("\n") : "-"
            }
          />

          {result?.found && (
            <InfoTile
              compactMode={compactMode}
              label="PTR validation"
              icon={
                result.ptrValid ? (
                  <ShieldCheck size={14} color="#16a34a" />
                ) : (
                  <ShieldX
                    size={14}
                    color={result.forwardError ? "#d97706" : "#dc2626"}
                  />
                )
              }
              value={
                <StatusBadge
                  compactMode={compactMode}
                  label={
                    result.ptrValid
                      ? "Valid"
                      : result.forwardError
                        ? "Could not verify"
                        : "Invalid"
                  }
                  status={
                    result.ptrValid
                      ? "success"
                      : result.forwardError
                        ? "warning"
                        : "error"
                  }
                />
              }
            />
          )}

          {result?.ttl != null && (
            <InfoTile
              compactMode={compactMode}
              label="TTL"
              value={`${result.ttl} sec`}
            />
          )}
        </ResultGrid>

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={result?.hostnames?.join("\n") || ""}
            label="Copy PTR"
            copiedLabel="PTR copied"
            compactMode={compactMode}
            variant="primary"
          />
        </ActionRow>
      </FormSection>
    </ToolFormLayout>
  );
}
