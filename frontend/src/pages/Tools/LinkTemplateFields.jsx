import InputTemplateBuilder from "../../components/tools/InputTemplateBuilder";
import { useLanguage } from "../../context/LanguageContext";

export const DEFAULT_INPUT_TEMPLATE = JSON.stringify(
  [
    {
      name: "input",
      label: "",
      type: "text",
    },
  ],
  null,
  2,
);

export default function LinkTemplateFields({
  description,
  onDescriptionChange,
  config,
  onConfigChange,
  inputTemplate,
  onInputTemplateChange,
  showConfigInput,
  showInputTemplate,
  configTitle,
  configLabel,
  configPlaceholder,
  compactMode,
}) {
  const { t } = useLanguage();

  return (
    <div
      style={{
        marginTop: "18px",
        display: "grid",
        gap: "14px",
      }}
    >
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "12px",
          background: "var(--overlay)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: compactMode ? "10px 12px" : "12px 14px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "var(--text)",
              fontSize: compactMode ? "13px" : "14px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {configTitle || t("toolForm.configuration")}
          </h3>
        </div>

        <div
          style={{
            padding: compactMode ? "12px" : "14px",
            display: "grid",
            gridTemplateColumns: showConfigInput
              ? "repeat(2, minmax(0, 1fr))"
              : "1fr",
            gap: "14px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                color: "var(--subtle)",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {t("toolForm.description")}
            </label>

            <textarea
              placeholder={t("toolForm.descriptionPlaceholder")}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows="3"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "14px",
                resize: "vertical",
                height: compactMode ? "76px" : "96px",
              }}
            />
          </div>

          {showConfigInput && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color: "var(--subtle)",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                {configLabel || t("toolForm.configuration")}
              </label>

              <textarea
                placeholder={
                  configPlaceholder || t("toolForm.configPlaceholderDefault")
                }
                value={config}
                onChange={(e) => onConfigChange(e.target.value)}
                rows="3"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "var(--surface)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px",
                  fontSize: "14px",
                  resize: "vertical",
                  height: compactMode ? "76px" : "96px",
                }}
              />
            </div>
          )}
        </div>
      </section>

      {showInputTemplate && (
        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: "12px",
            background: "var(--overlay)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: compactMode ? "10px 12px" : "12px 14px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "var(--text)",
                fontSize: compactMode ? "13px" : "14px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {t("toolForm.userInput")}
            </h3>
          </div>

          <div
            style={{
              padding: compactMode ? "10px" : "12px",
            }}
          >
            <InputTemplateBuilder
              value={inputTemplate}
              onChange={onInputTemplateChange}
              compactMode={compactMode}
            />
          </div>
        </section>
      )}
    </div>
  );
}
