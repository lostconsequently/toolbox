import "../styles/hoverCard.css";
import Icon from "./Icon";
import ToolTypeBadge from "./ToolTypeBadge";
import ActionButton from "./toolForms/shared/ActionButton";
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
      tabIndex={0}
      style={{
        padding: compactMode ? "12px" : "18px",
        marginBottom: "12px",

        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: compactMode ? "12px" : "20px",
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
            onClick={() => onToggleFavorite(tool.id)}
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

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        <ActionButton onClick={() => onRun(tool)} compactMode={compactMode}>
          {t("common.run")}
        </ActionButton>
      </div>
    </Card>
  );
}
