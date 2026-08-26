import { MARKETPLACE_CATEGORIES } from "../../core/marketplaceCategories";
import { useLanguage } from "../../context/LanguageContext";

const fieldHeight = { compact: "36px", normal: "42px" };

export default function CatalogFilterBar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortMode,
  onSortModeChange,
  compactMode,
}) {
  const { t } = useLanguage();
  const height = compactMode ? fieldHeight.compact : fieldHeight.normal;

  const fieldStyle = {
    height,
    boxSizing: "border-box",
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "0 12px",
    fontSize: "14px",
    outline: "none",
  };

  const chipStyle = (active) => ({
    display: "inline-flex",
    alignItems: "center",
    height: "28px",
    padding: "0 12px",
    borderRadius: "999px",
    border: active ? "1px solid transparent" : "1px solid var(--border)",
    background: active ? "var(--primary)" : "var(--surface)",
    color: active ? "#ffffff" : "var(--text)",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder={t("toolsCenter.searchPlaceholder")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            ...fieldStyle,
            width: "100%",
            maxWidth: "360px",
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          style={{ ...fieldStyle, minWidth: "170px" }}
        >
          <option value="">{t("toolsCenter.allStatuses")}</option>
          <option value="notInstalled">
            {t("toolsCenter.statusNotInstalled")}
          </option>
          <option value="installed">{t("toolsCenter.statusInstalled")}</option>
          <option value="active">{t("toolsCenter.statusActive")}</option>
          <option value="disabled">{t("toolsCenter.statusDisabled")}</option>
          <option value="featured">{t("toolsCenter.statusFeatured")}</option>
        </select>

        <select
          value={sortMode}
          onChange={(e) => onSortModeChange(e.target.value)}
          style={{ ...fieldStyle, minWidth: "190px" }}
        >
          <option value="name">{t("toolsCenter.sortByName")}</option>
          <option value="category">{t("toolsCenter.sortByCategory")}</option>
          <option value="status">{t("toolsCenter.sortByStatus")}</option>
          <option value="recent">{t("toolsCenter.sortByRecent")}</option>
        </select>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="a11y-focus-ring"
          style={chipStyle(!categoryFilter)}
          onClick={() => onCategoryFilterChange("")}
        >
          {t("toolsCenter.allCategories")}
        </button>

        {Object.entries(MARKETPLACE_CATEGORIES).map(([key, meta]) => (
          <button
            key={key}
            type="button"
            className="a11y-focus-ring"
            style={chipStyle(categoryFilter === key)}
            onClick={() => onCategoryFilterChange(key)}
          >
            {meta.label}
          </button>
        ))}
      </div>
    </div>
  );
}
