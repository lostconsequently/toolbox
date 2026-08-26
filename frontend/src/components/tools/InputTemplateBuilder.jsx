import { useEffect, useState } from "react";
import {
  ChevronDown,
  FileText,
  Globe,
  Link,
  ListChecks,
  Network,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

function getFieldTypes(t) {
  return [
    { value: "text", label: t("inputBuilder.fieldTypes.text") },
    { value: "textarea", label: t("inputBuilder.fieldTypes.textarea") },
    { value: "number", label: t("inputBuilder.fieldTypes.number") },
    { value: "url", label: t("inputBuilder.fieldTypes.url") },
    { value: "email", label: t("inputBuilder.fieldTypes.email") },
    { value: "checkbox", label: t("inputBuilder.fieldTypes.checkbox") },
    { value: "select", label: t("inputBuilder.fieldTypes.select") },
  ];
}

function getPresets(t) {
  return [
    {
      label: t("inputBuilder.presets.domain"),
      name: "domain",
      type: "text",
      placeholder: "example.com",
      icon: Globe,
    },
    {
      label: t("inputBuilder.presets.ipAddress"),
      name: "ipAddress",
      type: "text",
      placeholder: "192.168.1.1",
      icon: Network,
    },
    {
      label: t("inputBuilder.presets.url"),
      name: "url",
      type: "url",
      placeholder: "example.com",
      icon: Link,
    },
    {
      label: t("inputBuilder.presets.mailHeader"),
      name: "header",
      type: "textarea",
      placeholder: "Paste the full mail header here",
      icon: FileText,
    },
  ];
}

function createDefaultField() {
  return {
    label: "",
    name: "input",
    type: "text",
    placeholder: "",
    required: false,
    options: [],
  };
}

function createFieldName(label) {
  if (!label) {
    return "input";
  }

  const words = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "input";
  }

  return words
    .map((word, index) => {
      const cleanWord = word.toLowerCase();

      if (index === 0) {
        return cleanWord;
      }

      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
    })
    .join("");
}

function parseTemplate(value) {
  try {
    const parsed = JSON.parse(value || "[]");

    if (!Array.isArray(parsed)) {
      return [createDefaultField()];
    }

    if (parsed.length === 0) {
      return [createDefaultField()];
    }

    return parsed.map((field) => ({
      label: field.label || "",
      name: field.name || createFieldName(field.label || ""),
      type: field.type || "text",
      placeholder: field.placeholder || "",
      required: Boolean(field.required),
      options: Array.isArray(field.options) ? field.options : [],
    }));
  } catch {
    return [createDefaultField()];
  }
}

function cleanFields(fields) {
  return fields.map((field) => {
    const cleanField = {
      name: field.name || createFieldName(field.label),
      label: field.label || "",
      type: field.type || "text",
    };

    if (field.placeholder) {
      cleanField.placeholder = field.placeholder;
    }

    if (field.required) {
      cleanField.required = true;
    }

    if (field.type === "select") {
      cleanField.options = field.options || [];
    }

    return cleanField;
  });
}

export default function InputTemplateBuilder({
  value,
  onChange,
  compactMode = false,
}) {
  const { t } = useLanguage();
  const fieldTypes = getFieldTypes(t);
  const presets = getPresets(t);
  const [fields, setFields] = useState(() => parseTemplate(value));
  const [advancedOpen, setAdvancedOpen] = useState({});

  useEffect(() => {
    if (!value) {
      return;
    }

    const parsed = parseTemplate(value);

    setFields((currentFields) => {
      const currentJson = JSON.stringify(currentFields);
      const parsedJson = JSON.stringify(parsed);

      if (currentJson === parsedJson) {
        return currentFields;
      }

      return parsed;
    });
  }, [value]);

  const syncFields = (nextFields) => {
    const safeFields =
      nextFields.length > 0 ? nextFields : [createDefaultField()];

    setFields(safeFields);
    onChange(JSON.stringify(cleanFields(safeFields), null, 2));
  };

  const addField = () => {
    syncFields([
      ...fields,
      {
        label: "",
        name: "nieuwVeld",
        type: "text",
        placeholder: "",
        required: false,
        options: [],
      },
    ]);
  };

  const addPreset = (preset) => {
    syncFields([
      ...fields,
      {
        label: preset.label,
        name: preset.name,
        type: preset.type,
        placeholder: preset.placeholder,
        required: false,
        options: [],
      },
    ]);
  };

  const updateField = (index, key, nextValue) => {
    const nextFields = fields.map((field, fieldIndex) => {
      if (fieldIndex !== index) {
        return field;
      }

      if (key === "label") {
        const newName = createFieldName(nextValue);

        return {
          ...field,
          label: nextValue,
          name: advancedOpen[index] ? field.name : newName,
        };
      }

      if (key === "options") {
        return {
          ...field,
          options: nextValue
            .split("\n")
            .map((option) => option.trim())
            .filter(Boolean),
        };
      }

      if (key === "type") {
        return {
          ...field,
          type: nextValue,
          options: nextValue === "select" ? field.options || [] : [],
        };
      }

      const updatedField = {
        ...field,
      };

      updatedField[key] = nextValue;

      return updatedField;
    });

    syncFields(nextFields);
  };

  const removeField = (index) => {
    const nextFields = fields.filter((field, fieldIndex) => {
      return fieldIndex !== index;
    });

    syncFields(nextFields);
  };

  const toggleAdvanced = (index) => {
    setAdvancedOpen((previous) => {
      const next = { ...previous };

      next[index] = !previous[index];

      return next;
    });
  };

  const wrapperStyle = {
    marginTop: "16px",
    padding: compactMode ? "10px" : "14px",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "var(--overlay)",
  };

  const inputStyle = {
    width: "100%",
    height: compactMode ? "34px" : "38px",
    boxSizing: "border-box",
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "0 10px",
    fontSize: compactMode ? "12px" : "13px",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    color: "var(--subtle)",
    fontSize: "12px",
    fontWeight: "600",
  };

  const primaryButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "var(--primary)",
    border: "none",
    padding: compactMode ? "7px 9px" : "8px 10px",
    borderRadius: "8px",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: compactMode ? "12px" : "13px",
    fontWeight: "600",
  };

  const secondaryButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    padding: compactMode ? "7px 9px" : "8px 10px",
    borderRadius: "8px",
    color: "var(--text)",
    cursor: "pointer",
    fontSize: compactMode ? "12px" : "13px",
  };

  return (
    <div style={wrapperStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--text)",
              fontWeight: "700",
            }}
          >
            <ListChecks size={16} />
            {t("inputBuilder.title")}
          </div>

          <div
            style={{
              marginTop: "4px",
              color: "var(--subtle)",
              fontSize: "12px",
            }}
          >
            {t("inputBuilder.description")}
          </div>
        </div>

        <button type="button" onClick={addField} style={primaryButtonStyle}>
          <Plus size={14} />
          {t("inputBuilder.addField")}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        {presets.map((preset) => {
          const PresetIcon = preset.icon;

          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => addPreset(preset)}
              style={secondaryButtonStyle}
            >
              <PresetIcon size={14} />
              {preset.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gap: "12px",
        }}
      >
        {fields.map((field, index) => {
          return (
            <div
              key={index}
              style={{
                position: "relative",
                padding: "12px",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                background: "var(--overlay)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 220px",
                  gap: "10px",
                  marginBottom: "10px",
                }}
              >
                <div>
                  <label style={labelStyle}>{t("inputBuilder.label")}</label>

                  <input
                    value={field.label}
                    onChange={(event) =>
                      updateField(index, "label", event.target.value)
                    }
                    placeholder={t("inputBuilder.labelPlaceholder")}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("inputBuilder.type")}</label>

                  <select
                    value={field.type}
                    onChange={(event) =>
                      updateField(index, "type", event.target.value)
                    }
                    style={inputStyle}
                  >
                    {fieldTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 220px",
                  gap: "10px",
                  alignItems: "end",
                }}
              >
                {field.type === "select" ? (
                  <div>
                    <label style={labelStyle}>
                      {t("inputBuilder.options")}
                    </label>

                    <textarea
                      value={(field.options || []).join("\n")}
                      onChange={(event) =>
                        updateField(index, "options", event.target.value)
                      }
                      placeholder={t("inputBuilder.optionsPlaceholder")}
                      rows={3}
                      style={{
                        ...inputStyle,
                        height: "76px",
                        padding: "8px 10px",
                        resize: "vertical",
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>
                      {t("inputBuilder.placeholder")}
                    </label>

                    <input
                      value={field.placeholder}
                      onChange={(event) =>
                        updateField(index, "placeholder", event.target.value)
                      }
                      placeholder={t("inputBuilder.placeholderPlaceholder")}
                      style={inputStyle}
                    />
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "10px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "var(--text)",
                      fontSize: compactMode ? "12px" : "13px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) =>
                        updateField(index, "required", event.target.checked)
                      }
                    />
                    {t("inputBuilder.required")}
                  </label>

                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#dc2626",
                      border: "none",
                      padding: compactMode ? "7px 9px" : "8px 10px",
                      borderRadius: "8px",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontSize: compactMode ? "12px" : "13px",
                      fontWeight: "600",
                    }}
                  >
                    <Trash2 size={14} />
                    {t("inputBuilder.remove")}
                  </button>
                </div>
              </div>

              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleAdvanced(index)}
                  style={secondaryButtonStyle}
                >
                  <SlidersHorizontal size={14} />
                  {t("inputBuilder.advanced")}{" "}
                  <ChevronDown size={14} style={{ verticalAlign: "middle" }} />
                </button>
              </div>

              {advancedOpen[index] && (
                <div
                  style={{
                    marginTop: "12px",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <label style={labelStyle}>
                    {t("inputBuilder.technicalName")}
                  </label>

                  <input
                    value={field.name}
                    onChange={(event) =>
                      updateField(index, "name", event.target.value)
                    }
                    style={inputStyle}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
