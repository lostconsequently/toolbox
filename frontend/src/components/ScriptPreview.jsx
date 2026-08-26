import {
  generateScriptOutput,
  validateRequiredFields,
} from "../core/utils/scriptTemplate";
import { useLanguage } from "../context/LanguageContext";

export default function ScriptPreview({
  content,
  fields,
  values,
  compactMode = false,
}) {
  const { t } = useLanguage();

  const output = generateScriptOutput(content, fields, values);
  const { valid, missing } = validateRequiredFields(fields, values);

  return (
    <div>
      {!valid && (
        <p
          style={{
            color: "var(--status-error)",
            fontSize: "13px",
            marginTop: 0,
            marginBottom: "10px",
          }}
        >
          {t("scriptLibrary.missingRequired")}{" "}
          {missing.map((field) => field.fieldLabel).join(", ")}
        </p>
      )}

      <pre
        style={{
          margin: 0,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: compactMode ? "10px" : "14px",
          fontSize: compactMode ? "12px" : "13px",
          fontFamily: "var(--mono, monospace)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "var(--text)",
          maxHeight: "360px",
          overflowY: "auto",
        }}
      >
        {output}
      </pre>
    </div>
  );
}
