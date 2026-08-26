import { api } from "../../services/api";

export function normalizeCertificateInput(value = "") {
  return String(value || "").trim();
}

export async function inspectCertificateContent(input = {}) {
  const payload =
    typeof input === "string"
      ? {
          content: normalizeCertificateInput(input),
        }
      : {
          content: normalizeCertificateInput(input.content || ""),
          fileBase64: input.fileBase64 || "",
          fileName: input.fileName || "",
          fileType: input.fileType || "",
          pfxPassword: input.pfxPassword || "",
        };

  if (!payload.content && !payload.fileBase64) {
    throw new Error("Paste or upload a certificate first.");
  }

  const result = await api.inspectCertificate(payload);

  if (!result.success) {
    throw new Error(result.error || "Certificate inspection failed.");
  }

  return result;
}

export async function inspectCsrContent(content = "") {
  const normalized = normalizeCertificateInput(content);

  if (!normalized) {
    throw new Error("Paste a CSR first.");
  }

  const result = await api.inspectCsr({ content: normalized });

  if (!result.success) {
    throw new Error(result.error || "CSR inspection failed.");
  }

  return result;
}

export async function runCertificateToolkitTool(tool, inputValues = {}) {
  return inspectCertificateContent(inputValues);
}
