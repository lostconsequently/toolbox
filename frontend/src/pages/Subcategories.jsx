import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import SubCategoryCard from "../components/SubCategoryCard";
import SubCategoryListRow from "../components/SubCategoryListRow";
import { useAdmin } from "../context/AdminContext";
import { useSettings } from "../context/SettingsContext";
import ActionButton from "../components/toolForms/shared/ActionButton";
import ActionRow from "../components/toolForms/shared/ActionRow";
import ViewModeToggle from "../components/shared/ViewModeToggle";
import Header from "../components/Header";
import { useConfirm } from "../hooks/useConfirm";
import { useLanguage } from "../context/LanguageContext";

export default function Subcategories() {
  const {
    categories,
    subcategories,

    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
  } = useApp();

  const { isAdmin } = useAdmin();
  const { t } = useLanguage();

  const navigate = useNavigate();

  const goToTools = (subcategory) => {
    navigate(
      `/tools?category=${subcategory.categoryId}&subcategory=${subcategory.id}`,
    );
  };

  const { confirm, dialog: confirmDialog } = useConfirm();

  const { settings, updateSetting } = useSettings();

  const [viewMode, setViewMode] = useState(
    () => settings?.subcategoriesViewMode || "cards",
  );

  useEffect(() => {
    updateSetting("subcategoriesViewMode", viewMode);
  }, [viewMode, updateSetting]);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [editingSubcategoryId, setEditingSubcategoryId] = useState(null);

  const createSubcategory = async () => {
    if (!name.trim() || !categoryId) {
      return;
    }

    try {
      await addSubcategory({
        name,
        categoryId: Number(categoryId),
        icon: "category",
      });

      setName("");
      setCategoryId("");
    } catch (err) {
      console.error(err);
    }
  };

  const saveSubcategory = async () => {
    if (!editingSubcategoryId || !name.trim() || !categoryId) {
      return;
    }

    try {
      await updateSubcategory(editingSubcategoryId, {
        name,
        categoryId: Number(categoryId),
        icon: "category",
      });

      setName("");
      setCategoryId("");
      setEditingSubcategoryId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const startEditSubcategory = (subcategory) => {
    setEditingSubcategoryId(subcategory.id);

    setName(subcategory.name);

    setCategoryId(String(subcategory.categoryId));
  };

  const removeSubcategory = async (id) => {
    const confirmed = await confirm(
      t("subcategoriesPage.deleteConfirmMessage"),
      {
        title: t("subcategoriesPage.deleteConfirmTitle"),
        danger: true,
      },
    );

    if (!confirmed) return;

    try {
      await deleteSubcategory(id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <Header
        title={t("subcategoriesPage.title")}
        crumbs={[
          { label: t("nav.dashboard"), to: "/" },
          { label: t("nav.categories"), to: "/categories" },
          { label: t("subcategoriesPage.title") },
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
          <h2>{t("subcategoriesPage.newHeading")}</h2>

          <input
            placeholder={t("subcategoriesPage.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px",
              marginBottom: "10px",
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          />

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px",
              marginBottom: "10px",
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            <option value="">{t("subcategoriesPage.selectCategory")}</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <ActionRow marginTop="0">
            {editingSubcategoryId ? (
              <>
                <ActionButton variant="success" onClick={saveSubcategory}>
                  {t("common.saveChanges")}
                </ActionButton>

                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    setEditingSubcategoryId(null);
                    setName("");
                    setCategoryId("");
                  }}
                >
                  {t("common.cancel")}
                </ActionButton>
              </>
            ) : (
              <ActionButton
                variant="primary"
                onClick={createSubcategory}
                title={t("subcategoriesPage.addButtonTitle")}
              >
                {t("subcategoriesPage.addButton")}
              </ActionButton>
            )}
          </ActionRow>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {subcategories.map((subcategory) => {
        const category = categories.find(
          (c) => c.id === subcategory.categoryId,
        );

        return viewMode === "list" ? (
          <SubCategoryListRow
            key={subcategory.id}
            subcategory={subcategory}
            category={category}
            onEdit={startEditSubcategory}
            onDelete={removeSubcategory}
            onSelect={goToTools}
          />
        ) : (
          <SubCategoryCard
            key={subcategory.id}
            subcategory={subcategory}
            category={category}
            onEdit={startEditSubcategory}
            onDelete={removeSubcategory}
            onSelect={goToTools}
          />
        );
      })}

      {confirmDialog}
    </div>
  );
}
