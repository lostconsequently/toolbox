import { FileCode, Lock, Star } from "lucide-react";

import Card from "./shared/Card";
import Badge from "./shared/Badge";
import ActionButton from "./toolForms/shared/ActionButton";
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
      tabIndex={0}
      style={{
        padding: compactMode ? "12px" : "18px",
        marginBottom: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: compactMode ? "12px" : "20px",
        flexWrap: "wrap",
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
            onClick={() => onToggleFavorite(script)}
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

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <ActionButton onClick={() => onView(script)} compactMode={compactMode}>
          {t("scriptLibrary.view")}
        </ActionButton>

        {isAdmin && (
          <ActionButton
            title={t("scriptLibrary.edit")}
            onClick={() => onEdit(script)}
            variant="edit"
            compactMode={compactMode}
          >
            {t("scriptLibrary.edit")}
          </ActionButton>
        )}

        {isAdmin && (
          <ActionButton
            title={t("scriptLibrary.delete")}
            onClick={() => onDelete(script.id)}
            variant="danger"
            compactMode={compactMode}
          >
            {t("scriptLibrary.delete")}
          </ActionButton>
        )}
      </div>
    </Card>
  );
}
