import { useMemo, useState } from "react";
import { ArrowLeftRight, ScanSearch, X } from "lucide-react";

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
  convertValue,
  detectFormat,
  formatOptions,
  getFormatLabel,
} from "../../core/toolEngines/encodingEngine";
import { decodeJwt, formatEpoch } from "../../core/toolEngines/jwtEngine";
import { inspectText } from "../../core/toolEngines/unicodeInspectorEngine";
import { parseUrlQuery } from "../../core/toolEngines/urlQueryEngine";

const modeOptions = [
  { label: "Convert format", value: "convert" },
  { label: "Decode JWT", value: "jwt" },
  { label: "Unicode / UTF-8 inspector", value: "unicode" },
  { label: "URL query parser", value: "urlquery" },
];

const emptyConvertState = {
  input: "",
  sourceFormat: "text",
  targetFormat: "base64",
};

const LARGE_INPUT_WARNING_THRESHOLD = 1_000_000;

const statusLabels = {
  success: "Converted",
  error: "Invalid input",
  neutral: "No input",
};

const useCases = [
  {
    label: "JWT troubleshooting",
    value: "Decode header/payload segments and check expiry",
  },
  {
    label: "API / Graph debugging",
    value: "Inspect URL-encoded query parameters or payloads",
  },
  {
    label: "Webhook troubleshooting",
    value: "Decode incoming payloads and signatures",
  },
  {
    label: "Security analysis",
    value: "Inspect hex dumps, encoded payloads and Unicode characters",
  },
];

const tableHeaderStyle = {
  background: "var(--primary)",
  color: "#ffffff",
  border: "1px solid var(--border)",
  padding: "8px",
  textAlign: "left",
  fontSize: "13px",
};

const tableCellStyle = {
  border: "1px solid var(--border)",
  padding: "8px",
  color: "var(--text)",
  verticalAlign: "top",
  fontSize: "13px",
};

function jwtStatusLabel(result) {
  if (result.status === "neutral") return "No input";
  if (result.status === "error") return "Invalid";
  return "Decoded";
}

function jwtExpiryLabel(result) {
  if (result.expiresAt === null) return "Not present";
  return result.expired ? "Expired" : "Valid";
}

function jwtExpiryStatus(result) {
  if (result.expiresAt === null) return "neutral";
  return result.expired ? "error" : "success";
}

export default function EncodingToolForm({ compactMode = false }) {
  const [mode, setMode] = useState("convert");

  const [convertValues, setConvertValues] = useState(emptyConvertState);
  const [jwtToken, setJwtToken] = useState("");
  const [unicodeText, setUnicodeText] = useState("");
  const [urlQueryInput, setUrlQueryInput] = useState("");

  const convertResult = useMemo(
    () => convertValue(convertValues),
    [convertValues],
  );
  const jwtResult = useMemo(() => decodeJwt(jwtToken), [jwtToken]);
  const unicodeResult = useMemo(() => inspectText(unicodeText), [unicodeText]);
  const urlQueryResult = useMemo(
    () => parseUrlQuery(urlQueryInput),
    [urlQueryInput],
  );

  const updateConvertValue = (key, value) => {
    setConvertValues((current) => ({ ...current, [key]: value }));
  };

  const swap = () => {
    setConvertValues((current) => ({
      input:
        convertResult.status === "success"
          ? convertResult.output
          : current.input,
      sourceFormat: current.targetFormat,
      targetFormat: current.sourceFormat,
    }));
  };

  const autoDetect = () => {
    setConvertValues((current) => ({
      ...current,
      sourceFormat: detectFormat(current.input),
    }));
  };

  const convertStatusText = !convertValues.input
    ? "Enter text to convert."
    : convertResult.status === "error"
      ? convertResult.error
      : `${getFormatLabel(convertValues.sourceFormat)} converted to ${getFormatLabel(convertValues.targetFormat)}.`;

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Data Encoding Toolkit"
        description="Encode, decode and inspect text in common formats. Everything happens locally in the browser; nothing is stored or logged."
        compactMode={compactMode}
      >
        <SelectField
          label="Mode"
          value={mode}
          onChange={setMode}
          options={modeOptions}
          compactMode={compactMode}
        />
      </FormSection>

      {mode === "convert" && (
        <>
          <FormSection title="Convert format" compactMode={compactMode}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "10px",
              }}
            >
              <SelectField
                label="Source format"
                value={convertValues.sourceFormat}
                onChange={(value) => updateConvertValue("sourceFormat", value)}
                options={formatOptions}
                compactMode={compactMode}
              />

              <SelectField
                label="Target format"
                value={convertValues.targetFormat}
                onChange={(value) => updateConvertValue("targetFormat", value)}
                options={formatOptions}
                compactMode={compactMode}
              />
            </div>

            <ActionRow compactMode={compactMode}>
              <ActionButton
                onClick={swap}
                icon={<ArrowLeftRight size={14} />}
                variant="secondary"
                compactMode={compactMode}
                title="Swap source and target format"
              >
                Swap
              </ActionButton>

              <ActionButton
                onClick={autoDetect}
                icon={<ScanSearch size={14} />}
                variant="secondary"
                compactMode={compactMode}
                disabled={!convertValues.input}
                title="Auto-detect the source format"
              >
                Auto detect
              </ActionButton>

              <ActionButton
                onClick={() => setConvertValues(emptyConvertState)}
                icon={<X size={14} />}
                variant="secondary"
                compactMode={compactMode}
                title="Clear all"
              >
                Clear
              </ActionButton>
            </ActionRow>

            <div style={{ marginTop: "12px" }}>
              <FormField
                label="Input"
                value={convertValues.input}
                onChange={(value) => updateConvertValue("input", value)}
                placeholder="Paste or type text, Base64, Base32, a URL-encoded value, hex, HTML/XML entities or a JSON-escaped string here"
                compactMode={compactMode}
                mono
                textarea
                rows={4}
              />
            </div>

            {convertValues.input.length > LARGE_INPUT_WARNING_THRESHOLD && (
              <StatusMessage status="warning" compactMode={compactMode}>
                Input is larger than 1 MB (
                {convertValues.input.length.toLocaleString()} characters) -
                converting may make the page stutter briefly.
              </StatusMessage>
            )}

            <ActionRow compactMode={compactMode}>
              <CopyButton
                value={convertValues.input}
                label="Copy input"
                copiedLabel="Input copied"
                compactMode={compactMode}
                variant="secondary"
              />
            </ActionRow>
          </FormSection>

          <FormSection title="Result" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Status"
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={statusLabels[convertResult.status] || "Unknown"}
                    status={convertResult.status}
                  />
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="Input format"
                value={getFormatLabel(convertValues.sourceFormat)}
              />

              <InfoTile
                compactMode={compactMode}
                label="Output format"
                value={getFormatLabel(convertValues.targetFormat)}
              />

              <InfoTile
                compactMode={compactMode}
                label="Length (characters)"
                value={String(convertResult.outputLength)}
              />

              <InfoTile
                compactMode={compactMode}
                label="Length (bytes)"
                value={`${convertResult.byteLength} bytes`}
              />
            </ResultGrid>

            <StatusMessage
              status={convertResult.status}
              compactMode={compactMode}
            >
              {convertStatusText}
            </StatusMessage>

            <div style={{ marginTop: "12px" }}>
              <FormField
                label="Result"
                value={convertResult.output}
                onChange={() => {}}
                compactMode={compactMode}
                mono
                textarea
                rows={4}
                disabled
              />
            </div>

            <ActionRow compactMode={compactMode}>
              <CopyButton
                value={convertResult.output}
                label="Copy result"
                copiedLabel="Result copied"
                compactMode={compactMode}
                variant="primary"
              />
            </ActionRow>
          </FormSection>
        </>
      )}

      {mode === "jwt" && (
        <>
          <FormSection
            title="Decode JWT"
            description="Paste a JWT to decode its header and payload. No signature is verified - only trust the contents after verifying with the correct secret or public key."
            compactMode={compactMode}
          >
            <FormField
              label="JWT token"
              value={jwtToken}
              onChange={setJwtToken}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
              compactMode={compactMode}
              mono
              textarea
              rows={3}
            />

            <ActionRow compactMode={compactMode}>
              <CopyButton
                value={jwtToken}
                label="Copy token"
                copiedLabel="Token copied"
                compactMode={compactMode}
                variant="secondary"
              />

              <ActionButton
                onClick={() => setJwtToken("")}
                icon={<X size={14} />}
                variant="secondary"
                compactMode={compactMode}
                title="Clear"
              >
                Clear
              </ActionButton>
            </ActionRow>
          </FormSection>

          <FormSection title="Summary" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Status"
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={jwtStatusLabel(jwtResult)}
                    status={jwtResult.status}
                  />
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="Algorithm"
                value={jwtResult.algorithm || "Not found"}
              />

              <InfoTile
                compactMode={compactMode}
                label="Type"
                value={jwtResult.tokenType || "Not found"}
              />

              <InfoTile
                compactMode={compactMode}
                label="Expires"
                value={
                  jwtResult.status === "success" ? (
                    <StatusBadge
                      compactMode={compactMode}
                      label={jwtExpiryLabel(jwtResult)}
                      status={jwtExpiryStatus(jwtResult)}
                    />
                  ) : (
                    "Not found"
                  )
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="Issued at (iat)"
                value={
                  jwtResult.status === "success"
                    ? formatEpoch(jwtResult.issuedAt)
                    : "Not found"
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="Valid from (nbf)"
                value={
                  jwtResult.status === "success"
                    ? formatEpoch(jwtResult.notBefore)
                    : "Not found"
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="Expires at (exp)"
                value={
                  jwtResult.status === "success"
                    ? formatEpoch(jwtResult.expiresAt)
                    : "Not found"
                }
              />
            </ResultGrid>

            <StatusMessage
              status={jwtResult.status === "error" ? "error" : "warning"}
              compactMode={compactMode}
            >
              {jwtResult.status === "error"
                ? jwtResult.error
                : jwtResult.status === "success"
                  ? "Decoded only, not verified. The signature has not been checked."
                  : "Paste a JWT to decode it."}
            </StatusMessage>
          </FormSection>

          {jwtResult.status === "success" && (
            <>
              <FormSection title="Header" compactMode={compactMode}>
                <FormField
                  value={jwtResult.headerRaw}
                  onChange={() => {}}
                  compactMode={compactMode}
                  mono
                  textarea
                  rows={4}
                  disabled
                />

                <ActionRow compactMode={compactMode}>
                  <CopyButton
                    value={jwtResult.headerRaw}
                    label="Copy header"
                    copiedLabel="Header copied"
                    compactMode={compactMode}
                    variant="secondary"
                  />
                </ActionRow>
              </FormSection>

              <FormSection title="Payload" compactMode={compactMode}>
                <FormField
                  value={jwtResult.payloadRaw}
                  onChange={() => {}}
                  compactMode={compactMode}
                  mono
                  textarea
                  rows={8}
                  disabled
                />

                <ActionRow compactMode={compactMode}>
                  <CopyButton
                    value={jwtResult.payloadRaw}
                    label="Copy payload"
                    copiedLabel="Payload copied"
                    compactMode={compactMode}
                    variant="secondary"
                  />
                </ActionRow>
              </FormSection>

              <FormSection title="Signature" compactMode={compactMode}>
                <FormField
                  value={jwtResult.signature}
                  onChange={() => {}}
                  compactMode={compactMode}
                  mono
                  disabled
                />

                <ActionRow compactMode={compactMode}>
                  <CopyButton
                    value={jwtResult.signature}
                    label="Copy signature"
                    copiedLabel="Signature copied"
                    compactMode={compactMode}
                    variant="secondary"
                  />
                </ActionRow>
              </FormSection>
            </>
          )}
        </>
      )}

      {mode === "unicode" && (
        <>
          <FormSection
            title="Unicode / UTF-8 inspector"
            description="View the Unicode code point and UTF-8 byte representation per character. Useful for mail header and encoding problems."
            compactMode={compactMode}
          >
            <FormField
              label="Text"
              value={unicodeText}
              onChange={setUnicodeText}
              placeholder="Paste text here to inspect it"
              compactMode={compactMode}
              mono
              textarea
              rows={3}
            />

            <ActionRow compactMode={compactMode}>
              <ActionButton
                onClick={() => setUnicodeText("")}
                icon={<X size={14} />}
                variant="secondary"
                compactMode={compactMode}
                title="Clear"
              >
                Clear
              </ActionButton>
            </ActionRow>
          </FormSection>

          <FormSection title="Summary" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Code points"
                value={
                  unicodeResult.stats
                    ? String(unicodeResult.stats.codePointCount)
                    : "0"
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="UTF-16 units"
                value={
                  unicodeResult.stats
                    ? String(unicodeResult.stats.utf16UnitCount)
                    : "0"
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="UTF-8 bytes"
                value={
                  unicodeResult.stats
                    ? `${unicodeResult.stats.utf8ByteCount} bytes`
                    : "0 bytes"
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="Contains non-ASCII"
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={unicodeResult.stats?.containsNonAscii ? "Yes" : "No"}
                    status={
                      unicodeResult.stats?.containsNonAscii
                        ? "warning"
                        : "success"
                    }
                  />
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="Contains surrogate pairs"
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={
                      unicodeResult.stats?.containsSurrogatePairs ? "Yes" : "No"
                    }
                    status={
                      unicodeResult.stats?.containsSurrogatePairs
                        ? "warning"
                        : "success"
                    }
                  />
                }
              />
            </ResultGrid>

            {unicodeResult.truncated && (
              <StatusMessage status="warning" compactMode={compactMode}>
                Display limited to the first 200 characters.
              </StatusMessage>
            )}

            {unicodeResult.chars.length > 0 && (
              <div style={{ marginTop: "12px", overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Character</th>
                      <th style={tableHeaderStyle}>Codepoint</th>
                      <th style={tableHeaderStyle}>UTF-8 bytes</th>
                      <th style={tableHeaderStyle}>UTF-8 hex</th>
                      <th style={tableHeaderStyle}>UTF-16 units</th>
                    </tr>
                  </thead>

                  <tbody>
                    {unicodeResult.chars.map((entry, index) => (
                      <tr key={`${entry.codePointHex}-${index}`}>
                        <td
                          style={{
                            ...tableCellStyle,
                            fontFamily: "var(--mono, monospace)",
                          }}
                        >
                          {entry.display}
                        </td>
                        <td style={tableCellStyle}>
                          {entry.codePointHex} ({entry.codePointDec})
                        </td>
                        <td style={tableCellStyle}>{entry.utf8ByteCount}</td>
                        <td
                          style={{
                            ...tableCellStyle,
                            fontFamily: "var(--mono, monospace)",
                          }}
                        >
                          {entry.utf8Hex}
                        </td>
                        <td style={tableCellStyle}>{entry.utf16Units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FormSection>
        </>
      )}

      {mode === "urlquery" && (
        <>
          <FormSection
            title="URL query parser"
            description="Paste a full URL or just a query string (for example ?a=1&b=2) to read out all parameters."
            compactMode={compactMode}
          >
            <FormField
              label="URL of query string"
              value={urlQueryInput}
              onChange={setUrlQueryInput}
              placeholder="https://example.com/path?user=jane&status=active"
              compactMode={compactMode}
              mono
              textarea
              rows={3}
            />

            <ActionRow compactMode={compactMode}>
              <ActionButton
                onClick={() => setUrlQueryInput("")}
                icon={<X size={14} />}
                variant="secondary"
                compactMode={compactMode}
                title="Clear"
              >
                Clear
              </ActionButton>
            </ActionRow>
          </FormSection>

          <FormSection title="Result" compactMode={compactMode}>
            {urlQueryResult.base && (
              <ResultGrid compactMode={compactMode}>
                <InfoTile
                  compactMode={compactMode}
                  label="Protocol"
                  value={urlQueryResult.base.protocol}
                />
                <InfoTile
                  compactMode={compactMode}
                  label="Host"
                  value={urlQueryResult.base.host}
                />
                <InfoTile
                  compactMode={compactMode}
                  label="Pad"
                  value={urlQueryResult.base.pathname}
                />
                <InfoTile
                  compactMode={compactMode}
                  label="Hash"
                  value={urlQueryResult.base.hash || "None"}
                />
              </ResultGrid>
            )}

            <StatusMessage
              status={urlQueryResult.status}
              compactMode={compactMode}
            >
              {urlQueryResult.status === "neutral"
                ? "Enter a URL or query string."
                : urlQueryResult.status === "error"
                  ? urlQueryResult.error
                  : urlQueryResult.status === "warning"
                    ? urlQueryResult.error
                    : `${urlQueryResult.params.length} parameter(s) found.`}
            </StatusMessage>

            {urlQueryResult.params.length > 0 && (
              <div style={{ marginTop: "12px", overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Key</th>
                      <th style={tableHeaderStyle}>Value</th>
                    </tr>
                  </thead>

                  <tbody>
                    {urlQueryResult.params.map((param) => (
                      <tr key={param.key}>
                        <td
                          style={{
                            ...tableCellStyle,
                            fontFamily: "var(--mono, monospace)",
                          }}
                        >
                          {param.key}
                        </td>
                        <td
                          style={{
                            ...tableCellStyle,
                            fontFamily: "var(--mono, monospace)",
                          }}
                        >
                          {param.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {urlQueryResult.params.length > 0 && (
              <ActionRow compactMode={compactMode}>
                <CopyButton
                  value={JSON.stringify(
                    Object.fromEntries(
                      urlQueryResult.params.map((param) => [
                        param.key,
                        param.values.length > 1 ? param.values : param.value,
                      ]),
                    ),
                    null,
                    2,
                  )}
                  label="Copy as JSON"
                  copiedLabel="JSON copied"
                  compactMode={compactMode}
                  variant="primary"
                />
              </ActionRow>
            )}
          </FormSection>
        </>
      )}

      <FormSection title="Applications" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          {useCases.map((useCase) => (
            <InfoTile
              compactMode={compactMode}
              key={useCase.label}
              label={useCase.label}
              value={useCase.value}
            />
          ))}
        </ResultGrid>
      </FormSection>
    </ToolFormLayout>
  );
}
