import { MARKETPLACE_CATEGORIES } from "../../core/marketplaceCategories";
import { useLanguage } from "../../context/LanguageContext";
import ActionButton from "../toolForms/shared/ActionButton";
import FormField from "../toolForms/shared/FormField";
import SelectField from "../toolForms/shared/SelectField";

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
        <div style={{ width: "100%", maxWidth: "360px" }}>
          <FormField
            placeholder={t("toolsCenter.searchPlaceholder")}
            value={search}
            onChange={onSearchChange}
            compactMode={compactMode}
          />
        </div>

        <div style={{ minWidth: "170px" }}>
          <SelectField
            value={statusFilter}
            onChange={onStatusFilterChange}
            compactMode={compactMode}
            options={[
              { value: "", label: t("toolsCenter.allStatuses") },
              {
                value: "notInstalled",
                label: t("toolsCenter.statusNotInstalled"),
              },
              { value: "installed", label: t("toolsCenter.statusInstalled") },
              { value: "active", label: t("toolsCenter.statusActive") },
              { value: "disabled", label: t("toolsCenter.statusDisabled") },
              { value: "featured", label: t("toolsCenter.statusFeatured") },
            ]}
          />
        </div>

        <div style={{ minWidth: "190px" }}>
          <SelectField
            value={sortMode}
            onChange={onSortModeChange}
            compactMode={compactMode}
            options={[
              { value: "name", label: t("toolsCenter.sortByName") },
              { value: "category", label: t("toolsCenter.sortByCategory") },
              { value: "status", label: t("toolsCenter.sortByStatus") },
              { value: "recent", label: t("toolsCenter.sortByRecent") },
            ]}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <ActionButton
          variant="chip"
          active={!categoryFilter}
          compactMode={compactMode}
          onClick={() => onCategoryFilterChange("")}
        >
          {t("toolsCenter.allCategories")}
        </ActionButton>

        {Object.entries(MARKETPLACE_CATEGORIES).map(([key, meta]) => (
          <ActionButton
            key={key}
            variant="chip"
            active={categoryFilter === key}
            compactMode={compactMode}
            onClick={() => onCategoryFilterChange(key)}
          >
            {meta.label}
          </ActionButton>
        ))}
      </div>
    </div>
  );
}
