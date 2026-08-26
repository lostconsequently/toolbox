import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { SCRIPT_FIELD_TYPES } from "../core/constants/scriptLibrary";
import { FIELD_KEY_PATTERN } from "../core/utils/scriptTemplate";
import ActionButton from "./toolForms/shared/ActionButton";
import ActionRow from "./toolForms/shared/ActionRow";
import CheckboxOption from "./toolForms/shared/CheckboxOption";
import { useLanguage } from "../context/LanguageContext";

let nextLocalId = 1;

export function createEmptyField() {
  return {
    _localId: `new-${nextLocalId++}`,
    fieldKey: "",
    fieldLabel: "",
    fieldType: "text",
    isRequired: false,
    placeholder: "",
    defaultValue: "",
    helpText: "",
    options: [],
    sortOrder: 0,
  };
}

function fieldStyle(compactMode) {
  return {
    width: "100%",
    boxSizing: "border-box",
    height: compactMode ? "32px" : "36px",
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "0 10px",
    fontSize: compactMode ? "12px" : "13px",
    outline: "none",
  };
}

export default function ScriptFieldEditor({
  fields,
  onChange,
  compactMode = false,
}) {
  const { t } = useLanguage();

  const updateField = (localId, patch) => {
    onChange(
      fields.map((field) =>
        (field._localId ?? field.id) === localId
          ? { ...field, ...patch }
          : field,
      ),
    );
  };

  const removeField = (localId) => {
    onChange(
      fields.filter((field) => (field._localId ?? field.id) !== localId),
    );
  };

  const moveField = (index, direction) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const reordered = [...fields];
    const [moved] = reordered.splice(index, 1);

    reordered.splice(targetIndex, 0, moved);

    onChange(reordered.map((field, sortOrder) => ({ ...field, sortOrder })));
  };

  const addField = () => {
    onChange([...fields, { ...createEmptyField(), sortOrder: fields.length }]);
  };

  const keysUsed = fields.map((field) => field.fieldKey.trim().toLowerCase());

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
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
          {t("scriptLibrary.fieldEditor.title")}
        </h3>

        <ActionButton variant="secondary" onClick={addField}>
          {t("scriptLibrary.fieldEditor.addField")}
        </ActionButton>
      </div>

      {fields.length === 0 && (
        <p style={{ color: "var(--subtle)", fontSize: "13px" }}>
          {t("scriptLibrary.fieldEditor.empty")}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {fields.map((field, index) => {
          const localId = field._localId ?? field.id;
          const trimmedKey = field.fieldKey.trim();
          const keyInvalid =
            trimmedKey.length > 0 && !FIELD_KEY_PATTERN.test(trimmedKey);
          const keyDuplicate =
            trimmedKey.length > 0 &&
            keysUsed.filter((key) => key === trimmedKey.toLowerCase()).length >
              1;

          return (
            <div
              key={localId}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "10px",
                background: "var(--overlay)",
                padding: compactMode ? "10px" : "12px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      color: "var(--subtle)",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  >
                    {t("scriptLibrary.fieldEditor.label")}
                  </label>
                  <input
                    value={field.fieldLabel}
                    onChange={(e) =>
                      updateField(localId, { fieldLabel: e.target.value })
                    }
                    style={fieldStyle(compactMode)}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      color: "var(--subtle)",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  >
                    {t("scriptLibrary.fieldEditor.key")}
                  </label>
                  <input
                    value={field.fieldKey}
                    onChange={(e) =>
                      updateField(localId, { fieldKey: e.target.value })
                    }
                    style={{
                      ...fieldStyle(compactMode),
                      borderColor:
                        keyInvalid || keyDuplicate
                          ? "var(--status-error)"
                          : "var(--border)",
                    }}
                  />
                  {(keyInvalid || keyDuplicate) && (
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "var(--status-error)",
                        fontSize: "11px",
                      }}
                    >
                      {keyDuplicate
                        ? t("scriptLibrary.fieldEditor.keyDuplicate")
                        : t("scriptLibrary.fieldEditor.keyInvalid")}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      color: "var(--subtle)",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  >
                    {t("scriptLibrary.fieldEditor.type")}
                  </label>
                  <select
                    value={field.fieldType}
                    onChange={(e) =>
                      updateField(localId, { fieldType: e.target.value })
                    }
                    style={fieldStyle(compactMode)}
                  >
                    {SCRIPT_FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`scriptLibrary.fieldTypes.${type}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      color: "var(--subtle)",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  >
                    {t("scriptLibrary.fieldEditor.placeholder")}
                  </label>
                  <input
                    value={field.placeholder}
                    onChange={(e) =>
                      updateField(localId, { placeholder: e.target.value })
                    }
                    style={fieldStyle(compactMode)}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      color: "var(--subtle)",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  >
                    {t("scriptLibrary.fieldEditor.defaultValue")}
                  </label>
                  <input
                    value={field.defaultValue}
                    onChange={(e) =>
                      updateField(localId, { defaultValue: e.target.value })
                    }
                    style={fieldStyle(compactMode)}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      color: "var(--subtle)",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  >
                    {t("scriptLibrary.fieldEditor.helpText")}
                  </label>
                  <input
                    value={field.helpText}
                    onChange={(e) =>
                      updateField(localId, { helpText: e.target.value })
                    }
                    style={fieldStyle(compactMode)}
                  />
                </div>

                {field.fieldType === "select" && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        color: "var(--subtle)",
                        fontSize: "11px",
                        fontWeight: "600",
                      }}
                    >
                      {t("scriptLibrary.fieldEditor.options")}
                    </label>
                    <textarea
                      value={field.options.join("\n")}
                      onChange={(e) =>
                        updateField(localId, {
                          options: e.target.value.split("\n"),
                        })
                      }
                      placeholder={t(
                        "scriptLibrary.fieldEditor.optionsPlaceholder",
                      )}
                      rows={3}
                      style={{
                        ...fieldStyle(compactMode),
                        height: "auto",
                        padding: "8px 10px",
                        resize: "vertical",
                      }}
                    />
                  </div>
                )}
              </div>

              <ActionRow marginTop="10px">
                <CheckboxOption
                  label={t("scriptLibrary.fieldEditor.required")}
                  checked={field.isRequired}
                  onChange={(checked) =>
                    updateField(localId, { isRequired: checked })
                  }
                  compactMode={compactMode}
                />

                <ActionButton
                  variant="secondary"
                  onClick={() => moveField(index, -1)}
                  disabled={index === 0}
                  icon={<ChevronUp size={14} />}
                  compactMode={compactMode}
                />

                <ActionButton
                  variant="secondary"
                  onClick={() => moveField(index, 1)}
                  disabled={index === fields.length - 1}
                  icon={<ChevronDown size={14} />}
                  compactMode={compactMode}
                />

                <ActionButton
                  variant="danger"
                  onClick={() => removeField(localId)}
                  icon={<Trash2 size={14} />}
                  compactMode={compactMode}
                  title={t("scriptLibrary.fieldEditor.remove")}
                />
              </ActionRow>
            </div>
          );
        })}
      </div>
    </div>
  );
}
