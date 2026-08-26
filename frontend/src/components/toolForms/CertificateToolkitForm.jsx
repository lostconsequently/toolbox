import { useState, useRef } from "react";
import {
  Download,
  FileSearch,
  RotateCcw,
  Copy,
  Check,
  FileCode,
} from "lucide-react";
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
import { useCopyToClipboard } from "./shared/useCopyToClipboard";

import {
  inspectCertificateContent,
  inspectCsrContent,
} from "../../core/toolEngines/certificateToolkitEngine";

const emptyState = {
  content: "",
  fileBase64: "",
  fileName: "",
  fileType: "",
  pfxPassword: "",
};

const MAX_CERTIFICATE_FILE_BYTES = 500000;

function getCertificateStatusLabel(status) {
  if (status === "success") {
    return "Valid";
  }

  if (status === "warning") {
    return "Attention";
  }

  if (status === "error") {
    return "Expired";
  }

  return "Unknown";
}

function getDaysRemainingText(daysRemaining) {
  if (daysRemaining === null || daysRemaining === undefined) {
    return "-";
  }

  if (daysRemaining < 0) {
    return `Expired ${Math.abs(daysRemaining)} days ago`;
  }

  return `${daysRemaining} days`;
}

function formatPublicKeyDetails(certificate) {
  const details = certificate.publicKeyDetails || {};

  if (certificate.publicKeyType === "rsa") {
    return details.modulusLength ? `RSA ${details.modulusLength} bit` : "RSA";
  }

  if (certificate.publicKeyType === "ec") {
    return details.namedCurve ? `EC ${details.namedCurve}` : "EC";
  }

  return certificate.publicKeyType || "Unknown";
}

function createSafeFileName(value = "certificate") {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "certificate"
  );
}

function getCertificateBaseName(certificate) {
  const subject = certificate.subject || "";
  const commonNameMatch = subject.match(/CN=([^,\n]+)/i);

  if (commonNameMatch?.[1]) {
    return createSafeFileName(commonNameMatch[1]);
  }

  return `certificate-${certificate.index}`;
}

function downloadTextFile(fileName, content, type = "text/plain") {
  const blob = new Blob([content], {
    type,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);

  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function downloadBase64File(
  fileName,
  base64Value,
  type = "application/octet-stream",
) {
  const binary = atob(base64Value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], {
    type,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);

  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function looksLikeTextCertificate(text = "") {
  return (
    text.includes("-----BEGIN CERTIFICATE-----") ||
    text.includes("-----BEGIN PKCS7-----") ||
    text.includes("-----BEGIN CMS-----")
  );
}

function looksLikeCsr(text = "") {
  return text.includes("-----BEGIN CERTIFICATE REQUEST-----");
}

function looksLikeBase64(text = "") {
  return text.trim().length > 80 && /^[A-Za-z0-9+/=\s\r\n]+$/.test(text.trim());
}

function formatSerialNumber(serial) {
  if (!serial) return "-";
  return (
    serial
      .toUpperCase()
      .match(/.{1,2}/g)
      ?.join(":") || serial.toUpperCase()
  );
}

function InlineCopy({ value }) {
  const [copied, copy] = useCopyToClipboard();

  const handleCopy = (e) => {
    e.stopPropagation();
    copy(value);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy"
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className="a11y-focus-ring"
      style={{
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        color: copied ? "var(--primary)" : "var(--subtle)",
        flexShrink: 0,
        padding: "2px",
        borderRadius: "4px",
        background: "transparent",
        border: "none",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

export default function CertificateToolkitForm({ compactMode = false }) {
  const [values, setValues] = useState(emptyState);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Paste a PEM, CRT or CER certificate to inspect its contents.",
  );
  const [loading, setLoading] = useState(false);
  const [inputWarning, setInputWarning] = useState("");
  const [csrResult, setCsrResult] = useState(null);
  const fileInputRef = useRef(null);

  const updateValue = (key, value) => {
    setValues((currentValues) => {
      const updatedValues = {
        ...currentValues,
      };

      updatedValues[key] = value;

      return updatedValues;
    });

    if (key === "content" && value.trim().length > 80) {
      if (looksLikeCsr(value)) {
        setInputWarning("");
      } else if (!looksLikeTextCertificate(value) && !looksLikeBase64(value)) {
        setInputWarning(
          "This input does not look like a certificate or CSR. Paste a PEM, DER or P7B certificate, or a CSR.",
        );
      } else {
        setInputWarning("");
      }
    } else {
      setInputWarning("");
    }
  };

  const reset = () => {
    setValues(emptyState);
    setResult(null);
    setCsrResult(null);
    setStatus("Paste a PEM, CRT or CER certificate to inspect its contents.");
    setInputWarning("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const inspectCertificate = async (overrideValues) => {
    const valuesToUse = overrideValues || values;

    if (looksLikeCsr(valuesToUse.content)) {
      try {
        setLoading(true);
        setCsrResult(null);
        setResult(null);
        setStatus("Analysing the CSR.");

        const csrData = await inspectCsrContent(valuesToUse.content);

        setCsrResult(csrData);
        setStatus("CSR read successfully.");
      } catch (error) {
        setCsrResult(null);
        setStatus(error?.message || "CSR inspection failed.");
      } finally {
        setLoading(false);
      }

      return;
    }

    try {
      setLoading(true);
      setCsrResult(null);
      setStatus("Analysing the certificate.");

      const inspectResult = await inspectCertificateContent(valuesToUse);

      setResult(inspectResult);

      if (inspectResult.status === "success") {
        setStatus("Certificate details read successfully.");
      } else if (inspectResult.status === "warning") {
        setStatus("Certificate found, but it needs attention.");
      } else {
        setStatus("The certificate has expired or contains an error.");
      }
    } catch (error) {
      setResult(null);
      setStatus(error?.message || "Certificate inspection failed.");
    } finally {
      setLoading(false);
    }
  };

  const readFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_CERTIFICATE_FILE_BYTES) {
      setStatus(
        `The file is too large (max ${Math.floor(MAX_CERTIFICATE_FILE_BYTES / 1000)} KB).`,
      );
      setResult(null);
      setCsrResult(null);
      event.target.value = "";
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const fileBase64 = arrayBufferToBase64(buffer);

      const text = new TextDecoder("utf-8").decode(buffer);

      const isTextCertificate = looksLikeTextCertificate(text);

      const newValues = {
        content: isTextCertificate ? text : "",
        fileBase64,
        fileName: file.name,
        fileType: file.type,
        pfxPassword: values.pfxPassword || "",
      };

      setValues(newValues);
      setResult(null);
      setCsrResult(null);

      setStatus(
        isTextCertificate
          ? "Certificate file loaded."
          : "Binary certificate file loaded.",
      );

      event.target.value = "";

      await inspectCertificate(newValues);
    } catch (error) {
      setStatus(error?.message || "The file could not be read.");
      setResult(null);
      setCsrResult(null);
      setLoading(false);
      event.target.value = "";
    }
  };

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Certificate Toolkit"
        description="Inspect PEM, CRT and CER certificates and show validity, issuer, SANs, fingerprints and chain information."
        compactMode={compactMode}
      >
        <FormField
          label="Certificate content"
          value={values.content}
          onChange={(value) => updateValue("content", value)}
          placeholder="Paste a PEM, CRT or CER certificate here..."
          compactMode={compactMode}
          textarea
          rows={10}
          mono
        />

        <div
          style={{
            marginTop: "12px",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              color: "var(--subtle)",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            Upload certificate file
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pem,.crt,.cer,.der,.txt,.p7b,.p7c,.spc,.pfx,.p12"
            onChange={readFile}
            style={{
              width: "100%",
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: compactMode ? "8px" : "10px",
              boxSizing: "border-box",
            }}
          />

          {values.fileName && (
            <StatusMessage status="neutral" compactMode={compactMode}>
              File loaded: {values.fileName}
            </StatusMessage>
          )}

          {values.fileName && /\.(pfx|p12)$/i.test(values.fileName) && (
            <div style={{ marginTop: "8px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color: "var(--subtle)",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                PFX/P12 password
              </label>

              <input
                type="password"
                name="pfx-file-password"
                value={values.pfxPassword}
                onChange={(e) => updateValue("pfxPassword", e.target.value)}
                placeholder="Enter the password (leave empty if there is none)"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                style={{
                  width: "100%",
                  background: "var(--surface)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: compactMode ? "8px" : "10px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}
        </div>

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={() => inspectCertificate()}
            icon={
              looksLikeCsr(values.content) ? (
                <FileCode size={14} />
              ) : (
                <FileSearch size={14} />
              )
            }
            variant="primary"
            compactMode={compactMode}
            title={
              looksLikeCsr(values.content) ? "View CSR" : "Inspect certificate"
            }
            disabled={loading}
          >
            {loading
              ? "Working..."
              : looksLikeCsr(values.content)
                ? "View CSR"
                : "Inspect"}
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

        {inputWarning && (
          <div style={{ marginTop: "8px" }}>
            <StatusMessage status="neutral" compactMode={compactMode}>
              {inputWarning}
            </StatusMessage>
          </div>
        )}

        <StatusMessage
          status={result?.status || "neutral"}
          compactMode={compactMode}
        >
          {status}
        </StatusMessage>

        {result?.detectedPrivateKey && (
          <StatusMessage status="warning" compactMode={compactMode}>
            A private key was detected in the input. This version processes
            certificates only and does not store any input.
          </StatusMessage>
        )}
      </FormSection>

      {result && (
        <>
          <FormSection title="Summary" compactMode={compactMode}>
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Certificates"
                value={String(result.certificateCount)}
              />
              <InfoTile
                compactMode={compactMode}
                label="Format"
                value={result.format || "Unknown"}
              />

              <InfoTile
                compactMode={compactMode}
                label="Chain"
                value={result.certificateCount > 1 ? "Yes" : "No"}
              />

              <InfoTile
                compactMode={compactMode}
                label="First expiry"
                value={getDaysRemainingText(result.earliestExpiry)}
              />

              <InfoTile
                compactMode={compactMode}
                label="Status"
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={getCertificateStatusLabel(result.status)}
                    status={result.status}
                  />
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="Private key"
                value={result.detectedPrivateKey ? "Detected" : "Not detected"}
              />
            </ResultGrid>
          </FormSection>

          {result.certificates.map((certificate) => (
            <FormSection
              key={`${certificate.serialNumber}-${certificate.index}`}
              title={`Certificate ${certificate.index}`}
              compactMode={compactMode}
            >
              <ResultGrid compactMode={compactMode}>
                <InfoTile
                  compactMode={compactMode}
                  label="Status"
                  value={
                    <StatusBadge
                      compactMode={compactMode}
                      label={getCertificateStatusLabel(certificate.status)}
                      status={certificate.status}
                    />
                  }
                />

                <InfoTile
                  compactMode={compactMode}
                  label="Days remaining"
                  value={getDaysRemainingText(certificate.daysRemaining)}
                />

                {certificate.chainLabel && (
                  <InfoTile
                    compactMode={compactMode}
                    label="Chain rol"
                    value={
                      <StatusBadge
                        compactMode={compactMode}
                        label={certificate.chainLabel}
                        status={
                          certificate.chainLabel === "Root CA"
                            ? "neutral"
                            : certificate.chainLabel === "Leaf"
                              ? "success"
                              : "neutral"
                        }
                      />
                    }
                  />
                )}

                {certificate.ca && (
                  <InfoTile
                    compactMode={compactMode}
                    label="CA"
                    value={
                      <StatusBadge
                        compactMode={compactMode}
                        label="Yes"
                        status="neutral"
                      />
                    }
                  />
                )}

                {certificate.selfSigned && (
                  <InfoTile
                    compactMode={compactMode}
                    label="Self-signed"
                    value={
                      <StatusBadge
                        compactMode={compactMode}
                        label="Yes"
                        status="warning"
                      />
                    }
                  />
                )}

                <InfoTile
                  compactMode={compactMode}
                  label="Subject"
                  value={
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        width: "100%",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {certificate.subject}
                      </span>
                      <InlineCopy value={certificate.subject} />
                    </span>
                  }
                />

                <InfoTile
                  compactMode={compactMode}
                  label="Issuer"
                  value={
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        width: "100%",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {certificate.issuer}
                      </span>
                      <InlineCopy value={certificate.issuer} />
                    </span>
                  }
                />

                <InfoTile
                  compactMode={compactMode}
                  label="Valid from"
                  value={certificate.validFrom}
                />

                <InfoTile
                  compactMode={compactMode}
                  label="Valid to"
                  value={certificate.validTo}
                />

                <InfoTile
                  compactMode={compactMode}
                  label="Serial"
                  value={formatSerialNumber(certificate.serialNumber)}
                />

                <InfoTile
                  compactMode={compactMode}
                  label="Public key"
                  value={
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <span>{formatPublicKeyDetails(certificate)}</span>
                      {certificate.keySizeWarning && (
                        <StatusBadge
                          compactMode={compactMode}
                          label={certificate.keySizeWarning}
                          status="warning"
                        />
                      )}
                    </div>
                  }
                />

                {certificate.keyUsage?.length > 0 && (
                  <InfoTile
                    compactMode={compactMode}
                    label="Key Usage"
                    value={certificate.keyUsage.join(", ")}
                  />
                )}
              </ResultGrid>
              {certificate.subjectAltNames.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      color: "var(--text)",
                    }}
                  >
                    Subject Alternative Names
                  </h4>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    {certificate.subjectAltNames.map((name) => (
                      <StatusBadge
                        compactMode={compactMode}
                        key={name}
                        label={name}
                        status={name.startsWith("*") ? "warning" : "neutral"}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div
                style={{
                  marginTop: "12px",
                }}
              >
                <ResultGrid compactMode={compactMode}>
                  <InfoTile
                    compactMode={compactMode}
                    label="SHA1 fingerprint"
                    value={certificate.fingerprint}
                  />

                  <InfoTile
                    compactMode={compactMode}
                    label="SHA256 fingerprint"
                    value={certificate.fingerprint256}
                  />
                </ResultGrid>
              </div>
              <ActionRow compactMode={compactMode}>
                <CopyButton
                  value={certificate.pem}
                  label="Copy PEM"
                  copiedLabel="PEM copied"
                  compactMode={compactMode}
                  variant="secondary"
                />

                <CopyButton
                  value={certificate.fingerprint256}
                  label="Copy SHA256"
                  copiedLabel="SHA256 copied"
                  compactMode={compactMode}
                  variant="secondary"
                />

                <ActionButton
                  onClick={() => {
                    const baseName = getCertificateBaseName(certificate);

                    downloadTextFile(
                      `${baseName}.pem`,
                      certificate.pem,
                      "application/x-pem-file",
                    );
                  }}
                  icon={<Download size={14} />}
                  variant="secondary"
                  compactMode={compactMode}
                  title="Download certificate as PEM"
                >
                  Download PEM
                </ActionButton>

                {certificate.derBase64 && (
                  <ActionButton
                    onClick={() => {
                      const baseName = getCertificateBaseName(certificate);

                      downloadBase64File(
                        `${baseName}.cer`,
                        certificate.derBase64,
                        "application/pkix-cert",
                      );
                    }}
                    icon={<Download size={14} />}
                    variant="secondary"
                    compactMode={compactMode}
                    title="Download certificate as DER"
                  >
                    Download DER
                  </ActionButton>
                )}
              </ActionRow>
            </FormSection>
          ))}

          <FormSection title="Actions" compactMode={compactMode}>
            <ActionRow compactMode={compactMode}>
              <CopyButton
                value={result.plainText}
                label="Copy summary"
                copiedLabel="Summary copied"
                compactMode={compactMode}
                variant="primary"
              />

              <ActionButton
                onClick={() => {
                  const chainPem = result.certificates
                    .map((certificate) => certificate.pem)
                    .join("\n\n");

                  downloadTextFile(
                    "certificate-chain.pem",
                    chainPem,
                    "application/x-pem-file",
                  );
                }}
                icon={<Download size={14} />}
                variant="secondary"
                compactMode={compactMode}
                title="Download the full chain as a PEM bundle"
              >
                Download Chain PEM
              </ActionButton>

              <CopyButton
                value={JSON.stringify(result, null, 2)}
                label="Copy JSON"
                copiedLabel="JSON copied"
                compactMode={compactMode}
                variant="secondary"
              />
            </ActionRow>
          </FormSection>
        </>
      )}

      {csrResult && (
        <FormSection title="CSR details" compactMode={compactMode}>
          <ResultGrid compactMode={compactMode}>
            <InfoTile
              compactMode={compactMode}
              label="Subject"
              value={csrResult.subject}
            />

            {csrResult.subjectAltNames?.length > 0 && (
              <InfoTile
                compactMode={compactMode}
                label="SANs"
                value={csrResult.subjectAltNames.join(", ")}
              />
            )}

            <InfoTile
              compactMode={compactMode}
              label="Key algorithm"
              value={csrResult.keyAlgorithm}
            />

            <InfoTile
              compactMode={compactMode}
              label="Signature algorithm"
              value={csrResult.signatureAlgorithm}
            />

            {csrResult.keySize && (
              <InfoTile
                compactMode={compactMode}
                label="Key size"
                value={
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span>{csrResult.keySize} bit</span>
                    {csrResult.keySize < 2048 && (
                      <StatusBadge
                        compactMode={compactMode}
                        label={`${csrResult.keySize} is shorter than the recommended 2048 bits`}
                        status="warning"
                      />
                    )}
                  </div>
                }
              />
            )}
          </ResultGrid>
        </FormSection>
      )}
    </ToolFormLayout>
  );
}
