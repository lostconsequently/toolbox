import { useState } from "react";
import { FileSearch, RotateCcw, Search } from "lucide-react";

import FormSection from "./shared/FormSection";
import ActionButton from "./shared/ActionButton";
import ToolFormLayout from "./shared/ToolFormLayout";
import ResultGrid from "./shared/ResultGrid";
import InfoTile from "./shared/InfoTile";
import StatusBadge from "./shared/StatusBadge";
import StatusMessage from "./shared/StatusMessage";
import ActionRow from "./shared/ActionRow";
import CopyButton from "./shared/CopyButton";
import FormField from "./shared/FormField";

import {
  analyzeBsodDump,
  lookupBsodStopCode,
} from "../../core/toolEngines/bsodEngine";

export default function BsodAnalyzerForm({ compactMode = false }) {
  const [file, setFile] = useState(null);

  const [result, setResult] = useState(null);

  const [status, setStatus] = useState(
    "Upload a .dmp file from C:\\Windows\\Minidump.",
  );

  const [running, setRunning] = useState(false);

  const [manualCode, setManualCode] = useState("");
  const [manualResult, setManualResult] = useState(null);
  const [manualStatus, setManualStatus] = useState(
    "Enter a stop code (for example IRQL_NOT_LESS_OR_EQUAL or 0x0000000A).",
  );
  const [manualRunning, setManualRunning] = useState(false);

  const analysis = result?.analysis;

  const likelyDriver = analysis?.likelyDriver;

  const visibleModules = analysis?.moduleSignals?.slice(0, 8) || [];

  const interestingLines = analysis?.errorLines || [];

  const firmwareReferences = analysis?.firmwareReferences || [];

  const errorLines = interestingLines.filter((line) =>
    line.includes("[ERROR]"),
  );

  const infoLines = interestingLines.filter((line) => line.includes("[INFO]"));
  const visibleDrivers =
    analysis?.drivers
      ?.filter((driver) => driver.name.endsWith(".sys"))
      .slice(0, 12) || [];

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;

    setFile(selectedFile);
    setResult(null);

    if (selectedFile) {
      setStatus(`Selected: ${selectedFile.name}`);
    } else {
      setStatus("Upload a .dmp file from C:\\Windows\\Minidump.");
    }
  };

  const runAnalysis = async () => {
    try {
      setRunning(true);
      setStatus("Analysing the minidump.");

      const response = await analyzeBsodDump(file);

      setResult(response);

      setStatus("Analysis complete.");
    } catch (error) {
      setResult(null);

      setStatus(error?.message || "BSOD analysis failed.");
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setStatus("Upload a .dmp file from C:\\Windows\\Minidump.");
  };

  const runManualLookup = async () => {
    try {
      setManualRunning(true);
      setManualStatus("Looking up the stop code.");

      const response = await lookupBsodStopCode(manualCode);

      setManualResult(response);
      setManualStatus(
        response?.found
          ? "Stop code found."
          : "No known stop code found. Check the spelling or hex code.",
      );
    } catch (error) {
      setManualResult(null);
      setManualStatus(error?.message || "Lookup failed.");
    } finally {
      setManualRunning(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1900px",
        margin: "0 auto",
      }}
    >
      <ToolFormLayout compactMode={compactMode}>
        <FormSection
          title="BSOD Analyzer"
          description="Analyse Windows minidump files without external debugging tools."
          compactMode={compactMode}
        >
          <div
            style={{
              display: "grid",
              gap: "10px",
            }}
          >
            <input
              type="file"
              accept=".dmp"
              onChange={handleFileChange}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: compactMode ? "7px 9px" : "9px 10px",
                fontSize: compactMode ? "12px" : "13px",
              }}
            />

            <ActionRow compactMode={compactMode} marginTop="0">
              <ActionButton
                onClick={runAnalysis}
                icon={<FileSearch size={14} />}
                variant="primary"
                compactMode={compactMode}
                disabled={!file || running}
                title="Analyse minidump"
              >
                {running ? "Analysing..." : "Analyse dump"}
              </ActionButton>

              <ActionButton
                onClick={reset}
                icon={<RotateCcw size={14} />}
                variant="secondary"
                compactMode={compactMode}
                title="Reset"
              >
                Clear
              </ActionButton>
            </ActionRow>
          </div>

          <StatusMessage
            status={analysis ? "success" : "neutral"}
            compactMode={compactMode}
          >
            {status}
          </StatusMessage>

          {analysis?.stopCodeSource === "stream" && (
            <StatusMessage status="success" compactMode={compactMode}>
              Stop code read from the crash data itself (Exception stream),
              which is more reliable than a text scan.
            </StatusMessage>
          )}

          {analysis && analysis.stopCodeSource !== "stream" && (
            <StatusMessage status="warning" compactMode={compactMode}>
              This analysis is heuristic (a text scan of the dump), not an
              official WinDbg analysis. Use it as a first indication.
            </StatusMessage>
          )}

          {analysis?.isSmallDump && (
            <StatusMessage status="neutral" compactMode={compactMode}>
              This is a small (Mini) dump file. For repeated crashes, consider
              configuring a Kernel memory dump through System Properties &gt;
              Advanced &gt; Startup and Recovery for more detail.
            </StatusMessage>
          )}
        </FormSection>

        <FormSection
          title="Manual stop code lookup"
          description="No dump file available? Look up a stop code directly by name or hex code."
          compactMode={compactMode}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: "10px",
              alignItems: "end",
            }}
          >
            <FormField
              label="Stopcode"
              value={manualCode}
              onChange={setManualCode}
              placeholder="For example INACCESSIBLE_BOOT_DEVICE or 0x0000007B"
              compactMode={compactMode}
              mono
            />

            <ActionButton
              onClick={runManualLookup}
              icon={<Search size={14} />}
              variant="primary"
              compactMode={compactMode}
              disabled={!manualCode.trim() || manualRunning}
              title="Look up stop code"
            >
              Look up
            </ActionButton>
          </div>

          <StatusMessage
            status={
              manualResult?.found
                ? "success"
                : manualResult
                  ? "warning"
                  : "neutral"
            }
            compactMode={compactMode}
          >
            {manualStatus}
          </StatusMessage>

          {manualResult?.stopCode && (
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Stopcode"
                value={manualResult.stopCode.code}
              />

              <InfoTile
                compactMode={compactMode}
                label="Hex code"
                value={manualResult.stopCode.hex || "Not found"}
              />

              <InfoTile
                compactMode={compactMode}
                label="Category"
                value={manualResult.stopCode.category}
              />

              <InfoTile
                compactMode={compactMode}
                label="Advies"
                value={manualResult.stopCode.advice}
              />
            </ResultGrid>
          )}
        </FormSection>

        <FormSection title="Crash summary" compactMode={compactMode}>
          <ResultGrid compactMode={compactMode}>
            <InfoTile
              compactMode={compactMode}
              label="Status"
              value={
                <StatusBadge
                  compactMode={compactMode}
                  label={analysis ? "Analysed" : "Not analysed yet"}
                  status={analysis ? "success" : "neutral"}
                />
              }
            />

            <InfoTile
              compactMode={compactMode}
              label="File"
              value={analysis?.fileName || file?.name || "Not selected"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Minidump"
              value={analysis?.header?.isMinidump ? "Yes" : "Unknown"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Dump type"
              value={
                analysis?.header?.dumpType ||
                analysis?.header?.signature ||
                "Not found"
              }
            />

            <InfoTile
              compactMode={compactMode}
              label="Crash time"
              value={analysis?.header?.crashTime || "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Stopcode"
              value={
                <StatusBadge
                  compactMode={compactMode}
                  label={analysis?.stopCode || "Not found"}
                  status={
                    !analysis?.stopCode
                      ? "neutral"
                      : analysis.stopCodeSource === "stream"
                        ? "success"
                        : "warning"
                  }
                />
              }
            />

            <InfoTile
              compactMode={compactMode}
              label="Stop code source"
              value={
                analysis?.stopCodeSource === "stream"
                  ? "Crash data (Exception stream)"
                  : analysis?.stopCodeSource === "text-scan"
                    ? "Text scan (indicative)"
                    : "Not found"
              }
            />

            <InfoTile
              compactMode={compactMode}
              label="Category"
              value={analysis?.category || "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Bugcheck code"
              value={analysis?.bugcheck?.code || "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Bugcheck parameters"
              value={
                analysis?.bugcheck?.parameters?.length
                  ? analysis.bugcheck.parameters.join("\n")
                  : "Not found"
              }
            />

            <InfoTile
              compactMode={compactMode}
              label="WHEA error source"
              value={analysis?.whea?.label || "Not applicable"}
            />

            <InfoTile
              compactMode={compactMode}
              label="WHEA area"
              value={analysis?.whea?.area || "Not applicable"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Likely driver"
              value={likelyDriver?.name || "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Driver vendor"
              value={likelyDriver?.vendor || "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Driver description"
              value={likelyDriver?.description || "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Drivers found"
              value={
                analysis?.driverCount === undefined
                  ? "Not found"
                  : String(analysis.driverCount)
              }
            />

            <InfoTile
              compactMode={compactMode}
              label="Known drivers"
              value={
                analysis?.knownDriverCount === undefined
                  ? "Not found"
                  : String(analysis.knownDriverCount)
              }
            />

            <InfoTile
              compactMode={compactMode}
              label="Microsoft drivers"
              value={analysis?.microsoftDrivers ?? "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Third-party drivers"
              value={analysis?.thirdPartyDrivers ?? "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Module candidate"
              value={analysis?.likelyModule?.name || "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Module vendor"
              value={analysis?.likelyModule?.vendor || "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Module description"
              value={analysis?.likelyModule?.description || "Not found"}
            />
          </ResultGrid>

          <div
            style={{
              marginTop: "12px",
            }}
          >
            <FormField
              label="Likely cause"
              value={analysis?.likelyCause || "No analysis available yet."}
              onChange={() => {}}
              compactMode={compactMode}
              textarea
              rows={3}
              mono
              disabled
            />
          </div>

          <ActionRow compactMode={compactMode}>
            <CopyButton
              value={analysis?.ticketSummary || ""}
              label="Copy ticket text"
              copiedLabel="Ticket text copied"
              compactMode={compactMode}
              variant="primary"
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

        <FormSection title="Debug metadata" compactMode={compactMode}>
          <ResultGrid compactMode={compactMode}>
            <InfoTile
              compactMode={compactMode}
              label="Signature"
              value={analysis?.debug?.signature || "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Version"
              value={analysis?.debug?.version || "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Streams"
              value={analysis?.debug?.streamCount || "Not found"}
            />

            <InfoTile
              compactMode={compactMode}
              label="Directory RVA"
              value={analysis?.debug?.streamDirectoryRva || "Not found"}
            />
          </ResultGrid>
        </FormSection>

        <FormSection title="Drivers found" compactMode={compactMode}>
          <ResultGrid compactMode={compactMode}>
            {visibleDrivers.length ? (
              visibleDrivers.map((driver) => (
                <InfoTile
                  compactMode={compactMode}
                  key={driver.name}
                  label={driver.name}
                  value={`${driver.vendor} - ${driver.description}`}
                  color={driver.systemDriver ? "var(--subtle)" : undefined}
                />
              ))
            ) : (
              <InfoTile
                compactMode={compactMode}
                label="Drivers"
                value="No drivers found yet"
              />
            )}
          </ResultGrid>
        </FormSection>

        <FormSection title="Module signals" compactMode={compactMode}>
          <ResultGrid compactMode={compactMode}>
            {visibleModules.length ? (
              visibleModules.map((module) => (
                <InfoTile
                  compactMode={compactMode}
                  key={module.name}
                  label={`${module.name} (${module.count})`}
                  value={`${module.vendor} - ${module.description}`}
                />
              ))
            ) : (
              <InfoTile
                compactMode={compactMode}
                label="Modules"
                value="No module signals found"
              />
            )}
          </ResultGrid>
        </FormSection>

        <FormSection title="Error messages" compactMode={compactMode}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(650px, 1fr))",
              gap: "12px",
              maxHeight: "650px",
              overflowY: "auto",
            }}
          >
            {errorLines.length ? (
              errorLines.map((line, index) => (
                <div
                  key={index}
                  style={{
                    padding: "12px",
                    border: "1px solid #dc2626",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    fontFamily: "var(--font-mono, monospace)",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    lineHeight: 1.6,
                  }}
                >
                  {line}
                </div>
              ))
            ) : (
              <StatusMessage status="neutral" compactMode={compactMode}>
                No error messages found
              </StatusMessage>
            )}
          </div>
        </FormSection>

        <FormSection title="Info messages" compactMode={compactMode}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(650px, 1fr))",
              gap: "12px",
              maxHeight: "650px",
              overflowY: "auto",
            }}
          >
            {infoLines.length ? (
              infoLines.map((line, index) => (
                <div
                  key={index}
                  style={{
                    padding: "12px",
                    border: "1px solid #16a34a",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    fontFamily: "var(--font-mono, monospace)",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    lineHeight: 1.6,
                  }}
                >
                  {line}
                </div>
              ))
            ) : (
              <StatusMessage status="neutral" compactMode={compactMode}>
                No info messages found
              </StatusMessage>
            )}
          </div>
        </FormSection>

        <FormSection title="Firmware references" compactMode={compactMode}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(650px, 1fr))",
              gap: "12px",
              maxHeight: "800px",
              overflowY: "auto",
            }}
          >
            {firmwareReferences.length ? (
              firmwareReferences.map((line, index) => (
                <div
                  key={index}
                  style={{
                    padding: "10px",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    background: "var(--surface)",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: compactMode ? "12px" : "13px",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {line}
                </div>
              ))
            ) : (
              <StatusMessage status="neutral" compactMode={compactMode}>
                No firmware references found
              </StatusMessage>
            )}
          </div>
        </FormSection>
      </ToolFormLayout>
    </div>
  );
}
