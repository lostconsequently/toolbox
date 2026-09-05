import { FileCode, Lock, Pencil, Star, Trash2 } from "lucide-react";

import Card from "./shared/Card";
import Badge from "./shared/Badge";
import CardMenu from "./shared/CardMenu";
import { useAdmin } from "../context/AdminContext";
import { useSettings } from "../context/SettingsContext";
import { useLanguage } from "../context/LanguageContext";
import "../styles/hoverCard.css";

function parseTags(tagsJson) {
  try {
    const parsed = JSON.parse(tagsJson || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ScriptCard({
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
  const tags = parseTags(script.tags);

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
        padding: compactMode ? "12px" : "18px",
        marginBottom: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: compactMode ? "12px" : "20px",
        flexWrap: "wrap",
        cursor: "pointer",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: compactMode ? "4px" : "8px",
          }}
        >
          <FileCode size={18} />

          <h3 style={{ margin: 0, color: "var(--text)" }}>{script.title}</h3>

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
              size={16}
              fill={script.isFavorite ? "var(--primary)" : "transparent"}
              color="var(--primary)"
            />
          </button>

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

          {script.isAdminOnly && (
            <span
              title={t("scriptLibrary.adminOnly")}
              style={{ display: "flex" }}
            >
              <Lock size={14} color="var(--subtle)" />
            </span>
          )}
        </div>

        <div
          style={{
            color: "var(--subtle)",
            fontSize: "14px",
            marginBottom: "6px",
          }}
        >
          {category?.name || t("scriptLibrary.unknownCategory")}
          {subcategory?.name ? ` > ${subcategory.name}` : ""}
        </div>

        {script.description && (
          <div
            style={{
              color: "var(--subtle)",
              fontSize: compactMode ? "13px" : "14px",
              marginBottom: "6px",
            }}
          >
            {script.description}
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {tags.map((tag) => (
              <Badge
                key={tag}
                label={tag}
                variant="soft"
                compactMode={compactMode}
              />
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <CardMenu
          ariaLabel={t("scriptLibrary.moreActions", { name: script.title })}
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
    </Card>
  );
}
