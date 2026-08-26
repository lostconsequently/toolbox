import { useEffect, useState } from "react";
import { Locate, RotateCcw, Search } from "lucide-react";
import FormSection from "./shared/FormSection";
import InfoTile from "./shared/InfoTile";
import ActionButton from "./shared/ActionButton";
import FormField from "./shared/FormField";
import CopyButton from "./shared/CopyButton";
import StatusBadge from "./shared/StatusBadge";
import ToolFormLayout from "./shared/ToolFormLayout";
import ResultGrid from "./shared/ResultGrid";
import ActionRow from "./shared/ActionRow";

import {
  detectOwnIp,
  isLikelyIpAddress,
  lookupIpAddress,
  normalizeIpInput,
} from "../../core/toolEngines/ipEngine";

export default function IpLookupForm({ compactMode = false }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Enter an IP address to look up information.",
  );
  const [detectingOwnIp, setDetectingOwnIp] = useState(false);

  const normalizedInput = normalizeIpInput(input);

  const validInput = isLikelyIpAddress(normalizedInput);

  const runLookup = async (value = input) => {
    const normalized = normalizeIpInput(value);

    if (!normalized) {
      setResult(null);
      setStatus("Enter an IP address to look up information.");
      return;
    }

    if (!isLikelyIpAddress(normalized)) {
      setResult(null);
      setStatus("Invalid IP address. Use a valid IPv4 or IPv6 address.");
      return;
    }

    try {
      setStatus("Looking up IP information.");

      const lookupResult = await lookupIpAddress(normalized);

      setResult(lookupResult);

      if (lookupResult.privateAddress) {
        setStatus(`${lookupResult.specialLabel} address detected.`);
      } else {
        setStatus("IP information found.");
      }
    } catch (error) {
      setResult(null);

      setStatus(error?.message || "IP lookup failed.");
    }
  };

  const detectAndLookupOwnIp = async () => {
    setDetectingOwnIp(true);
    setStatus("Detecting your own public IP.");

    try {
      const ownIp = await detectOwnIp();

      setInput(ownIp);
    } catch (error) {
      setResult(null);
      setStatus(error?.message || "Could not detect your own IP.");
    } finally {
      setDetectingOwnIp(false);
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
    setStatus("Enter an IP address to look up information.");
  };

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="IP address"
        description="Enter an IPv4 or IPv6 address to look up network and location information."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto auto auto",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <FormField
            value={input}
            onChange={setInput}
            placeholder="For example 8.8.8.8"
            compactMode={compactMode}
            mono
          />

          <ActionButton
            onClick={() => runLookup(input)}
            icon={<Search size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title="Look up the IP again"
          >
            Search
          </ActionButton>

          <ActionButton
            onClick={detectAndLookupOwnIp}
            icon={<Locate size={14} />}
            variant="secondary"
            compactMode={compactMode}
            disabled={detectingOwnIp}
            title="Detect the public IP this browser goes out with"
          >
            {detectingOwnIp ? "Working..." : "My IP"}
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

        <div
          style={{
            marginTop: "10px",
            color: validInput || !normalizedInput ? "var(--subtle)" : "#f59e0b",
            fontSize: "13px",
          }}
        >
          {status}
        </div>
      </FormSection>

      <FormSection title="Result" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="IP address"
            value={result?.ip || normalizedInput || "Not filled in"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Status"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={result ? "Found" : validInput ? "Valid" : "Invalid"}
                status={result ? "success" : validInput ? "warning" : "error"}
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Type"
            value={result?.ipType || "Unknown"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Land"
            value={result?.country || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Region"
            value={result?.region || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="City"
            value={result?.city || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Provider"
            value={result?.isp || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Organization"
            value={result?.organization || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="ASN"
            value={result?.asn || "Not found"}
          />

          {result?.hostingProvider && (
            <InfoTile
              compactMode={compactMode}
              label="Hosting / datacenter"
              value={
                <StatusBadge
                  compactMode={compactMode}
                  label={result.hostingProvider}
                  status="warning"
                />
              }
            />
          )}

          <InfoTile
            compactMode={compactMode}
            label="Domain"
            value={result?.domain || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Time zone"
            value={result?.timezone || "Not found"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Coordinates"
            value={
              result?.latitude !== null &&
              result?.latitude !== undefined &&
              result?.longitude !== null &&
              result?.longitude !== undefined
                ? `${result.latitude}, ${result.longitude}`
                : "Not found"
            }
          />
        </ResultGrid>

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={result?.ip || normalizedInput}
            label="Copy IP"
            copiedLabel="IP copied"
            compactMode={compactMode}
            variant="primary"
          />

          <CopyButton
            value={result?.isp || ""}
            label="Copy provider"
            copiedLabel="Provider copied"
            compactMode={compactMode}
            variant="secondary"
          />

          <CopyButton
            value={result?.organization || ""}
            label="Copy organisation"
            copiedLabel="Organisation copied"
            compactMode={compactMode}
            variant="secondary"
          />

          {result && (
            <CopyButton
              value={[
                `IP: ${result.ip}`,
                `Type: ${result.ipType}`,
                result.privateAddress
                  ? `Adrestype: ${result.specialLabel}`
                  : [
                      `Land: ${result.country}`,
                      `Region: ${result.region}`,
                      `City: ${result.city}`,
                      `Provider: ${result.isp}`,
                      `Organization: ${result.organization}`,
                      `ASN: ${result.asn}`,
                      result.hostingProvider
                        ? `Hosting/datacenter: ${result.hostingProvider}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join("\n"),
              ].join("\n")}
              label="Copy summary"
              copiedLabel="Copied"
              compactMode={compactMode}
              variant="secondary"
            />
          )}
        </ActionRow>
      </FormSection>
    </ToolFormLayout>
  );
}
