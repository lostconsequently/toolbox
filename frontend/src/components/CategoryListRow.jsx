import { useSettings } from "../context/SettingsContext";
import { useAdmin } from "../context/AdminContext";
import { useLanguage } from "../context/LanguageContext";
import ActionButton from "./toolForms/shared/ActionButton";
import Card from "./shared/Card";
import { FALLBACK_COLOR } from "../core/tokens";
import "../styles/hoverCard.css";

export default function CategoryListRow({
  category,
  toolCount,
  scriptCount = 0,
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
      onClick={() => onSelect?.(category)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(category);
        }
      }}
      role="button"
      aria-label={t("categoriesPage.showToolsAria", { name: category.name })}
      style={{
        padding: compactMode ? "8px 10px" : "10px 12px",
        marginBottom: compactMode ? "6px" : "8px",
        display: "grid",
        gridTemplateColumns: "minmax(220px, 1.5fr) 120px 120px auto",
        gap: compactMode ? "8px" : "12px",
        alignItems: "center",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: "14px",
            height: "14px",
            borderRadius: "5px",
            background: category.color || FALLBACK_COLOR,
            border: "1px solid var(--border)",
            flexShrink: 0,
          }}
        />

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
          {category.name}
        </div>
      </div>

      <div
        style={{
          color: "var(--subtle)",
          fontSize: compactMode ? "12px" : "13px",
        }}
      >
        {t("categoriesPage.toolCount", { count: toolCount })}
      </div>

      <div
        style={{
          color: "var(--subtle)",
          fontSize: compactMode ? "12px" : "13px",
        }}
      >
        {t("categoriesPage.scriptCount", { count: scriptCount })}
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
            title={t("categoriesPage.editTitle")}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(category);
            }}
            variant="edit"
            compactMode={compactMode}
          >
            {t("common.edit")}
          </ActionButton>
        )}

        {isAdmin && (
          <ActionButton
            title={t("categoriesPage.deleteTitle")}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category.id);
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
