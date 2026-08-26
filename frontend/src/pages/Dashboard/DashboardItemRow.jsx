import { Star } from "lucide-react";
import Icon from "../../components/Icon";
import Badge from "../../components/shared/Badge";
import ActionButton from "../../components/toolForms/shared/ActionButton";
import { FALLBACK_COLOR } from "../../core/tokens";
import { getSearchBadgeColor } from "../../core/utils/search";
import { useLanguage } from "../../context/LanguageContext";

export default function DashboardItemRow({
  item,
  getCategory,
  onOpen,
  onUnfavorite,
  compact = false,
  timestampText,
}) {
  const { t } = useLanguage();
  const category = getCategory(item.categoryId);

  return (
    <div
      className="hover-shift-right"
      style={{
        background: "var(--surface)",
        padding: compact ? "10px 14px" : "16px",
        borderRadius: compact ? "10px" : "12px",
        marginBottom: compact ? "8px" : "12px",
        border: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: compact ? "14px" : "16px",
              fontWeight: "600",
              color: "var(--text)",
            }}
          >
            <Icon name={item.icon} size={16} /> {item.name}
          </span>

          {onUnfavorite && (
            <button
              type="button"
              onClick={() => onUnfavorite(item)}
              title={t("dashboard.favorites.unfavorite")}
              aria-label={t("dashboard.favorites.unfavorite")}
              className="a11y-focus-ring"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
                display: "flex",
                borderRadius: "4px",
              }}
            >
              <Star size={16} fill="var(--primary)" color="var(--primary)" />
            </button>
          )}

          {item.kind === "script" && (
            <Badge
              label={t("dashboard.itemKind.script")}
              color={getSearchBadgeColor("SCRIPT")}
              variant="solid"
              compactMode
            />
          )}

          <Badge
            label={category?.name || t("common.unknown")}
            color={category?.color || FALLBACK_COLOR}
            variant="solid"
            compactMode
          />

          {timestampText && (
            <span style={{ fontSize: "12px", color: "var(--subtle)" }}>
              {timestampText}
            </span>
          )}
        </div>

        {!compact && (
          <div
            style={{
              fontSize: "13px",
              color: "var(--subtle)",
              marginTop: "4px",
            }}
          >
            {item.description || t("dashboard.favorites.noDescription")}
          </div>
        )}
      </div>

      <ActionButton onClick={() => onOpen(item)}>
        {item.kind === "script" ? t("common.open") : t("common.run")}
      </ActionButton>
    </div>
  );
}
