import { useSettings } from "../context/SettingsContext";
import { useAdmin } from "../context/AdminContext";
import { useLanguage } from "../context/LanguageContext";
import ActionButton from "./toolForms/shared/ActionButton";
import Card from "./shared/Card";
import "../styles/hoverCard.css";

export default function SubCategoryListRow({
  subcategory,
  category,
  onEdit,
  onDelete,
  onSelect,
}) {
  const { settings } = useSettings();
  const { isAdmin } = useAdmin();
  const { t } = useLanguage();
  const compactMode = settings?.compactMode || false;

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
        padding: compactMode ? "8px 10px" : "10px 12px",
        marginBottom: compactMode ? "6px" : "8px",
        display: "grid",
        gridTemplateColumns: "minmax(220px, 1.5fr) minmax(160px, 1fr) auto",
        gap: compactMode ? "8px" : "12px",
        alignItems: "center",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          color: "var(--text)",
          fontWeight: "600",
          fontSize: compactMode ? "13px" : "14px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {subcategory.name}
      </div>

      <div
        style={{
          color: "var(--subtle)",
          fontSize: compactMode ? "12px" : "13px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {category?.name ?? t("subcategoriesPage.noCategory")}
      </div>

      <div
        style={{
          display: "flex",
          gap: compactMode ? "6px" : "8px",
          justifyContent: "flex-end",
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
