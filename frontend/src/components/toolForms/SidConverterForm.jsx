import { useEffect, useState, useCallback } from "react";
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
  analyzeSid,
  isValidSid,
  normalizeSid,
  hexToSid,
} from "../../core/toolEngines/sidEngine";

export default function SidConverterForm({ compactMode = false }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("Enter a SID to analyse it.");
  const [hasAttempted, setHasAttempted] = useState(false);

  const normalizedSid = normalizeSid(input);

  const validSid = isValidSid(normalizedSid);

  const runLookup = useCallback(
    (value = input) => {
      const raw = String(value).trim();

      setHasAttempted(true);

      if (!raw) {
        setResult(null);
        setStatus("Enter a SID to analyse it.");
        return;
      }

      const isHexInput =
        /^[0-9A-Fa-f]{16,}$/.test(raw.replace(/\s/g, "")) &&
        !raw.startsWith("S-");

      const normalized = isHexInput
        ? normalizeSid(hexToSid(raw))
        : normalizeSid(raw);

      if (!normalized) {
        setResult(null);
        setStatus("Enter a SID to analyse it.");
        return;
      }

      if (!isValidSid(normalized)) {
        setResult(null);
        setStatus(
          "Invalid SID notation. Use something like S-1-5-21-...-1001, or paste a hex SID.",
        );
        return;
      }

      try {
        const analysis = analyzeSid(normalized);

        setResult(analysis);
        setStatus(
          isHexInput
            ? "Hex SID converted and analysed."
            : "SID analysis complete.",
        );
      } catch (error) {
        setResult(null);
        setStatus(error?.message || "SID analysis failed.");
      }
    },
    [input],
  );

  useEffect(() => {
    if (
      !normalizedSid &&
      !/^[0-9A-Fa-f]{16,}$/.test(input.trim().replace(/\s/g, ""))
    )
      return;
    const timeout = setTimeout(() => {
      runLookup(input);
    }, 400);

    return () => clearTimeout(timeout);
  }, [input, normalizedSid, runLookup]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runLookup(input);
    }
  };

  const reset = () => {
    setInput("");
    setResult(null);
    setHasAttempted(false);
    setStatus("Enter a SID to analyse it.");
  };

  const statusVariant = result
    ? result.known
      ? "success"
      : "neutral"
    : hasAttempted
      ? "danger"
      : "neutral";

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="SID Converter"
        description="Analyse Windows SIDs from Regedit, HKEY_USERS, ACLs or event logs. Paste a SID or hex SID (binary format)."
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
            label="SID"
            value={input}
            onChange={setInput}
            onKeyDown={handleKeyDown}
            placeholder="S-1-5-21-...-1001 or paste a hex SID"
            compactMode={compactMode}
            mono
          />

          <ActionButton
            onClick={() => runLookup(input)}
            icon={<Search size={14} />}
            variant="primary"
            compactMode={compactMode}
            title="Analyse SID"
          >
            Analyse
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
                label={
                  result
                    ? result.known
                      ? "Known SID"
                      : "Analysed"
                    : validSid
                      ? "Valid"
                      : "Invalid"
                }
                status={
                  result
                    ? result.known
                      ? "success"
                      : "warning"
                    : validSid
                      ? "warning"
                      : "error"
                }
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="SID"
            value={result?.sid || normalizedSid || "Not filled in"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Name"
            value={result?.name || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Type"
            value={result?.category || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Description"
            value={result?.description || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="RID"
            value={result?.rid || "Not found"}
          />

          {result?.hex && (
            <InfoTile
              compactMode={compactMode}
              label="Hex (binary)"
              value={
                <span style={{ fontSize: "11px", wordBreak: "break-all" }}>
                  {result.hex}
                </span>
              }
            />
          )}

          {result?.hexRid && (
            <InfoTile
              compactMode={compactMode}
              label="RID (hex)"
              value={result.hexRid}
            />
          )}

          {result?.sddl && (
            <InfoTile
              compactMode={compactMode}
              label="SDDL"
              value={result.sddl}
            />
          )}

          <InfoTile
            compactMode={compactMode}
            label="Revision"
            value={result?.revision || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Identifier Authority"
            value={result?.identifierAuthority || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Sub Authorities"
            value={
              result?.subAuthorities?.length
                ? result.subAuthorities.join(", ")
                : "Not found"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Domain identifier"
            value={result?.domainIdentifier || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Profile hint"
            value={result?.profileHint || "Not found"}
          />

          {result?.sidHistoryInfo && (
            <InfoTile
              compactMode={compactMode}
              label="sIDHistory"
              value={result.sidHistoryInfo}
            />
          )}
        </ResultGrid>

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={result?.sid || normalizedSid}
            label="Copy SID"
            copiedLabel="SID copied"
            compactMode={compactMode}
            variant="primary"
          />

          <CopyButton
            value={result?.name || ""}
            label="Copy name"
            copiedLabel="Name copied"
            compactMode={compactMode}
            variant="secondary"
          />

          {result?.hex && (
            <CopyButton
              value={result.hex}
              label="Copy hex"
              copiedLabel="Hex copied"
              compactMode={compactMode}
              variant="secondary"
            />
          )}
        </ActionRow>
      </FormSection>
    </ToolFormLayout>
  );
}
