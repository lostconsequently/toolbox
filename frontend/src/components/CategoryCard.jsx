import "../styles/hoverCard.css";
import { useSettings } from "../context/SettingsContext";
import { useAdmin } from "../context/AdminContext";
import { useLanguage } from "../context/LanguageContext";
import ActionButton from "./toolForms/shared/ActionButton";
import Card from "./shared/Card";
import { FALLBACK_COLOR } from "../core/tokens";

export default function CategoryCard({
  category,
  toolCount,
  scriptCount = 0,
  onDelete,
  onEdit,
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
        padding: compactMode ? "12px" : "20px",

        marginBottom: compactMode ? "8px" : "15px",

        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",

        gap: compactMode ? "12px" : "20px",

        cursor: "pointer",
      }}
    >
      <div>
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "6px",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "6px",
                background: category.color || FALLBACK_COLOR,
                border: "1px solid var(--border)",
              }}
            />

            <h4
              style={{
                margin: 0,
              }}
            >
              {category.name}
            </h4>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              color: "var(--subtle)",
              fontSize: "13px",
            }}
          >
            <span>{t("categoriesPage.toolCount", { count: toolCount })}</span>
            <span>
              {t("categoriesPage.scriptCount", { count: scriptCount })}
            </span>
          </div>
        </div>
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
