import "../styles/hoverCard.css";
import Icon from "./Icon";
import ToolTypeBadge from "./ToolTypeBadge";
import Card from "./shared/Card";
import { useSettings } from "../context/SettingsContext";
import { useLanguage } from "../context/LanguageContext";
import { Star } from "lucide-react";
export default function ToolCard({
  tool,
  category,
  subcategory,
  onToggleFavorite,
  onRun,
}) {
  const { settings } = useSettings();

  const compactMode = settings?.compactMode || false;

  const { t } = useLanguage();

  return (
    <Card
      hoverShadow
      role="button"
      tabIndex={0}
      onClick={() => onRun(tool)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onRun(tool);
        }
      }}
      aria-label={t("toolsPage.runCardAria", { name: tool.name })}
      style={{
        padding: compactMode ? "12px" : "18px",
        marginBottom: "12px",

        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: compactMode ? "12px" : "20px",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: compactMode ? "4px" : "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Icon name={tool.icon} size={20} />

            <h3
              style={{
                margin: 0,
                color: "var(--text)",
              }}
            >
              {tool.name}
            </h3>
          </div>

          <button
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(tool.id);
            }}
            title={t("toolsPage.favorite")}
            aria-label={t("toolsPage.favorite")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "18px",
              padding: 0,
              lineHeight: 1,
            }}
          >
            <Star
              size={16}
              fill={tool.favorite ? "var(--primary)" : "transparent"}
              color="var(--primary)"
            />
          </button>

          {tool.featured && (
            <Star
              size={14}
              fill="var(--primary)"
              color="var(--primary)"
              aria-label={t("toolsPage.featured")}
              title={t("toolsPage.featured")}
            />
          )}

          <ToolTypeBadge toolType={tool.toolType} compactMode={compactMode} />
        </div>

        <div
          style={{
            color: "var(--subtle)",
            fontSize: "14px",
            marginBottom: "6px",
          }}
        >
          {category?.name || t("common.noCategory")}

          {subcategory?.name ? ` > ${subcategory.name}` : ""}
        </div>

        {tool.description && (
          <div
            style={{
              color: "var(--subtle)",
              fontSize: compactMode ? "13px" : "14px",
            }}
          >
            {tool.description}
          </div>
        )}
      </div>
    </Card>
  );
}
