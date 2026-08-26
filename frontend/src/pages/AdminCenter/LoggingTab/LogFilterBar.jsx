import { X } from "lucide-react";

import FormField from "../../../components/toolForms/shared/FormField";
import LevelBadge from "../../../components/shared/LevelBadge";
import { useLanguage } from "../../../context/LanguageContext";

const LEVELS = ["info", "warning", "error", "critical"];
const CATEGORIES = ["system", "error", "security", "api", "auth"];

function toggleValue(list, value) {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

export default function LogFilterBar({ filters, onChange, compactMode }) {
  const { t } = useLanguage();

  const update = (patch) => onChange({ ...filters, ...patch });

  const hasActiveFilters =
    filters.level.length > 0 ||
    filters.category.length > 0 ||
    filters.eventType ||
    filters.q ||
    filters.from ||
    filters.to;

  return (
    <div
      style={{
        display: "grid",
        gap: "12px",
        marginBottom: "14px",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "11px",
            fontWeight: "600",
            color: "var(--subtle)",
            marginBottom: "6px",
          }}
        >
          {t("adminCenter.logging.filterLevel")}
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() =>
                update({ level: toggleValue(filters.level, level) })
              }
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                opacity:
                  filters.level.length === 0 || filters.level.includes(level)
                    ? 1
                    : 0.4,
              }}
            >
              <LevelBadge level={level} compactMode={compactMode} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "11px",
            fontWeight: "600",
            color: "var(--subtle)",
            marginBottom: "6px",
          }}
        >
          {t("adminCenter.logging.filterCategory")}
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {CATEGORIES.map((category) => {
            const active =
              filters.category.length === 0 ||
              filters.category.includes(category);

            return (
              <button
                key={category}
                type="button"
                onClick={() =>
                  update({ category: toggleValue(filters.category, category) })
                }
                style={{
                  padding: "4px 10px",
                  borderRadius: "999px",
                  border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                  background: active ? "var(--overlay)" : "transparent",
                  color: active ? "var(--primary)" : "var(--subtle)",
                  fontSize: compactMode ? "11px" : "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {t(`adminCenter.logging.category.${category}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          alignItems: "end",
        }}
      >
        <FormField
          label={t("adminCenter.logging.filterSearch")}
          value={filters.q}
          onChange={(value) => update({ q: value })}
          placeholder={t("adminCenter.logging.filterSearchPlaceholder")}
          compactMode={compactMode}
        />

        <FormField
          label={t("adminCenter.logging.filterFrom")}
          type="date"
          value={filters.from}
          onChange={(value) => update({ from: value })}
          compactMode={compactMode}
        />

        <FormField
          label={t("adminCenter.logging.filterTo")}
          type="date"
          value={filters.to}
          onChange={(value) => update({ to: value })}
          compactMode={compactMode}
        />

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: compactMode ? "12px" : "13px",
            color: "var(--text)",
            height: compactMode ? "34px" : "38px",
          }}
        >
          <input
            type="checkbox"
            checked={filters.includeUserAudit}
            onChange={(event) =>
              update({ includeUserAudit: event.target.checked })
            }
          />
          {t("adminCenter.logging.filterIncludeAudit")}
        </label>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() =>
            onChange({
              level: [],
              category: [],
              eventType: "",
              q: "",
              from: "",
              to: "",
              includeUserAudit: filters.includeUserAudit,
            })
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            alignSelf: "start",
            background: "transparent",
            border: "none",
            color: "var(--primary)",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <X size={12} />
          {t("adminCenter.logging.clearFilters")}
        </button>
      )}
    </div>
  );
}
