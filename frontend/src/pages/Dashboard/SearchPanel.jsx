import { useState } from "react";
import Icon from "../../components/Icon";
import Badge from "../../components/shared/Badge";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useLanguage } from "../../context/LanguageContext";
import {
  getSearchBadgeColor,
  scoreCategory,
  scoreScript,
  scoreSubcategory,
  scoreTool,
  sortByScoreDesc,
} from "../../core/utils/search";

const SEARCH_RESULT_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 150;

export default function SearchPanel({
  categories,
  subcategories,
  tools,
  scripts = [],
  compactMode,
  getToolCountForCategory,
  onNavigate,
  onRunTool,
  onOpenScript,
}) {
  const { t } = useLanguage();
  const [globalSearch, setGlobalSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const debouncedSearch = useDebouncedValue(globalSearch, SEARCH_DEBOUNCE_MS);

  const searchTerm = debouncedSearch.trim().toLowerCase();

  const allSearchResults = searchTerm
    ? sortByScoreDesc([
        ...categories
          .map((category) => ({
            category,
            score: scoreCategory(category, searchTerm),
          }))
          .filter(({ score }) => score > 0)
          .map(({ category, score }) => ({
            id: category.id,
            type: "category",
            badge: "CATEGORY",
            icon: "category",
            title: category.name,
            subtitle: `${getToolCountForCategory(category.id)} tools`,
            to: `/tools?category=${category.id}`,
            score,
          })),

        ...subcategories
          .map((subcategory) => {
            const category = categories.find(
              (cat) => cat.id === subcategory.categoryId,
            );

            return {
              subcategory,
              category,
              score: scoreSubcategory(subcategory, category, searchTerm),
            };
          })
          .filter(({ score }) => score > 0)
          .map(({ subcategory, category, score }) => ({
            id: subcategory.id,
            type: "subcategory",
            badge: "SUBCATEGORY",
            icon: "folder",
            title: subcategory.name,
            subtitle: category?.name
              ? t("dashboard.search.inCategory", { category: category.name })
              : t("common.noCategory"),
            to: `/tools?category=${subcategory.categoryId}`,
            score,
          })),

        ...tools
          .map((tool) => {
            const category = categories.find(
              (cat) => cat.id === tool.categoryId,
            );

            const subcategory = subcategories.find(
              (sub) => sub.id === tool.subcategoryId,
            );

            const score = scoreTool(tool, searchTerm, {
              category,
              subcategory,
            });

            return { tool, category, subcategory, score };
          })
          .filter(({ score }) => score > 0)
          .map(({ tool, category, subcategory, score }) => ({
            id: tool.id,
            type: "tool",
            tool,
            badge: "TOOL",
            icon: tool.icon || "tool",
            title: tool.name,
            subtitle: [
              tool.toolType ? tool.toolType.toUpperCase() : "TOOL",
              category?.name,
              subcategory?.name,
            ]
              .filter(Boolean)
              .join(" • "),
            score,
          })),

        ...scripts
          .map((script) => {
            const category = categories.find(
              (cat) => cat.id === script.categoryId,
            );

            const subcategory = subcategories.find(
              (sub) => sub.id === script.subcategoryId,
            );

            const score = scoreScript(script, searchTerm, {
              category,
              subcategory,
            });

            return { script, category, subcategory, score };
          })
          .filter(({ score }) => score > 0)
          .map(({ script, category, subcategory, score }) => ({
            id: script.id,
            type: "script",
            script,
            badge: "SCRIPT",
            icon: "script",
            title: script.title,
            subtitle: [script.language, category?.name, subcategory?.name]
              .filter(Boolean)
              .join(" • "),
            score,
          })),
      ])
    : [];

  const visibleSearchResults = allSearchResults.slice(0, SEARCH_RESULT_LIMIT);

  const totalSearchResults = allSearchResults.length;

  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(visibleSearchResults.length - 1, 0),
  );

  const selectResult = (result) => {
    if (result.type === "tool" || result.type === "script") {
      if (result.type === "script") {
        onOpenScript(result.script);
      } else {
        onRunTool(result.tool);
      }

      setGlobalSearch("");
      setActiveIndex(0);
    } else {
      onNavigate(result.to);
    }
  };

  return (
    <div
      style={{
        background: "var(--card)",

        padding: compactMode ? "12px" : "20px",

        borderRadius: "12px",
        border: "1px solid var(--border)",

        marginBottom: compactMode ? "12px" : "20px",

        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",

          gap: compactMode ? "8px" : "10px",

          marginBottom: compactMode ? "8px" : "12px",
        }}
      >
        <Icon name="search" size={compactMode ? 18 : 22} />

        <h2
          style={{
            margin: 0,
            color: "var(--text)",

            fontSize: compactMode ? "18px" : "24px",
          }}
        >
          {t("dashboard.search.title")}
        </h2>
      </div>

      <input
        placeholder={t("dashboard.search.placeholder")}
        value={globalSearch}
        onChange={(e) => {
          setGlobalSearch(e.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setGlobalSearch("");
            setActiveIndex(0);
            return;
          }

          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) =>
              Math.min(prev + 1, visibleSearchResults.length - 1),
            );
            return;
          }

          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, 0));
            return;
          }

          if (e.key === "Enter" && visibleSearchResults.length > 0) {
            selectResult(visibleSearchResults[safeActiveIndex]);
          }
        }}
        style={{
          width: "100%",

          height: compactMode ? "36px" : "42px",

          boxSizing: "border-box",

          background: "var(--surface)",
          color: "var(--text)",

          border: "1px solid var(--border)",
          borderRadius: "8px",

          padding: compactMode ? "0 10px" : "0 12px",

          fontSize: compactMode ? "13px" : "14px",

          outline: "none",
        }}
      />

      {searchTerm.length > 0 && (
        <div
          style={{
            marginTop: compactMode ? "10px" : "14px",

            display: "flex",
            flexDirection: "column",

            gap: compactMode ? "8px" : "10px",
          }}
        >
          <div
            style={{
              color: "var(--subtle)",
              fontSize: compactMode ? "12px" : "13px",
            }}
          >
            {totalSearchResults === 0
              ? t("dashboard.search.noResults")
              : totalSearchResults > SEARCH_RESULT_LIMIT
                ? t("dashboard.search.resultsFoundMore", {
                    count: totalSearchResults,
                    limit: SEARCH_RESULT_LIMIT,
                  })
                : totalSearchResults === 1
                  ? t("dashboard.search.resultsFoundSingular")
                  : t("dashboard.search.resultsFoundPlural", {
                      count: totalSearchResults,
                    })}
          </div>

          {visibleSearchResults.map((result, index) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => selectResult(result)}
              onMouseEnter={(e) => {
                setActiveIndex(index);
                e.currentTarget.style.transform = "translateX(4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateX(0)";
              }}
              style={{
                background:
                  index === safeActiveIndex
                    ? "var(--surface-hover)"
                    : "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",

                padding: compactMode ? "10px" : "12px",

                cursor: "pointer",

                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",

                gap: "12px",

                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <Icon name={result.icon} size={16} />

                  <span
                    style={{
                      color: "var(--text)",
                      fontWeight: "600",

                      fontSize: compactMode ? "13px" : "14px",

                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {result.title}
                  </span>

                  <Badge
                    label={result.badge}
                    color={getSearchBadgeColor(result.badge)}
                    variant="solid"
                    compactMode={compactMode}
                  />
                </div>

                <div
                  style={{
                    color: "var(--subtle)",

                    fontSize: compactMode ? "11px" : "12px",

                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {result.subtitle}
                </div>
              </div>

              <span
                style={{
                  color: "var(--subtle)",
                  fontSize: compactMode ? "11px" : "12px",
                  flexShrink: 0,
                }}
              >
                {t("dashboard.search.open")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
