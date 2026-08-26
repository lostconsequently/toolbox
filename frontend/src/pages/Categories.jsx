import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useScriptLibrary } from "../context/ScriptLibraryContext";
import CategoryCard from "../components/CategoryCard";
import CategoryListRow from "../components/CategoryListRow";
import { useAdmin } from "../context/AdminContext";
import { useSettings } from "../context/SettingsContext";
import ActionButton from "../components/toolForms/shared/ActionButton";
import ColorField from "../components/toolForms/shared/ColorField";
import ViewModeToggle from "../components/shared/ViewModeToggle";
import Header from "../components/Header";
import { useConfirm } from "../hooks/useConfirm";
import { useLanguage } from "../context/LanguageContext";

export default function Categories() {
  const {
    categories,
    tools,

    addCategory,
    updateCategory,
    deleteCategory,
  } = useApp();

  const { scripts } = useScriptLibrary();

  const { isAdmin } = useAdmin();
  const { t } = useLanguage();

  const navigate = useNavigate();

  const goToTools = (category) => {
    navigate(`/tools?category=${category.id}`);
  };

  const { confirm, dialog: confirmDialog } = useConfirm();

  const { settings, updateSetting } = useSettings();

  const [viewMode, setViewMode] = useState(
    () => settings?.categoriesViewMode || "cards",
  );

  useEffect(() => {
    updateSetting("categoriesViewMode", viewMode);
  }, [viewMode, updateSetting]);

  const [name, setName] = useState("");

  const [color, setColor] = useState("#2563eb");

  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const resetForm = () => {
    setName("");
    setColor("#2563eb");
    setEditingCategoryId(null);
  };

  const createCategory = async () => {
    if (!name.trim()) return;

    try {
      await addCategory({
        name,
        color,
        icon: "category",
      });

      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const saveCategory = async () => {
    if (!name.trim() || !editingCategoryId) {
      return;
    }

    try {
      await updateCategory(editingCategoryId, {
        name,
        color,
        icon: "category",
      });

      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const startEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setName(category.name);
    setColor(category.color || "#2563eb");
  };

  const removeCategory = async (id) => {
    const confirmed = await confirm(t("categoriesPage.deleteConfirmMessage"), {
      title: t("categoriesPage.deleteConfirmTitle"),
      danger: true,
    });

    if (!confirmed) return;

    try {
      await deleteCategory(id);

      if (editingCategoryId === id) {
        resetForm();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <Header
        title={t("categoriesPage.title")}
        crumbs={[
          { label: t("nav.dashboard"), to: "/" },
          { label: t("categoriesPage.title") },
        ]}
      />

      {isAdmin && (
        <div
          style={{
            background: "var(--card)",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            {editingCategoryId
              ? t("categoriesPage.editHeading")
              : t("categoriesPage.newHeading")}
          </h2>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("categoriesPage.namePlaceholder")}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px",
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "14px",
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <div style={{ width: "220px" }}>
                <ColorField
                  label={t("categoriesPage.colorLabel")}
                  value={color}
                  onChange={setColor}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginLeft: "auto" }}>
                {editingCategoryId ? (
                  <>
                    <ActionButton variant="success" onClick={saveCategory}>
                      {t("common.saveChanges")}
                    </ActionButton>

                    <ActionButton variant="secondary" onClick={resetForm}>
                      {t("common.cancel")}
                    </ActionButton>
                  </>
                ) : (
                  <ActionButton
                    variant="primary"
                    onClick={createCategory}
                    title={t("categoriesPage.addButtonTitle")}
                  >
                    {t("categoriesPage.addButton")}
                  </ActionButton>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {categories.length === 0 && (
        <p
          style={{
            color: "var(--subtle)",
          }}
        >
          {t("categoriesPage.empty")}
        </p>
      )}

      {categories.map((category) => {
        const toolCount = tools.filter(
          (tool) => tool.categoryId === category.id,
        ).length;

        const scriptCount = scripts.filter(
          (script) => script.categoryId === category.id,
        ).length;

        return viewMode === "list" ? (
          <CategoryListRow
            key={category.id}
            category={category}
            toolCount={toolCount}
            scriptCount={scriptCount}
            onDelete={removeCategory}
            onEdit={startEditCategory}
            onSelect={goToTools}
          />
        ) : (
          <CategoryCard
            key={category.id}
            category={category}
            toolCount={toolCount}
            scriptCount={scriptCount}
            onDelete={removeCategory}
            onEdit={startEditCategory}
            onSelect={goToTools}
          />
        );
      })}

      {confirmDialog}
    </div>
  );
}
