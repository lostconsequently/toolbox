import Card from "../../components/shared/Card";
import CollapsibleSectionHeader from "../../components/shared/CollapsibleSectionHeader";
import EmptyState from "../../components/shared/EmptyState";
import { useLanguage } from "../../context/LanguageContext";
import DashboardItemRow from "./DashboardItemRow";
import "../../styles/hoverCard.css";

export default function RecentPanel({
  recentItems,
  getCategory,
  collapsed,
  onToggleCollapse,
  onOpen,
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
        iconName="recent"
        title={t("dashboard.recent.title")}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        expandLabel={t("dashboard.recent.expand")}
        collapseLabel={t("dashboard.recent.collapse")}
      />

      {!collapsed && (
        <>
          {recentItems.length === 0 ? (
            <EmptyState message={t("dashboard.recent.empty")} />
          ) : (
            recentItems.map((item) => (
              <DashboardItemRow
                key={item.key}
                item={item}
                getCategory={getCategory}
                onOpen={onOpen}
                compact
                timestampText={item.timestampText}
              />
            ))
          )}
        </>
      )}
    </Card>
  );
}
