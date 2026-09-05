import Icon from "./Icon";
import ToolTypeBadge, { TOOL_TYPE_BADGE_COLUMN_WIDTH } from "./ToolTypeBadge";
import Card from "./shared/Card";
import { useSettings } from "../context/SettingsContext";
import { useLanguage } from "../context/LanguageContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { MOBILE_BREAKPOINT_QUERY } from "../core/tokens";
import { Star } from "lucide-react";
import "../styles/hoverCard.css";

export default function ToolListRow({
  tool,
  category,
  subcategory,
  onToggleFavorite,
  onRun,
}) {
  const { settings } = useSettings();
  const { t } = useLanguage();
  const compactMode = settings?.compactMode || false;
  // The 5-column grid below (minmax(220px,...) + a fixed badge width + more
  // minmax columns) needs ~620px to lay out without clipping - on a phone
  // it just needs to stack instead of trying to fit that many columns.
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);

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
        padding: compactMode ? "8px 10px" : "10px 12px",
        marginBottom: compactMode ? "6px" : "8px",
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : `minmax(220px, 1.5fr) ${TOOL_TYPE_BADGE_COLUMN_WIDTH}px minmax(180px, 1fr) auto`,
        gap: compactMode ? "8px" : "12px",
        alignItems: isMobile ? "stretch" : "center",
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
        <Icon name={tool.icon} size={compactMode ? 16 : 18} />

        <div
          style={{
            minWidth: 0,
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              width: "100%",
              minWidth: 0,
            }}
          >
            <span
              style={{
                color: "var(--text)",
                fontWeight: "600",
                fontSize: compactMode ? "13px" : "14px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {tool.name}
            </span>

            {tool.featured && (
              <Star
                size={compactMode ? 12 : 13}
                fill="var(--primary)"
                color="var(--primary)"
                aria-label={t("toolsPage.featured")}
                title={t("toolsPage.featured")}
                style={{ flexShrink: 0 }}
              />
            )}
          </div>

          {tool.description && (
            <div
              style={{
                color: "var(--subtle)",
                fontSize: compactMode ? "11px" : "12px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: "2px",
                width: "100%",
              }}
            >
              {tool.description}
            </div>
          )}
        </div>
      </div>

      <div style={{ justifySelf: "start" }}>
        <ToolTypeBadge toolType={tool.toolType} compactMode={compactMode} />
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
        {category?.name || t("common.noCategory")}

        {subcategory?.name ? ` > ${subcategory.name}` : ""}
      </div>

      <div style={{ justifySelf: "end" }}>
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
            fontSize: compactMode ? "16px" : "18px",
            padding: 0,
            lineHeight: 1,
          }}
        >
          <Star
            size={compactMode ? 14 : 16}
            fill={tool.favorite ? "var(--primary)" : "transparent"}
            color="var(--primary)"
          />
        </button>
      </div>
    </Card>
  );
}
