import { useState } from "react";
import Card from "../../components/shared/Card";
import CollapsibleSectionHeader from "../../components/shared/CollapsibleSectionHeader";
import EmptyState from "../../components/shared/EmptyState";
import ActionButton from "../../components/toolForms/shared/ActionButton";
import { useLanguage } from "../../context/LanguageContext";
import DashboardItemRow from "./DashboardItemRow";
import "../../styles/hoverCard.css";

const FAVORITES_LIMIT = 6;

export default function FavoritesPanel({
  favoriteItems,
  getCategory,
  collapsed,
  onToggleCollapse,
  onOpen,
  onUnfavorite,
}) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  const visibleFavorites = showAll
    ? favoriteItems
    : favoriteItems.slice(0, FAVORITES_LIMIT);

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
        iconName="favorite"
        title={t("dashboard.favorites.title")}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        expandLabel={t("dashboard.favorites.expand")}
        collapseLabel={t("dashboard.favorites.collapse")}
      />

      {!collapsed && (
        <>
          {favoriteItems.length === 0 ? (
            <EmptyState message={t("dashboard.favorites.empty")} />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "12px",
              }}
            >
              {visibleFavorites.map((item) => (
                <DashboardItemRow
                  key={item.key}
                  item={item}
                  getCategory={getCategory}
                  onOpen={onOpen}
                  onUnfavorite={onUnfavorite}
                />
              ))}
            </div>
          )}

          {favoriteItems.length > FAVORITES_LIMIT && (
            <div style={{ marginTop: "12px" }}>
              <ActionButton
                variant="secondary"
                onClick={() => setShowAll((prev) => !prev)}
                compactMode
              >
                {showAll
                  ? t("dashboard.favorites.showLess")
                  : t("dashboard.favorites.showAll", {
                      count: favoriteItems.length,
                    })}
              </ActionButton>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
