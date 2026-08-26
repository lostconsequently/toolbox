import Icon from "../../components/Icon";
import Card from "../../components/shared/Card";
import CollapsibleSectionHeader from "../../components/shared/CollapsibleSectionHeader";
import EmptyState from "../../components/shared/EmptyState";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/hoverCard.css";

export default function CategoriesPanel({
  categories,
  getToolCountForCategory,
  collapsed,
  onToggleCollapse,
  onNavigate,
}) {
  const { t } = useLanguage();

  return (
    <Card
      hoverShadow
      tabIndex={0}
      style={{
        padding: "20px",
        marginTop: "20px",
      }}
    >
      <CollapsibleSectionHeader
        iconName="category"
        title={t("dashboard.categoriesPanel.title")}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        expandLabel={t("dashboard.categoriesPanel.expand")}
        collapseLabel={t("dashboard.categoriesPanel.collapse")}
      />

      {!collapsed && (
        <>
          {categories.length === 0 ? (
            <EmptyState message={t("dashboard.categoriesPanel.empty")} />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "15px",
              }}
            >
              {categories.map((category) => {
                const toolCount = getToolCountForCategory(category.id);

                return (
                  <div
                    key={category.id}
                    className="hover-shift-right"
                    onClick={() => onNavigate(`/tools?category=${category.id}`)}
                    style={{
                      background: "var(--surface)",
                      padding: "20px",
                      borderRadius: "14px",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        marginBottom: "10px",
                      }}
                    >
                      <Icon name="category" size={24} />
                    </div>

                    <h3
                      style={{
                        margin: 0,
                        color: "var(--text)",
                        fontSize: "18px",
                        fontWeight: "600",
                      }}
                    >
                      {category.name}
                    </h3>

                    <p
                      style={{
                        color: "var(--subtle)",
                        marginTop: "6px",
                        marginBottom: 0,
                        fontSize: "13px",
                      }}
                    >
                      {t("dashboard.categoriesPanel.toolsAvailable", {
                        count: toolCount,
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
