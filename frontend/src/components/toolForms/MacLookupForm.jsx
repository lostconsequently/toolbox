import { useEffect, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import FormSection from "./shared/FormSection";
import InfoTile from "./shared/InfoTile";
import ActionButton from "./shared/ActionButton";
import FormField from "./shared/FormField";
import CopyButton from "./shared/CopyButton";
import StatusBadge from "./shared/StatusBadge";
import ToolFormLayout from "./shared/ToolFormLayout";
import ResultGrid from "./shared/ResultGrid";
import StatusMessage from "./shared/StatusMessage";
import ActionRow from "./shared/ActionRow";

import {
  getOuiPrefix,
  isValidMacAddress,
  lookupMacVendor,
  normalizeMacAddress,
} from "../../core/toolEngines/macEngine";

function getAddressTypeLabel(result) {
  if (!result || !result.valid) {
    return "-";
  }

  if (result.specialRange) {
    return result.specialRange.name;
  }

  if (result.multicast) {
    return "Multicast";
  }

  if (result.locallyAdministered) {
    return "Locally administered";
  }

  return "Universal (manufacturer)";
}

export default function MacLookupForm({ compactMode = false }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Enter a MAC address to find the manufacturer.",
  );

  const normalizedMac = normalizeMacAddress(input);

  const validMac = isValidMacAddress(input);

  const runLookup = async (value = input) => {
    const normalized = normalizeMacAddress(value);

    if (!normalized) {
      setResult(null);
      setStatus("Enter a MAC address to find the manufacturer.");
      return;
    }

    if (!isValidMacAddress(normalized)) {
      setResult({
        valid: false,
        macAddress: normalized,
        ouiPrefix: getOuiPrefix(normalized),
        vendor: "Not found",
      });
      setStatus("Invalid MAC address. Use 12 hexadecimal characters.");
      return;
    }

    try {
      setStatus("Looking up the vendor.");

      const lookupResult = await lookupMacVendor(normalized);

      setResult(lookupResult);

      if (lookupResult.specialRange) {
        setStatus(
          `Special address recognised: ${lookupResult.specialRange.description}.`,
        );
      } else if (lookupResult.lookupError) {
        setStatus(lookupResult.lookupError);
      } else {
        setStatus("Vendor found.");
      }
    } catch (error) {
      setResult({
        valid: true,
        macAddress: normalized,
        ouiPrefix: getOuiPrefix(normalized),
        vendor: "Not found",
        multicast: false,
        locallyAdministered: false,
        specialRange: null,
        deviceCategory: null,
        lookupError: error?.message || "MAC lookup failed.",
      });

      setStatus(error?.message || "MAC lookup failed.");
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      runLookup(input);
    }, 500);

    return () => clearTimeout(timeout);
  }, [input]);

  const reset = () => {
    setInput("");
    setResult(null);
    setStatus("Enter a MAC address to find the manufacturer.");
  };
  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="MAC address"
        description="Enter a MAC address to look up the manufacturer and OUI prefix."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto auto",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <FormField
            value={input}
            onChange={setInput}
            placeholder="For example 00:1A:2B:3C:4D:5E"
            compactMode={compactMode}
            mono
          />

          <ActionButton
            onClick={() => runLookup(input)}
            icon={<Search size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title="Look up the vendor again"
          >
            Search
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
            !normalizedMac
              ? "neutral"
              : !validMac
                ? "warning"
                : result?.specialRange
                  ? "success"
                  : result?.lookupError
                    ? "warning"
                    : "neutral"
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
            label="Normalised MAC"
            value={normalizedMac || "Not filled in"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Status"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={validMac ? "Valid" : "Invalid"}
                status={validMac ? "success" : "warning"}
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Address type"
            value={getAddressTypeLabel(result)}
          />

          <InfoTile
            compactMode={compactMode}
            label="OUI prefix"
            value={getOuiPrefix(input)}
          />

          <InfoTile
            compactMode={compactMode}
            label="Vendor"
            value={result?.vendor || "Not found"}
          />

          {result?.deviceCategory && (
            <InfoTile
              compactMode={compactMode}
              label="Device category"
              value={result.deviceCategory}
            />
          )}
        </ResultGrid>

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={normalizedMac}
            label="Copy MAC"
            copiedLabel="MAC copied"
            compactMode={compactMode}
            variant="primary"
          />

          <CopyButton
            value={result?.vendor || ""}
            label="Copy vendor"
            copiedLabel="Vendor copied"
            compactMode={compactMode}
            variant="secondary"
          />
        </ActionRow>
      </FormSection>
    </ToolFormLayout>
  );
}
