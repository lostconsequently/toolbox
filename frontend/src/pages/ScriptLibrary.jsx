import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useApp } from "../context/AppContext";
import { useScriptLibrary } from "../context/ScriptLibraryContext";
import { useAdmin } from "../context/AdminContext";
import { useSettings } from "../context/SettingsContext";
import { useToolWindows } from "../context/ToolWindowsContext";
import { useLanguage } from "../context/LanguageContext";
import { useConfirm } from "../hooks/useConfirm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { SCRIPT_LANGUAGES } from "../core/constants/scriptLibrary";
import { addRecentScript } from "../core/utils/executeTool";

import { FileCode } from "lucide-react";

import Header from "../components/Header";
import ViewModeToggle from "../components/shared/ViewModeToggle";
import EmptyState from "../components/shared/EmptyState";
import ActionButton from "../components/toolForms/shared/ActionButton";
import ScriptCard from "../components/ScriptCard";
import ScriptListRow from "../components/ScriptListRow";
import ScriptForm from "../components/ScriptForm";

function parseTags(tagsJson) {
  try {
    const parsed = JSON.parse(tagsJson || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ScriptLibrary() {
  const { categories, subcategories } = useApp();
  const { scripts, deleteScript, toggleScriptFavorite } = useScriptLibrary();
  const { isAdmin } = useAdmin();
  const { openScript } = useToolWindows();
  const { settings, updateSetting } = useSettings();
  const { t } = useLanguage();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const compactMode = settings?.compactMode || false;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);
  const [languageFilter, setLanguageFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [viewMode, setViewMode] = useState(
    () => settings?.scriptsViewMode || "cards",
  );

  const [showForm, setShowForm] = useState(false);
  const [editingScriptId, setEditingScriptId] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const requestedScriptId = searchParams.get("script");

  useEffect(() => {
    if (!requestedScriptId) return;

    const script = scripts.find(
      (candidate) => String(candidate.id) === String(requestedScriptId),
    );

    if (!script) return;

    addRecentScript(script);
    openScript(script);
    setSearchParams({}, { replace: true });
  }, [requestedScriptId, scripts, openScript, setSearchParams]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    updateSetting("scriptsViewMode", mode);
  };

  const allTags = useMemo(() => {
    const tagSet = new Set();
    scripts.forEach((script) =>
      parseTags(script.tags).forEach((tag) => tagSet.add(tag)),
    );
    return Array.from(tagSet).sort();
  }, [scripts]);

  const filteredScripts = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();

    return scripts.filter((script) => {
      if (isAdmin === false && script.isAdminOnly) return false;

      if (languageFilter && script.language !== languageFilter) return false;

      if (
        categoryFilter &&
        String(script.categoryId) !== String(categoryFilter)
      )
        return false;

      if (tagFilter && !parseTags(script.tags).includes(tagFilter))
        return false;

      if (
        term &&
        !script.title.toLowerCase().includes(term) &&
        !(script.description || "").toLowerCase().includes(term)
      ) {
        return false;
      }

      return true;
    });
  }, [
    scripts,
    debouncedSearch,
    languageFilter,
    categoryFilter,
    tagFilter,
    isAdmin,
  ]);

  const openNewForm = () => {
    setEditingScriptId(null);
    setShowForm(true);
  };

  const openEditForm = (script) => {
    setEditingScriptId(script.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingScriptId(null);
  };

  const openDetail = (script) => {
    addRecentScript(script);
    openScript(script);
  };

  const toggleFavorite = async (script) => {
    try {
      await toggleScriptFavorite(script.id, !script.isFavorite);
    } catch (err) {
      console.error("Updating favorite failed:", err);
    }
  };

  const removeScript = async (id) => {
    const confirmed = await confirm(t("scriptLibrary.deleteConfirmMessage"), {
      title: t("scriptLibrary.deleteConfirmTitle"),
      danger: true,
    });

    if (!confirmed) return;

    try {
      await deleteScript(id);

      if (editingScriptId === id) closeForm();
    } catch (err) {
      console.error(err);
    }
  };

  const editingScript = editingScriptId
    ? scripts.find((script) => script.id === editingScriptId) || null
    : null;

  const categoryOf = (script) =>
    categories.find((c) => c.id === script.categoryId);
  const subcategoryOf = (script) =>
    subcategories.find((s) => s.id === script.subcategoryId);

  const inputStyle = {
    height: compactMode ? "36px" : "42px",
    boxSizing: "border-box",
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "0 12px",
    fontSize: "14px",
    outline: "none",
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: compactMode ? "12px" : "20px",
        }}
      >
        <Header
          title={t("scriptLibrary.title")}
          style={{ marginBottom: 0 }}
          crumbs={[
            { label: t("nav.dashboard"), to: "/" },
            { label: t("scriptLibrary.title") },
          ]}
        />

        {isAdmin && (
          <ActionButton variant="primary" onClick={openNewForm}>
            {t("scriptLibrary.newScript")}
          </ActionButton>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder={t("scriptLibrary.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: "100%", maxWidth: "350px" }}
        />

        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          style={{ ...inputStyle, minWidth: "160px" }}
        >
          <option value="">{t("scriptLibrary.filterLanguage")}</option>
          {SCRIPT_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ ...inputStyle, minWidth: "160px" }}
        >
          <option value="">{t("scriptLibrary.filterCategory")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            style={{ ...inputStyle, minWidth: "140px" }}
          >
            <option value="">{t("scriptLibrary.filterTag")}</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}

        <ViewModeToggle
          value={viewMode}
          onChange={handleViewModeChange}
          compactMode={compactMode}
          height={compactMode ? "36px" : "42px"}
        />
      </div>

      {scripts.length === 0 && (
        <EmptyState
          message={t("scriptLibrary.empty")}
          icon={<FileCode size={28} color="var(--subtle)" />}
          compactMode={compactMode}
        />
      )}

      {scripts.length > 0 && filteredScripts.length === 0 && (
        <p style={{ color: "var(--subtle)" }}>{t("scriptLibrary.noResults")}</p>
      )}

      {filteredScripts.map((script) =>
        viewMode === "list" ? (
          <ScriptListRow
            key={script.id}
            script={script}
            category={categoryOf(script)}
            subcategory={subcategoryOf(script)}
            onView={openDetail}
            onEdit={openEditForm}
            onDelete={removeScript}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <ScriptCard
            key={script.id}
            script={script}
            category={categoryOf(script)}
            subcategory={subcategoryOf(script)}
            onView={openDetail}
            onEdit={openEditForm}
            onDelete={removeScript}
            onToggleFavorite={toggleFavorite}
          />
        ),
      )}

      {showForm && (
        <ScriptForm
          key={editingScript?.id ?? "new"}
          open={showForm}
          editingScript={editingScript}
          categories={categories}
          subcategories={subcategories}
          compactMode={compactMode}
          onClose={closeForm}
        />
      )}

      {confirmDialog}
    </div>
  );
}
