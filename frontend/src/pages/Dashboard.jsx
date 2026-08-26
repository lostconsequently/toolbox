import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import StatCard from "../components/StatCard";
import { useApp } from "../context/AppContext";
import Icon from "../components/Icon";
import { useSettings } from "../context/SettingsContext";
import { useToolWindows } from "../context/ToolWindowsContext";
import { useScriptLibrary } from "../context/ScriptLibraryContext";
import "../styles/hoverCard.css";

import {
  addRecentScript,
  addRecentTool,
  filterExistingRecentItems,
  getRecentItems,
} from "../core/utils/executeTool";
import SearchPanel from "./Dashboard/SearchPanel";
import FavoritesPanel from "./Dashboard/FavoritesPanel";
import RecentPanel from "./Dashboard/RecentPanel";
import CategoriesPanel from "./Dashboard/CategoriesPanel";
import Badge from "../components/shared/Badge";
import Card from "../components/shared/Card";
import EmptyState from "../components/shared/EmptyState";
import { FALLBACK_COLOR } from "../core/tokens";
import { formatRelativeTime } from "../core/utils/formatRelativeTime";
import { useLanguage } from "../context/LanguageContext";

function toToolItem(tool) {
  return {
    key: `tool-${tool.id}`,
    kind: "tool",
    id: tool.id,
    name: tool.name,
    description: tool.description,
    categoryId: tool.categoryId,
    icon: tool.icon || "tool",
    entity: tool,
  };
}

function toScriptItem(script) {
  return {
    key: `script-${script.id}`,
    kind: "script",
    id: script.id,
    name: script.title,
    description: script.description,
    categoryId: script.categoryId,
    icon: "script",
    entity: script,
  };
}

export default function Dashboard() {
  const { categories, subcategories, tools, toggleToolFavorite } = useApp();
  const { scripts, toggleScriptFavorite } = useScriptLibrary();

  const { settings, updateSetting } = useSettings();
  const { t } = useLanguage();

  const compactMode = settings?.compactMode || false;

  const navigate = useNavigate();

  const { openTool, openScript } = useToolWindows();

  const collapsedSections = settings?.collapsedSections || {
    favorites: false,
    recent: false,
    categories: false,
  };

  const getCategory = (categoryId) => {
    return categories.find((cat) => String(cat.id) === String(categoryId));
  };

  const {
    showStats = true,
    showQuickCategories = true,
    showFavorites = true,
    showRecentTools = true,
    showCategories = true,
  } = settings;

  const openScriptWindow = (script) => {
    addRecentScript(script);
    openScript(script);
  };

  const runTool = (tool) => {
    addRecentTool(tool);
    openTool(tool);
  };

  const openItem = (item) => {
    if (item.kind === "script") {
      openScriptWindow(item.entity);
    } else {
      runTool(item.entity);
    }
  };

  const unfavoriteItem = async (item) => {
    try {
      if (item.kind === "script") {
        await toggleScriptFavorite(item.id, false);
      } else {
        await toggleToolFavorite(item.id, false);
      }
    } catch (err) {
      console.error("Updating favorite failed:", err);
    }
  };

  const favoriteItems = [
    ...tools.filter((tool) => tool.favorite).map(toToolItem),
    ...scripts.filter((script) => script.isFavorite).map(toScriptItem),
  ];

  const recentItems = filterExistingRecentItems(
    getRecentItems(),
    tools,
    scripts,
  ).map((entry) => {
    const timestampText = formatRelativeTime(entry.usedAt, t);

    if (entry.kind === "script") {
      const script = scripts.find(
        (candidate) => String(candidate.id) === String(entry.id),
      );

      return { ...toScriptItem(script), timestampText };
    }

    const tool = tools.find(
      (candidate) => String(candidate.id) === String(entry.id),
    );

    return { ...toToolItem(tool), timestampText };
  });

  const getToolCountForCategory = (categoryId) => {
    return tools.filter((tool) => tool.categoryId === categoryId).length;
  };

  const toggleSection = (section) => {
    updateSetting("collapsedSections", {
      ...collapsedSections,
      [section]: !collapsedSections[section],
    });
  };

  const Section = ({ visible, children }) => {
    if (!visible) return null;
    return children;
  };

  return (
    <>
      <Header title={t("dashboard.title")} />

      <SearchPanel
        categories={categories}
        subcategories={subcategories}
        tools={tools}
        scripts={scripts}
        compactMode={compactMode}
        getToolCountForCategory={getToolCountForCategory}
        onNavigate={navigate}
        onRunTool={runTool}
        onOpenScript={openScriptWindow}
      />

      <Section visible={showStats}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: compactMode ? "12px" : "20px",
          }}
        >
          <StatCard
            title={t("dashboard.stats.tools")}
            value={tools.length}
            color="#10b981"
            icon="tool"
            onClick={() => navigate("/tools")}
          />

          <StatCard
            title={t("dashboard.stats.scripts")}
            value={scripts.length}
            color="#8b5cf6"
            icon="script"
            onClick={() => navigate("/script-library")}
          />

          <StatCard
            title={t("dashboard.stats.categories")}
            value={categories.length}
            color="#3b82f6"
            icon="category"
            onClick={() => navigate("/categories")}
          />

          <StatCard
            title={t("dashboard.stats.subcategories")}
            value={subcategories.length}
            color="#ef4444"
            icon="category"
            onClick={() => navigate("/subcategories")}
          />
        </div>
      </Section>

      <Section visible={showQuickCategories}>
        <Card
          hoverShadow
          tabIndex={0}
          style={{
            padding: "20px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Icon name="quick" size={22} />

              <h2
                style={{
                  margin: 0,
                  color: "var(--text)",
                }}
              >
                {t("dashboard.quickCategories.title")}
              </h2>
            </div>

            <p
              style={{
                marginTop: "6px",
                marginBottom: 0,
                color: "var(--subtle)",
                fontSize: "14px",
              }}
            >
              {t("dashboard.quickCategories.subtitle")}
            </p>
          </div>

          {categories.length === 0 ? (
            <EmptyState message={t("dashboard.quickCategories.empty")} />
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {categories.map((category) => {
                const toolCount = getToolCountForCategory(category.id);

                return (
                  <button
                    key={category.id}
                    className="hover-card"
                    onClick={() => navigate(`/tools?category=${category.id}`)}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "999px",
                      padding: "8px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Badge
                      label={toolCount}
                      color={category.color || FALLBACK_COLOR}
                      variant="solid"
                      compactMode
                    />

                    <span
                      style={{
                        color: "var(--text)",
                        fontWeight: "500",
                      }}
                    >
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </Section>

      <Section visible={showFavorites}>
        <FavoritesPanel
          favoriteItems={favoriteItems}
          getCategory={getCategory}
          collapsed={collapsedSections.favorites}
          onToggleCollapse={() => toggleSection("favorites")}
          onOpen={openItem}
          onUnfavorite={unfavoriteItem}
        />
      </Section>

      <Section visible={showRecentTools}>
        <RecentPanel
          recentItems={recentItems}
          getCategory={getCategory}
          collapsed={collapsedSections.recent}
          onToggleCollapse={() => toggleSection("recent")}
          onOpen={openItem}
        />
      </Section>

      <Section visible={showCategories}>
        <CategoriesPanel
          categories={categories}
          getToolCountForCategory={getToolCountForCategory}
          collapsed={collapsedSections.categories}
          onToggleCollapse={() => toggleSection("categories")}
          onNavigate={navigate}
        />
      </Section>
    </>
  );
}
