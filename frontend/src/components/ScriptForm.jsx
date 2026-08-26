import { useEffect, useState } from "react";
import { FileCode } from "lucide-react";

import { useModalA11y } from "../hooks/useModalA11y";
import { useLanguage } from "../context/LanguageContext";
import { useScriptLibrary } from "../context/ScriptLibraryContext";
import { SCRIPT_LANGUAGES } from "../core/constants/scriptLibrary";
import { FIELD_KEY_PATTERN } from "../core/utils/scriptTemplate";
import ActionButton from "./toolForms/shared/ActionButton";
import ActionRow from "./toolForms/shared/ActionRow";
import CheckboxOption from "./toolForms/shared/CheckboxOption";
import ScriptFieldEditor, { createEmptyField } from "./ScriptFieldEditor";

function parseTags(tagsJson) {
  try {
    const parsed = JSON.parse(tagsJson || "[]");
    return Array.isArray(parsed) ? parsed.join(", ") : "";
  } catch {
    return "";
  }
}

function serializeTags(tagsText) {
  const tags = tagsText
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return JSON.stringify(tags);
}

function toLocalField(field) {
  let options = [];

  try {
    const parsed = JSON.parse(field.options || "[]");
    if (Array.isArray(parsed)) options = parsed;
  } catch {
    options = [];
  }

  return {
    id: field.id,
    fieldKey: field.fieldKey,
    fieldLabel: field.fieldLabel,
    fieldType: field.fieldType,
    isRequired: field.isRequired,
    placeholder: field.placeholder || "",
    defaultValue: field.defaultValue || "",
    helpText: field.helpText || "",
    options,
    sortOrder: field.sortOrder || 0,
  };
}

function toFieldPayload(field, sortOrder) {
  return {
    fieldKey: field.fieldKey.trim(),
    fieldLabel: field.fieldLabel.trim(),
    fieldType: field.fieldType,
    isRequired: Boolean(field.isRequired),
    placeholder: field.placeholder || "",
    defaultValue: field.defaultValue || "",
    helpText: field.helpText || "",
    options: JSON.stringify(
      (field.options || []).map((o) => o.trim()).filter(Boolean),
    ),
    sortOrder,
  };
}

export default function ScriptForm({
  open,
  editingScript,
  categories,
  subcategories,
  compactMode,
  onClose,
}) {
  const { t } = useLanguage();
  const containerRef = useModalA11y({ isOpen: open, onClose });

  const {
    addScript,
    updateScript,
    loadScriptFields,
    addScriptField,
    updateScriptField,
    deleteScriptField,
  } = useScriptLibrary();

  const [title, setTitle] = useState(editingScript?.title || "");
  const [description, setDescription] = useState(
    editingScript?.description || "",
  );
  const [language, setLanguage] = useState(
    editingScript?.language || SCRIPT_LANGUAGES[0],
  );
  const [categoryId, setCategoryId] = useState(
    editingScript ? String(editingScript.categoryId) : "",
  );
  const [subcategoryId, setSubcategoryId] = useState(
    editingScript ? String(editingScript.subcategoryId || "") : "",
  );
  const [tags, setTags] = useState(parseTags(editingScript?.tags));
  const [scriptContent, setScriptContent] = useState(
    editingScript?.scriptContent || "",
  );
  const [isAdminOnly, setIsAdminOnly] = useState(
    editingScript?.isAdminOnly || false,
  );
  const [isTemplate, setIsTemplate] = useState(
    editingScript?.isTemplate || false,
  );
  const [localFields, setLocalFields] = useState([]);
  const [originalFields, setOriginalFields] = useState(
    editingScript?.fields || null,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (editingScript?.isTemplate && !editingScript.fields) {
      loadScriptFields(editingScript.id)
        .then((fields) => {
          if (cancelled) return;
          setOriginalFields(fields);
          setLocalFields(fields.map(toLocalField));
        })
        .catch((err) => {
          if (cancelled) return;
          console.error(err);
          setError(t("scriptLibrary.form.fieldsLoadFailed"));
        });
    } else if (editingScript?.fields) {
      setLocalFields(editingScript.fields.map(toLocalField));
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  const availableSubcategories = subcategories.filter(
    (sub) => sub.categoryId === Number(categoryId),
  );

  const validateFields = () => {
    const trimmedKeys = localFields.map((field) => field.fieldKey.trim());

    if (trimmedKeys.some((key) => !key || !FIELD_KEY_PATTERN.test(key))) {
      return t("scriptLibrary.fieldEditor.keyInvalid");
    }

    const uniqueKeys = new Set(trimmedKeys.map((key) => key.toLowerCase()));

    if (uniqueKeys.size !== trimmedKeys.length) {
      return t("scriptLibrary.fieldEditor.keyDuplicate");
    }

    return "";
  };

  const handleSubmit = async () => {
    setError("");

    if (!title.trim()) {
      setError(t("scriptLibrary.form.titleRequired"));
      return;
    }

    if (!categoryId) {
      setError(t("scriptLibrary.form.categoryRequired"));
      return;
    }

    if (isTemplate) {
      const fieldError = validateFields();
      if (fieldError) {
        setError(fieldError);
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        title: title.trim(),
        description,
        language,
        categoryId: Number(categoryId),
        subcategoryId: subcategoryId ? Number(subcategoryId) : null,
        tags: serializeTags(tags),
        scriptContent,
        isTemplate,
        isFavorite: editingScript?.isFavorite || false,
        isAdminOnly,
        sortOrder: editingScript?.sortOrder || 0,
      };

      const savedScript = editingScript
        ? await updateScript(editingScript.id, payload)
        : await addScript(payload);

      if (isTemplate) {
        const fieldsToPersist = localFields;
        const originalIds = new Set(
          (originalFields || []).map((field) => field.id),
        );
        const keptIds = new Set();

        for (let i = 0; i < fieldsToPersist.length; i++) {
          const field = fieldsToPersist[i];
          const fieldPayload = toFieldPayload(field, i);

          if (field.id) {
            keptIds.add(field.id);
            await updateScriptField(savedScript.id, field.id, fieldPayload);
          } else {
            await addScriptField(savedScript.id, fieldPayload);
          }
        }

        for (const originalId of originalIds) {
          if (!keptIds.has(originalId)) {
            await deleteScriptField(savedScript.id, originalId);
          }
        }
      } else if (originalFields?.length) {
        for (const field of originalFields) {
          await deleteScriptField(savedScript.id, field.id);
        }
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || t("scriptLibrary.form.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const style = {
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

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    color: "var(--subtle)",
    fontSize: "12px",
    fontWeight: "600",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10001,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={
          editingScript
            ? t("scriptLibrary.form.editTitle")
            : t("scriptLibrary.form.newTitle")
        }
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "20px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <FileCode size={22} />
          <h2 style={{ margin: 0, color: "var(--text)" }}>
            {editingScript
              ? t("scriptLibrary.form.editTitle")
              : t("scriptLibrary.form.newTitle")}
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={labelStyle}>{t("scriptLibrary.form.title")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("scriptLibrary.form.titlePlaceholder")}
              style={style}
            />
          </div>

          <div>
            <label style={labelStyle}>
              {t("scriptLibrary.form.description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("scriptLibrary.form.descriptionPlaceholder")}
              rows={2}
              style={{
                ...style,
                height: "auto",
                padding: "8px 10px",
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={labelStyle}>
                {t("scriptLibrary.form.language")}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={style}
              >
                {SCRIPT_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                {t("scriptLibrary.form.category")}
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategoryId("");
                }}
                style={style}
              >
                <option value="">
                  {t("scriptLibrary.form.selectCategory")}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                {t("scriptLibrary.form.subcategory")}
              </label>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                style={style}
              >
                <option value="">
                  {t("scriptLibrary.form.selectSubcategory")}
                </option>
                {availableSubcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t("scriptLibrary.form.tags")}</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t("scriptLibrary.form.tagsPlaceholder")}
              style={style}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("scriptLibrary.form.content")}</label>
            <textarea
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              placeholder={t("scriptLibrary.form.contentPlaceholder")}
              rows={10}
              style={{
                ...style,
                height: "auto",
                padding: "10px",
                resize: "vertical",
                fontFamily: "var(--mono, monospace)",
              }}
            />
          </div>

          <ActionRow marginTop="0">
            <CheckboxOption
              label={t("scriptLibrary.form.adminOnly")}
              checked={isAdminOnly}
              onChange={setIsAdminOnly}
              compactMode={compactMode}
            />

            <CheckboxOption
              label={t("scriptLibrary.form.templateEnabled")}
              checked={isTemplate}
              onChange={(checked) => {
                setIsTemplate(checked);
                if (checked && localFields.length === 0) {
                  setLocalFields([createEmptyField()]);
                }
              }}
              compactMode={compactMode}
            />
          </ActionRow>

          {isTemplate && (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "12px",
                background: "var(--overlay)",
                padding: compactMode ? "10px" : "12px",
              }}
            >
              <ScriptFieldEditor
                fields={localFields}
                onChange={setLocalFields}
                compactMode={compactMode}
              />
            </div>
          )}

          {error && (
            <p
              style={{
                color: "var(--status-error)",
                fontSize: "13px",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}
        </div>

        <ActionRow justify="flex-end" marginTop="18px">
          <ActionButton variant="secondary" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </ActionButton>

          <ActionButton
            variant={editingScript ? "success" : "primary"}
            onClick={handleSubmit}
            disabled={saving}
          >
            {editingScript ? t("common.saveChanges") : t("common.add")}
          </ActionButton>
        </ActionRow>
      </div>
    </div>
  );
}
