import { FileCode, Lock, Pencil, Star, Trash2 } from "lucide-react";

import Card from "./shared/Card";
import Badge from "./shared/Badge";
import CardMenu from "./shared/CardMenu";
import { useAdmin } from "../context/AdminContext";
import { useSettings } from "../context/SettingsContext";
import { useLanguage } from "../context/LanguageContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { MOBILE_BREAKPOINT_QUERY } from "../core/tokens";

const BADGE_COLUMN_WIDTH = 172;
const BADGE_COLUMN_WIDTH_COMPACT = 150;

export default function ScriptListRow({
  script,
  category,
  subcategory,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
}) {
  const { isAdmin } = useAdmin();
  const { settings } = useSettings();
  const { t } = useLanguage();

  const compactMode = settings?.compactMode || false;
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);
  const badgeColumnWidth = compactMode
    ? BADGE_COLUMN_WIDTH_COMPACT
    : BADGE_COLUMN_WIDTH;

  return (
    <Card
      hoverShadow
      role="button"
      tabIndex={0}
      onClick={() => onView(script)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onView(script);
        }
      }}
      aria-label={t("scriptLibrary.viewCardAria", { name: script.title })}
      style={{
        padding: compactMode ? "8px 10px" : "10px 12px",
        marginBottom: compactMode ? "6px" : "8px",
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : "minmax(0, 1.6fr) minmax(0, 1.1fr) auto",
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
        <FileCode size={compactMode ? 16 : 18} />

        <div style={{ minWidth: 0, width: "100%" }}>
          <div
            style={{
              color: "var(--text)",
              fontWeight: "600",
              fontSize: compactMode ? "13px" : "14px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {script.title}
            {script.isAdminOnly && <Lock size={12} color="var(--subtle)" />}
          </div>

          {script.description && (
            <div
              style={{
                color: "var(--subtle)",
                fontSize: compactMode ? "11px" : "12px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: "2px",
              }}
            >
              {script.description}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : `${badgeColumnWidth}px minmax(0, 1fr)`,
          gap: compactMode ? "8px" : "12px",
          alignItems: isMobile ? "start" : "center",
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            <Badge
              label={script.language}
              color="#2563eb"
              compactMode={compactMode}
            />
            {script.isTemplate && (
              <Badge
                label={t("scriptLibrary.template")}
                variant="soft"
                compactMode={compactMode}
              />
            )}
          </span>
        </div>

        <div
          style={{
            color: "var(--subtle)",
            fontSize: compactMode ? "12px" : "13px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
          title={`${category?.name || t("scriptLibrary.unknownCategory")}${
            subcategory?.name ? ` > ${subcategory.name}` : ""
          }`}
        >
          {category?.name || t("scriptLibrary.unknownCategory")}
          {subcategory?.name ? ` > ${subcategory.name}` : ""}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: compactMode ? "6px" : "8px",
          justifyContent: isMobile ? "flex-start" : "flex-end",
          alignItems: "center",
          flexWrap: isMobile ? "wrap" : "nowrap",
          flexShrink: 0,
        }}
      >
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(script);
          }}
          title={t("scriptLibrary.favorite")}
          aria-label={t("scriptLibrary.favorite")}
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
          <Star
            size={compactMode ? 14 : 16}
            fill={script.isFavorite ? "var(--primary)" : "transparent"}
            color="var(--primary)"
          />
        </button>

        {isAdmin && (
          <CardMenu
            ariaLabel={t("scriptLibrary.moreActions", {
              name: script.title,
            })}
            items={[
              {
                label: t("scriptLibrary.edit"),
                icon: <Pencil size={14} />,
                onClick: () => onEdit(script),
              },
              {
                label: t("scriptLibrary.delete"),
                icon: <Trash2 size={14} />,
                onClick: () => onDelete(script.id),
                danger: true,
              },
            ]}
          />
        )}
      </div>
    </Card>
  );
}
