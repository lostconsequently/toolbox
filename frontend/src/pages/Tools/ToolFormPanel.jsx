import { useState } from "react";
import Icon from "../../components/Icon";
import { toolRegistry } from "../../core/toolRegistry";
import { ICONS, ICON_LABELS } from "../../config/icons";
import ActionButton from "../../components/toolForms/shared/ActionButton";
import ActionRow from "../../components/toolForms/shared/ActionRow";
import StatusMessage from "../../components/toolForms/shared/StatusMessage";
import { useLanguage } from "../../context/LanguageContext";
import LinkTemplateFields, {
  DEFAULT_INPUT_TEMPLATE,
} from "./LinkTemplateFields";

export default function ToolFormPanel({
  editingTool,
  categories,
  subcategories,
  compactMode,
  error,
  onSubmit,
  onCancel,
}) {
  const { t } = useLanguage();

  const toolType = editingTool.toolType;
  const definition = toolRegistry[toolType];

  const [name, setName] = useState(editingTool.name || "");
  const [description, setDescription] = useState(editingTool.description || "");
  const [categoryId, setCategoryId] = useState(String(editingTool.categoryId));
  const [subcategoryId, setSubcategoryId] = useState(
    String(editingTool.subcategoryId || ""),
  );
  const [config, setConfig] = useState(editingTool.config || "");
  const [inputTemplate, setInputTemplate] = useState(() =>
    definition?.showInputTemplate === false
      ? ""
      : editingTool.inputTemplate || DEFAULT_INPUT_TEMPLATE,
  );
  const [icon, setIcon] = useState(editingTool.icon || definition?.icon);
  const [enabled, setEnabled] = useState(editingTool.enabled ?? true);
  const [isDraft, setIsDraft] = useState(editingTool.isDraft ?? false);
  const [featured, setFeatured] = useState(editingTool.featured ?? false);
  const [showAdvancedToolSettings, setShowAdvancedToolSettings] =
    useState(false);

  const showConfigInput = definition?.showConfigInput !== false;
  const showInputTemplate = definition?.showInputTemplate !== false;

  const configTitle = definition?.configTitle || t("toolForm.configuration");
  const configLabel = definition?.configLabel || t("toolForm.configuration");
  const configPlaceholder =
    definition?.configPlaceholder || t("toolForm.configPlaceholderDefault");

  const handleSubmit = () => {
    if (!name.trim() || !categoryId) {
      return;
    }

    onSubmit({
      name,
      description,
      toolType,
      categoryId: Number(categoryId),
      subcategoryId: subcategoryId ? Number(subcategoryId) : null,
      config,
      inputTemplate,
      icon,
      enabled,
      isDraft,
      featured,
    });
  };

  const fieldStyle = {
    width: "100%",
    height: compactMode ? "36px" : "42px",

    boxSizing: "border-box",
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "8px",

    padding: compactMode ? "6px 10px" : "8px 10px",

    fontSize: compactMode ? "13px" : "14px",

    outline: "none",
  };

  return (
    <>
      {error && (
        <div style={{ marginBottom: "12px" }}>
          <StatusMessage status="error" compactMode={compactMode}>
            {error}
          </StatusMessage>
        </div>
      )}

      <div
        style={{
          padding: compactMode ? "10px 12px" : "12px 14px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "12px",
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
          {t("toolForm.basicInfo")}
        </h3>
      </div>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "12px",
          background: "var(--overlay)",
          padding: compactMode ? "12px" : "14px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <input
          placeholder={t("toolForm.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={fieldStyle}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={fieldStyle}
          >
            <option value="">{t("toolForm.selectCategory")}</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={subcategoryId}
            style={fieldStyle}
            onChange={(e) => setSubcategoryId(e.target.value)}
          >
            <option value="">{t("toolForm.selectSubcategory")}</option>

            {subcategories
              .filter((sub) => sub.categoryId === Number(categoryId))
              .map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      <LinkTemplateFields
        description={description}
        onDescriptionChange={setDescription}
        config={config}
        onConfigChange={setConfig}
        inputTemplate={inputTemplate}
        onInputTemplateChange={setInputTemplate}
        showConfigInput={showConfigInput}
        showInputTemplate={showInputTemplate}
        configTitle={configTitle}
        configLabel={configLabel}
        configPlaceholder={configPlaceholder}
        compactMode={compactMode}
      />
      <section
        style={{
          marginTop: "14px",
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
            {t("toolForm.status")}
          </h3>
        </div>

        <div
          style={{
            padding: compactMode ? "12px" : "14px",
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--text)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            {t("toolForm.statusEnabled")}
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--text)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={isDraft}
              onChange={(e) => setIsDraft(e.target.checked)}
            />
            {t("toolForm.statusDraft")}
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--text)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            {t("toolForm.statusFeatured")}
          </label>
        </div>
      </section>

      <div
        style={{
          marginTop: "16px",
          borderTop: "1px solid var(--border)",
          paddingTop: "14px",
        }}
      >
        <button
          type="button"
          onClick={() =>
            setShowAdvancedToolSettings((previousValue) => !previousValue)
          }
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "8px 10px",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          {t("toolForm.advancedSettings")}
        </button>

        {showAdvancedToolSettings && (
          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              background: "var(--overlay)",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--subtle)",
                fontSize: "13px",
              }}
            >
              {t("toolForm.toolIcon")}
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                style={{
                  width: "280px",
                  height: "40px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  padding: "0 12px",
                }}
              >
                {Object.keys(ICONS).map((key) => (
                  <option key={key} value={key}>
                    {ICON_LABELS[key] || key}
                  </option>
                ))}
              </select>

              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={icon} size={18} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: "16px",
          paddingTop: "16px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <ActionRow justify="flex-end" marginTop="0">
          <ActionButton variant="success" onClick={handleSubmit}>
            {t("common.saveChanges")}
          </ActionButton>

          <ActionButton variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </ActionButton>
        </ActionRow>
      </div>
    </>
  );
}
