import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import ToolCard from "../components/ToolCard";
import Icon from "../components/Icon";
import { addRecentTool } from "../core/utils/executeTool";
import { useSettings } from "../context/SettingsContext";
import { useToolWindows } from "../context/ToolWindowsContext";
import ToolListRow from "../components/ToolListRow";
import { ChevronDown, ChevronRight, PackageSearch } from "lucide-react";
import "../styles/hoverCard.css";
import ActionButton from "../components/toolForms/shared/ActionButton";
import ActionRow from "../components/toolForms/shared/ActionRow";
import ViewModeToggle from "../components/shared/ViewModeToggle";
import EmptyState from "../components/shared/EmptyState";
import Header from "../components/Header";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { scoreTool, sortByScoreDesc } from "../core/utils/search";
import { useLanguage } from "../context/LanguageContext";

export default function Tools() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { categories, subcategories, tools, toggleToolFavorite } = useApp();

  const { settings, updateSetting } = useSettings();

  const compactMode = settings?.compactMode || false;

  const { openTool } = useToolWindows();

  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategoryFromUrl = searchParams.get("category") || "";

  const selectedSubcategoryFromUrl = searchParams.get("subcategory") || "";

  const selectedToolFromUrl = searchParams.get("tool") || "";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);
  const [viewMode, setViewMode] = useState(
    () => settings?.toolsViewMode || "cards",
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    () => selectedCategoryFromUrl || settings?.toolsSelectedCategoryId || "",
  );
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(
    () =>
      selectedSubcategoryFromUrl || settings?.toolsSelectedSubcategoryId || "",
  );

  const [expandedSubcategories, setExpandedSubcategories] = useState(() => {
    const saved = settings?.toolsExpandedSubcategories || {};
    const expanded = { ...saved };

    subcategories.forEach((sub) => {
      if (!(sub.id in expanded)) {
        expanded[sub.id] = true;
      }
    });

    return expanded;
  });
  const [expandedCategories, setExpandedCategories] = useState(() => {
    const saved = settings?.toolsExpandedCategories || {};
    const expanded = { ...saved };

    categories.forEach((cat) => {
      if (!(cat.id in expanded)) {
        expanded[cat.id] = true;
      }
    });

    return expanded;
  });

  useEffect(() => {
    updateSetting("toolsExpandedCategories", expandedCategories);
  }, [expandedCategories, updateSetting]);

  useEffect(() => {
    updateSetting("toolsExpandedSubcategories", expandedSubcategories);
  }, [expandedSubcategories, updateSetting]);

  useEffect(() => {
    updateSetting("toolsViewMode", viewMode);
  }, [viewMode, updateSetting]);

  useEffect(() => {
    updateSetting("toolsSelectedCategoryId", selectedCategoryId);
  }, [selectedCategoryId, updateSetting]);

  useEffect(() => {
    updateSetting("toolsSelectedSubcategoryId", selectedSubcategoryId);
  }, [selectedSubcategoryId, updateSetting]);

  useEffect(() => {
    if (!selectedToolFromUrl) return;

    const toolToRun = tools.find(
      (tool) => String(tool.id) === String(selectedToolFromUrl),
    );

    if (!toolToRun) return;

    addRecentTool(toolToRun);
    openTool(toolToRun);

    if (toolToRun.categoryId) {
      setExpandedCategories((prev) => ({
        ...prev,
        [toolToRun.categoryId]: true,
      }));
      setSelectedCategoryId(String(toolToRun.categoryId));
    }

    if (toolToRun.subcategoryId) {
      setExpandedSubcategories((prev) => ({
        ...prev,
        [toolToRun.subcategoryId]: true,
      }));
    }

    const nextParams = { category: String(toolToRun.categoryId) };

    if (toolToRun.subcategoryId) {
      nextParams.subcategory = String(toolToRun.subcategoryId);
    }

    setSearchParams(nextParams);
  }, [selectedToolFromUrl, tools, setSearchParams, openTool]);

  const toggleCategory = (id) => {
    setExpandedCategories((prev) => {
      const updated = {
        ...prev,
      };

      updated[id] = !prev[id];

      return updated;
    });
  };

  const toggleSubcategory = (id) => {
    setExpandedSubcategories((prev) => {
      const updated = {
        ...prev,
      };

      updated[id] = !prev[id];

      return updated;
    });
  };

  const handleToggleKeyDown = (event, toggleFn) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleFn();
    }
  };

  const expandAll = () => {
    const expandedSubs = {};
    const expandedCats = {};

    subcategories.forEach((sub) => {
      expandedSubs[sub.id] = true;
    });

    categories.forEach((cat) => {
      expandedCats[cat.id] = true;
    });

    setExpandedSubcategories(expandedSubs);
    setExpandedCategories(expandedCats);
  };

  const collapseAll = () => {
    const collapsedSubs = {};
    const collapsedCats = {};

    subcategories.forEach((sub) => {
      collapsedSubs[sub.id] = false;
    });

    categories.forEach((cat) => {
      collapsedCats[cat.id] = false;
    });

    setExpandedSubcategories(collapsedSubs);
    setExpandedCategories(collapsedCats);
  };

  const toggleFavorite = async (id) => {
    const tool = tools.find((t) => t.id === id);

    if (!tool) return;

    try {
      await toggleToolFavorite(id, !tool.favorite);
    } catch (err) {
      console.error("Updating favorite failed:", err);
    }
  };

  const runTool = (tool) => {
    addRecentTool(tool);
    openTool(tool);
  };

  const handleFilterChange = (categoryId, subcategoryId = "") => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(subcategoryId);

    const params = {};

    if (categoryId) params.category = categoryId;
    if (subcategoryId) params.subcategory = subcategoryId;

    setSearchParams(params);
  };

  const handleCategoryFilterChange = (value) => {
    handleFilterChange(value, "");
  };

  const publishedTools = useMemo(
    () => tools.filter((tool) => tool.enabled && !tool.isDraft),
    [tools],
  );

  const filteredTools = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();

    const matchesFilters = (tool) => {
      const matchesCategory = selectedCategoryId
        ? tool.categoryId === Number(selectedCategoryId)
        : true;

      const matchesSubcategory = selectedSubcategoryId
        ? tool.subcategoryId === Number(selectedSubcategoryId)
        : true;

      return matchesCategory && matchesSubcategory;
    };

    const filtered = publishedTools.filter(matchesFilters);

    if (!term) {
      return filtered;
    }

    return sortByScoreDesc(
      filtered
        .map((tool) => ({
          ...tool,
          score: scoreTool(tool, term, {
            category: categories.find((c) => c.id === tool.categoryId),
            subcategory: subcategories.find((s) => s.id === tool.subcategoryId),
            isFavorite: tool.favorite,
          }),
        }))
        .filter((tool) => tool.score > 0),
    );
  }, [
    publishedTools,
    debouncedSearch,
    selectedCategoryId,
    selectedSubcategoryId,
    categories,
    subcategories,
  ]);

  const subcategoriesByCategory = useMemo(() => {
    const map = new Map();

    subcategories.forEach((sub) => {
      const list = map.get(sub.categoryId) || [];
      list.push(sub);
      map.set(sub.categoryId, list);
    });

    return map;
  }, [subcategories]);

  const toolsByCategory = useMemo(() => {
    const subcategoryIdSet = new Set(subcategories.map((sub) => sub.id));
    const map = new Map();

    categories.forEach((category) => {
      map.set(category.id, {
        withoutSubcategory: [],
        bySubcategoryId: new Map(),
      });
    });

    filteredTools.forEach((tool) => {
      const bucket = map.get(tool.categoryId);

      if (!bucket) return;

      if (tool.subcategoryId && subcategoryIdSet.has(tool.subcategoryId)) {
        const list = bucket.bySubcategoryId.get(tool.subcategoryId) || [];
        list.push(tool);
        bucket.bySubcategoryId.set(tool.subcategoryId, list);
      } else {
        bucket.withoutSubcategory.push(tool);
      }
    });

    return map;
  }, [filteredTools, categories, subcategories]);

  return (
    <div>
      <Header
        title={t("toolsPage.title")}
        crumbs={[
          { label: t("nav.dashboard"), to: "/" },
          { label: t("nav.categories"), to: "/categories" },
          ...(selectedCategoryId
            ? [
                {
                  label:
                    categories.find(
                      (c) => String(c.id) === String(selectedCategoryId),
                    )?.name || t("categoriesPage.title"),
                },
              ]
            : []),
          ...(selectedSubcategoryId
            ? [
                {
                  label:
                    subcategories.find(
                      (s) => String(s.id) === String(selectedSubcategoryId),
                    )?.name || t("subcategoriesPage.title"),
                },
              ]
            : []),
          { label: t("nav.tools") },
        ]}
      />

      {(selectedCategoryId || selectedSubcategoryId) &&
        (() => {
          const activeCategory = categories.find(
            (category) => String(category.id) === String(selectedCategoryId),
          );

          const activeSubcategory = selectedSubcategoryId
            ? subcategories.find(
                (sub) => String(sub.id) === String(selectedSubcategoryId),
              )
            : null;

          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: compactMode ? "12px" : "16px",
                fontSize: "13px",
                color: "var(--subtle)",
              }}
            >
              <button
                type="button"
                onClick={() => handleFilterChange("", "")}
                className="a11y-focus-ring"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary)",
                  cursor: "pointer",
                  padding: "2px 4px",
                  fontSize: "13px",
                  textDecoration: "underline",
                }}
              >
                {t("toolsPage.allTools")}
              </button>

              <ChevronRight size={12} aria-hidden="true" />

              {activeSubcategory ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleFilterChange(selectedCategoryId, "")}
                    className="a11y-focus-ring"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--primary)",
                      cursor: "pointer",
                      padding: "2px 4px",
                      fontSize: "13px",
                      textDecoration: "underline",
                    }}
                  >
                    {activeCategory?.name || t("toolsPage.unknownCategory")}
                  </button>

                  <ChevronRight size={12} aria-hidden="true" />

                  <span style={{ color: "var(--text)", fontWeight: "600" }}>
                    {activeSubcategory.name}
                  </span>
                </>
              ) : (
                <span style={{ color: "var(--text)", fontWeight: "600" }}>
                  {activeCategory?.name || t("toolsPage.unknownCategory")}
                </span>
              )}
            </div>
          );
        })()}

      <div style={{ marginBottom: "12px" }}>
        <ActionRow marginTop="0">
          <ActionButton variant="secondary" onClick={expandAll}>
            {t("toolsPage.expandAll")}
          </ActionButton>

          <ActionButton variant="secondary" onClick={collapseAll}>
            {t("toolsPage.collapseAll")}
          </ActionButton>
        </ActionRow>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder={t("toolsPage.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "450px",

            height: compactMode ? "36px" : "42px",

            boxSizing: "border-box",
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0 12px",
            fontSize: "14px",
            outline: "none",
          }}
        />

        <select
          value={selectedCategoryId}
          onChange={(e) => handleCategoryFilterChange(e.target.value)}
          style={{
            height: "42px",
            minWidth: "200px",
            boxSizing: "border-box",
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0 12px",
            fontSize: "14px",
            outline: "none",
          }}
        >
          <option value="">{t("toolsPage.allCategories")}</option>

          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          compactMode={compactMode}
          height={compactMode ? "36px" : "42px"}
        />
      </div>

      {publishedTools.length === 0 && (
        <EmptyState
          message={t("toolsPage.noToolsYet")}
          icon={<PackageSearch size={28} color="var(--subtle)" />}
          actionLabel={t("toolsPage.browseToolsCenter")}
          onAction={() => navigate("/tools-center")}
          compactMode={compactMode}
        />
      )}

      {publishedTools.length > 0 && filteredTools.length === 0 && (
        <EmptyState message={t("toolsPage.noToolsFound")} />
      )}

      {categories.map((category) => {
        const categorySubcategories =
          subcategoriesByCategory.get(category.id) || [];

        const categoryBucket = toolsByCategory.get(category.id);

        const toolsWithoutSubcategory =
          categoryBucket?.withoutSubcategory || [];

        const hasCategoryTools =
          toolsWithoutSubcategory.length > 0 ||
          categorySubcategories.some(
            (sub) =>
              (categoryBucket?.bySubcategoryId.get(sub.id) || []).length > 0,
          );

        if (!hasCategoryTools) {
          return null;
        }

        return (
          <div
            key={category.id}
            style={{
              marginBottom: compactMode ? "20px" : "35px",
            }}
          >
            <div
              onClick={() => toggleCategory(category.id)}
              onKeyDown={(e) =>
                handleToggleKeyDown(e, () => toggleCategory(category.id))
              }
              role="button"
              tabIndex={0}
              aria-expanded={Boolean(expandedCategories[category.id])}
              aria-label={
                expandedCategories[category.id]
                  ? t("toolsPage.collapseSection", { name: category.name })
                  : t("toolsPage.expandSection", { name: category.name })
              }
              className="a11y-focus-ring"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "10px",
                marginBottom: "12px",
                cursor: "pointer",
                borderRadius: "4px",
                position: "sticky",
                top: 0,
                zIndex: 2,
                background: "var(--bg)",
              }}
            >
              <span style={{ display: "flex" }} aria-hidden="true">
                {expandedCategories[category.id] ? (
                  <ChevronDown size={compactMode ? 14 : 16} />
                ) : (
                  <ChevronRight size={compactMode ? 14 : 16} />
                )}
              </span>

              <Icon name="category" size={compactMode ? 18 : 24} />

              <h1
                style={{
                  color: "var(--text)",
                  margin: 0,

                  fontSize: compactMode ? "18px" : "24px",
                }}
              >
                {category.name}
              </h1>
            </div>

            {expandedCategories[category.id] && (
              <>
                {toolsWithoutSubcategory.length > 0 && (
                  <div
                    style={{
                      marginBottom: "20px",
                    }}
                  >
                    {toolsWithoutSubcategory.map((tool) =>
                      viewMode === "list" ? (
                        <ToolListRow
                          key={tool.id}
                          tool={tool}
                          category={category}
                          subcategory={null}
                          onToggleFavorite={toggleFavorite}
                          onRun={runTool}
                        />
                      ) : (
                        <ToolCard
                          key={tool.id}
                          tool={tool}
                          category={category}
                          subcategory={null}
                          onToggleFavorite={toggleFavorite}
                          onRun={runTool}
                        />
                      ),
                    )}
                  </div>
                )}

                {categorySubcategories.map((subcategory) => {
                  const toolsInSubcategory =
                    categoryBucket?.bySubcategoryId.get(subcategory.id) || [];

                  if (toolsInSubcategory.length === 0) {
                    return null;
                  }

                  return (
                    <div
                      key={subcategory.id}
                      style={{
                        marginBottom: "20px",
                      }}
                    >
                      <h2
                        onClick={() => toggleSubcategory(subcategory.id)}
                        onKeyDown={(e) =>
                          handleToggleKeyDown(e, () =>
                            toggleSubcategory(subcategory.id),
                          )
                        }
                        role="button"
                        tabIndex={0}
                        aria-expanded={Boolean(
                          expandedSubcategories[subcategory.id],
                        )}
                        aria-label={
                          expandedSubcategories[subcategory.id]
                            ? t("toolsPage.collapseSection", {
                                name: subcategory.name,
                              })
                            : t("toolsPage.expandSection", {
                                name: subcategory.name,
                              })
                        }
                        className="a11y-focus-ring"
                        style={{
                          color: "var(--subtle)",
                          cursor: "pointer",
                          userSelect: "none",

                          marginTop: compactMode ? "8px" : "16px",

                          marginBottom: compactMode ? "8px" : "16px",

                          fontSize: compactMode ? "14px" : "18px",

                          borderRadius: "4px",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            verticalAlign: "middle",
                          }}
                          aria-hidden="true"
                        >
                          {expandedSubcategories[subcategory.id] ? (
                            <ChevronDown size={compactMode ? 14 : 16} />
                          ) : (
                            <ChevronRight size={compactMode ? 14 : 16} />
                          )}
                        </span>{" "}
                        {subcategory.name} ({toolsInSubcategory.length})
                      </h2>

                      {expandedSubcategories[subcategory.id] &&
                        toolsInSubcategory.map((tool) =>
                          viewMode === "list" ? (
                            <ToolListRow
                              key={tool.id}
                              tool={tool}
                              category={category}
                              subcategory={subcategory}
                              onToggleFavorite={toggleFavorite}
                              onRun={runTool}
                            />
                          ) : (
                            <ToolCard
                              key={tool.id}
                              tool={tool}
                              category={category}
                              subcategory={subcategory}
                              onToggleFavorite={toggleFavorite}
                              onRun={runTool}
                            />
                          ),
                        )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
