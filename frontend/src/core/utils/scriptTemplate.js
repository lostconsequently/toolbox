export const FIELD_KEY_PATTERN = /^[a-zA-Z0-9_]+$/;

export function generateScriptOutput(content, fields, values) {
  let output = content || "";

  for (const field of fields || []) {
    const raw = values?.[field.fieldKey];
    const replacement =
      raw !== undefined && raw !== null && raw !== ""
        ? String(raw)
        : (field.defaultValue ?? "");

    output = output.split(`{{${field.fieldKey}}}`).join(replacement);
  }

  return output;
}

export function validateRequiredFields(fields, values) {
  const missing = (fields || []).filter(
    (field) =>
      field.isRequired && !String(values?.[field.fieldKey] ?? "").trim(),
  );

  return { valid: missing.length === 0, missing };
}
