import "../styles/hoverCard.css";
import { useSettings } from "../context/SettingsContext";
import { useAdmin } from "../context/AdminContext";
import { useLanguage } from "../context/LanguageContext";
import ActionButton from "./toolForms/shared/ActionButton";
import Card from "./shared/Card";

export default function SubCategoryCard({
  subcategory,
  category,
  onEdit,
  onDelete,
  onSelect,
}) {
  const { settings } = useSettings();

  const compactMode = settings?.compactMode || false;

  const { isAdmin } = useAdmin();
  const { t } = useLanguage();

  return (
    <Card
      tabIndex={0}
      onClick={() => onSelect?.(subcategory)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(subcategory);
        }
      }}
      role="button"
      aria-label={t("subcategoriesPage.showToolsAria", {
        name: subcategory.name,
      })}
      style={{
        padding: compactMode ? "10px" : "16px",

        marginBottom: compactMode ? "6px" : "10px",

        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",

        gap: compactMode ? "10px" : "16px",

        cursor: "pointer",
      }}
    >
      <div>
        <h3
          style={{
            margin: 0,
            color: "var(--text)",

            fontSize: compactMode ? "15px" : "17px",
          }}
        >
          {subcategory.name}
        </h3>

        <p
          style={{
            marginTop: compactMode ? "4px" : "6px",

            marginBottom: 0,

            color: "var(--subtle)",

            fontSize: compactMode ? "12px" : "14px",
          }}
        >
          {category?.name ?? t("subcategoriesPage.noCategory")}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: compactMode ? "6px" : "10px",

          flexShrink: 0,
        }}
      >
        {isAdmin && (
          <ActionButton
            title={t("subcategoriesPage.editTitle")}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(subcategory);
            }}
            variant="edit"
            compactMode={compactMode}
          >
            {t("common.edit")}
          </ActionButton>
        )}

        {isAdmin && (
          <ActionButton
            title={t("subcategoriesPage.deleteTitle")}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(subcategory.id);
            }}
            variant="danger"
            compactMode={compactMode}
          >
            {t("common.delete")}
          </ActionButton>
        )}
      </div>
    </Card>
  );
}
