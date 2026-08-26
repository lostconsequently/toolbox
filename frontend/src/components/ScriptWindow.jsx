import { useEffect, useMemo, useState } from "react";
import { Download, FileCode } from "lucide-react";

import { useLanguage } from "../context/LanguageContext";
import { useApp } from "../context/AppContext";
import { useScriptLibrary } from "../context/ScriptLibraryContext";
import { useSettings } from "../context/SettingsContext";
import { useToolWindows } from "../context/ToolWindowsContext";
import { useCopyToClipboard } from "./toolForms/shared/useCopyToClipboard";
import { getScriptFileExtension } from "../core/utils/scriptFileExtension";
import {
  generateScriptOutput,
  validateRequiredFields,
} from "../core/utils/scriptTemplate";
import ActionButton from "./toolForms/shared/ActionButton";
import ActionRow from "./toolForms/shared/ActionRow";
import Badge from "./shared/Badge";
import FloatingWindow from "./FloatingWindow";
import ScriptPreview from "./ScriptPreview";

function slugify(text) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "script"
  );
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function parseTags(tagsJson) {
  try {
    const parsed = JSON.parse(tagsJson || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ScriptWindow({
  win,
  isActive,
  onClose,
  onFocus,
  onMinimize,
  onToggleMaximize,
  onUpdate,
}) {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { categories, subcategories } = useApp();
  const { loadScriptFields } = useScriptLibrary();
  const { pinItem, unpinItem, isPinned } = useToolWindows();
  const [copied, copy, copyFailed] = useCopyToClipboard();

  const compactMode = settings?.compactMode || false;

  const script = win.item;
  const pinned = isPinned("script", script.id);

  const category = categories.find((entry) => entry.id === script.categoryId);
  const subcategory = subcategories.find(
    (entry) => entry.id === script.subcategoryId,
  );

  const [fields, setFields] = useState(script?.fields || null);
  const [fieldsError, setFieldsError] = useState(false);
  const [activeTab, setActiveTab] = useState("template");
  const [values, setValues] = useState({});

  useEffect(() => {
    setActiveTab("template");
    setValues({});
    setFieldsError(false);

    if (script.isTemplate) {
      if (script.fields) {
        setFields(script.fields);
      } else {
        setFields(null);
        loadScriptFields(script.id)
          .then(setFields)
          .catch((err) => {
            console.error(err);
            setFields([]);
            setFieldsError(true);
          });
      }
    } else {
      setFields(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script.id]);

  const retryLoadFields = () => {
    setFields(null);
    setFieldsError(false);

    loadScriptFields(script.id)
      .then(setFields)
      .catch((err) => {
        console.error(err);
        setFields([]);
        setFieldsError(true);
      });
  };

  const orderedFields = useMemo(
    () =>
      (fields || [])
        .slice()
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [fields],
  );

  const extension = getScriptFileExtension(script.language);
  const filename = `${slugify(script.title)}.${extension}`;
  const tags = parseTags(script.tags);

  const outputValid = script.isTemplate
    ? validateRequiredFields(orderedFields, values).valid
    : true;

  const finalContent = script.isTemplate
    ? generateScriptOutput(script.scriptContent, orderedFields, values)
    : script.scriptContent;

  const handleCopy = () => {
    if (!outputValid) return;
    copy(finalContent);
  };

  const handleDownload = () => {
    if (!outputValid) return;
    triggerBlobDownload(
      new Blob([finalContent], { type: "text/plain" }),
      filename,
    );
  };

  const renderFieldInput = (field) => {
    const value = values[field.fieldKey] ?? "";
    const setValue = (next) =>
      setValues((prev) => ({ ...prev, [field.fieldKey]: next }));

    const baseStyle = {
      width: "100%",
      boxSizing: "border-box",
      background: "var(--surface)",
      color: "var(--text)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      padding: "0 10px",
      height: compactMode ? "34px" : "38px",
      fontSize: compactMode ? "12px" : "13px",
      outline: "none",
    };

    if (field.fieldType === "textarea") {
      return (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          style={{
            ...baseStyle,
            height: "auto",
            padding: "8px 10px",
            resize: "vertical",
          }}
        />
      );
    }

    if (field.fieldType === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={value === true || value === "true"}
          onChange={(e) => setValue(e.target.checked)}
        />
      );
    }

    if (field.fieldType === "select") {
      let options = [];
      try {
        const parsed = JSON.parse(field.options || "[]");
        if (Array.isArray(parsed)) options = parsed;
      } catch {
        options = [];
      }

      return (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={baseStyle}
        >
          <option value="">{field.placeholder || ""}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    const inputType =
      field.fieldType === "password"
        ? "password"
        : field.fieldType === "number"
          ? "number"
          : field.fieldType === "email"
            ? "email"
            : "text";

    return (
      <input
        type={inputType}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={field.placeholder}
        autoComplete={field.fieldType === "password" ? "new-password" : "off"}
        style={baseStyle}
      />
    );
  };

  return (
    <FloatingWindow
      win={win}
      isActive={isActive}
      title={script.title}
      icon={<FileCode size={16} />}
      pinned={pinned}
      onTogglePin={() =>
        pinned ? unpinItem("script", script.id) : pinItem("script", script)
      }
      onClose={onClose}
      onFocus={onFocus}
      onMinimize={onMinimize}
      onToggleMaximize={onToggleMaximize}
      onUpdate={onUpdate}
    >
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <Badge
          label={script.language}
          color="#2563eb"
          compactMode={compactMode}
        />
        {category && (
          <Badge
            label={category.name}
            color={category.color || "#64748b"}
            compactMode={compactMode}
          />
        )}
        {subcategory && (
          <Badge
            label={subcategory.name}
            variant="soft"
            compactMode={compactMode}
          />
        )}
        {tags.map((tag) => (
          <Badge
            key={tag}
            label={tag}
            variant="soft"
            compactMode={compactMode}
          />
        ))}
      </div>

      {script.description && (
        <p style={{ color: "var(--subtle)", fontSize: "14px", marginTop: 0 }}>
          {script.description}
        </p>
      )}

      {script.isTemplate ? (
        <>
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            {["template", "output"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  background:
                    activeTab === tab ? "var(--primary)" : "var(--surface)",
                  color: activeTab === tab ? "#ffffff" : "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                {tab === "template"
                  ? t("scriptLibrary.tabTemplate")
                  : t("scriptLibrary.tabOutput")}
              </button>
            ))}
          </div>

          {activeTab === "template" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {orderedFields.length === 0 && fieldsError && (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <p
                    style={{
                      color: "var(--status-error)",
                      fontSize: "13px",
                      margin: 0,
                    }}
                  >
                    {t("scriptLibrary.form.fieldsLoadFailed")}
                  </p>

                  <ActionButton
                    variant="secondary"
                    compactMode
                    onClick={retryLoadFields}
                  >
                    {t("common.retry")}
                  </ActionButton>
                </div>
              )}

              {orderedFields.length === 0 && !fieldsError && (
                <p style={{ color: "var(--subtle)", fontSize: "13px" }}>
                  {t("scriptLibrary.fieldEditor.empty")}
                </p>
              )}

              {orderedFields.map((field) => (
                <div key={field.id}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      color: "var(--subtle)",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    {field.fieldLabel}
                    {field.isRequired ? " *" : ""}
                  </label>

                  {renderFieldInput(field)}

                  {field.helpText && (
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "var(--subtle)",
                        fontSize: "11px",
                      }}
                    >
                      {field.helpText}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "output" && (
            <ScriptPreview
              content={script.scriptContent}
              fields={orderedFields}
              values={values}
              compactMode={compactMode}
            />
          )}
        </>
      ) : (
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
          }}
        >
          {script.scriptContent}
        </pre>
      )}

      <ActionRow justify="flex-end" marginTop="16px">
        <ActionButton
          variant="secondary"
          onClick={handleCopy}
          disabled={!outputValid}
        >
          {copyFailed
            ? t("scriptLibrary.copyFailed")
            : copied
              ? t("scriptLibrary.copied")
              : t("scriptLibrary.copy")}
        </ActionButton>

        <ActionButton
          variant="primary"
          onClick={handleDownload}
          disabled={!outputValid}
          icon={<Download size={14} />}
        >
          {t("scriptLibrary.download")}
        </ActionButton>
      </ActionRow>
    </FloatingWindow>
  );
}
