import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useModalA11y } from "../hooks/useModalA11y";
import { useToolWindows } from "../context/ToolWindowsContext";
import { useScriptLibrary } from "../context/ScriptLibraryContext";
import { useLanguage } from "../context/LanguageContext";
import Icon from "./Icon";
import {
  addRecentScript,
  addRecentTool,
  filterExistingRecentItems,
  getRecentItems,
} from "../core/utils/executeTool";
import {
  getSearchBadgeColor,
  scoreCategory,
  scoreScript,
  scoreSubcategory,
  scoreTool,
  sortByScoreDesc,
} from "../core/utils/search";

const RESULT_LIMIT = 8;

export default function CommandPalette() {
  const { categories, subcategories, tools } = useApp();
  const { scripts } = useScriptLibrary();
  const { openTool, openScript } = useToolWindows();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const close = () => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      const isShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (!isShortcut) return;

      event.preventDefault();
      setIsOpen(true);
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const recentEntries = filterExistingRecentItems(
    getRecentItems(),
    tools,
    scripts,
  );

  const recentToolIds = useMemo(
    () =>
      new Set(
        recentEntries
          .filter((entry) => entry.kind === "tool")
          .map((entry) => String(entry.id)),
      ),
    [recentEntries],
  );

  const recentScriptIds = useMemo(
    () =>
      new Set(
        recentEntries
          .filter((entry) => entry.kind === "script")
          .map((entry) => String(entry.id)),
      ),
    [recentEntries],
  );

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      const seen = new Set();
      const suggestions = [];

      const addSuggestion = (entry) => {
        const key = `${entry.type}-${entry.tool?.id ?? entry.script?.id}`;

        if (seen.has(key)) return;

        seen.add(key);
        suggestions.push(entry);
      };

      recentEntries.forEach((entry) => {
        if (entry.kind === "script") {
          const script = scripts.find(
            (candidate) => String(candidate.id) === String(entry.id),
          );

          if (script)
            addSuggestion({ type: "script", script, reason: "recent" });

          return;
        }

        const tool = tools.find(
          (candidate) => String(candidate.id) === String(entry.id),
        );

        if (tool) addSuggestion({ type: "tool", tool, reason: "recent" });
      });

      tools
        .filter((tool) => tool.favorite)
        .forEach((tool) =>
          addSuggestion({ type: "tool", tool, reason: "favorite" }),
        );

      scripts
        .filter((script) => script.isFavorite)
        .forEach((script) =>
          addSuggestion({ type: "script", script, reason: "favorite" }),
        );

      return suggestions.slice(0, RESULT_LIMIT);
    }

    const scoredTools = tools.map((tool) => {
      const category = categories.find((cat) => cat.id === tool.categoryId);
      const subcategory = subcategories.find(
        (sub) => sub.id === tool.subcategoryId,
      );

      const isFavorite = Boolean(tool.favorite);
      const isRecent = recentToolIds.has(String(tool.id));

      const score = scoreTool(tool, term, {
        category,
        subcategory,
        isFavorite,
        isRecent,
      });

      return {
        type: "tool",
        tool,
        score,
        reason: isFavorite ? "favorite" : isRecent ? "recent" : null,
      };
    });

    const scoredScripts = scripts.map((script) => {
      const category = categories.find((cat) => cat.id === script.categoryId);
      const subcategory = subcategories.find(
        (sub) => sub.id === script.subcategoryId,
      );

      const isFavorite = Boolean(script.isFavorite);
      const isRecent = recentScriptIds.has(String(script.id));

      const score = scoreScript(script, term, {
        category,
        subcategory,
        isFavorite,
        isRecent,
      });

      return {
        type: "script",
        script,
        score,
        reason: isFavorite ? "favorite" : isRecent ? "recent" : null,
      };
    });

    const scoredCategories = categories.map((category) => ({
      type: "category",
      category,
      score: scoreCategory(category, term),
    }));

    const scoredSubcategories = subcategories.map((subcategory) => {
      const category = categories.find(
        (cat) => cat.id === subcategory.categoryId,
      );

      return {
        type: "subcategory",
        subcategory,
        category,
        score: scoreSubcategory(subcategory, category, term),
      };
    });

    const scored = [
      ...scoredTools,
      ...scoredScripts,
      ...scoredCategories,
      ...scoredSubcategories,
    ].filter(({ score }) => score > 0);

    return sortByScoreDesc(scored).slice(0, RESULT_LIMIT);
  }, [
    query,
    tools,
    scripts,
    categories,
    subcategories,
    recentEntries,
    recentToolIds,
    recentScriptIds,
  ]);

  const containerRef = useModalA11y({ isOpen, onClose: close });

  const runTool = (tool) => {
    addRecentTool(tool);
    openTool(tool);
    close();
  };

  const runScript = (script) => {
    addRecentScript(script);
    openScript(script);
    close();
  };

  const runResult = (entry) => {
    if (entry.type === "tool") {
      runTool(entry.tool);
    } else if (entry.type === "script") {
      runScript(entry.script);
    } else if (entry.type === "category") {
      navigate(`/tools?category=${entry.category.id}`);
      close();
    } else if (entry.type === "subcategory") {
      navigate(
        `/tools?category=${entry.subcategory.categoryId}&subcategory=${entry.subcategory.id}`,
      );
      close();
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = results[activeIndex];

      if (entry) runResult(entry);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingTop: "12vh",
          zIndex: 10000,
        }}
        onClick={close}
      >
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("commandPalette.ariaLabel")}
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "560px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={t("commandPalette.placeholder")}
              style={{
                width: "100%",
                height: "40px",
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
          </div>

          <div
            style={{
              maxHeight: "50vh",
              overflow: "auto",
              padding: "6px",
            }}
          >
            {results.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  color: "var(--subtle)",
                  fontSize: "13px",
                }}
              >
                {t("commandPalette.noResults")}
              </div>
            ) : (
              results.map((entry, index) => {
                const { type, reason } = entry;

                const name =
                  type === "tool"
                    ? entry.tool.name
                    : type === "script"
                      ? entry.script.title
                      : type === "category"
                        ? entry.category.name
                        : entry.subcategory.name;

                const iconName =
                  type === "tool"
                    ? entry.tool.icon || "tool"
                    : type === "script"
                      ? "script"
                      : "category";

                const subtitle =
                  type === "tool"
                    ? categories.find((cat) => cat.id === entry.tool.categoryId)
                        ?.name || t("common.unknown")
                    : type === "script"
                      ? [
                          entry.script.language,
                          categories.find(
                            (cat) => cat.id === entry.script.categoryId,
                          )?.name,
                        ]
                          .filter(Boolean)
                          .join(" • ") || t("common.unknown")
                      : type === "category"
                        ? t("commandPalette.category")
                        : t("commandPalette.subcategoryIn", {
                            category:
                              entry.category?.name || t("common.unknown"),
                          });

                const reasonLabel =
                  reason === "recent"
                    ? t("commandPalette.recentlyUsed")
                    : reason === "favorite"
                      ? t("commandPalette.favorite")
                      : null;

                const typeBadge =
                  type === "category"
                    ? "CATEGORY"
                    : type === "subcategory"
                      ? "SUBCATEGORY"
                      : type === "script"
                        ? "SCRIPT"
                        : null;

                const typeBadgeLabel =
                  type === "category"
                    ? t("commandPalette.badgeCategory")
                    : type === "subcategory"
                      ? t("commandPalette.badgeSubcategory")
                      : type === "script"
                        ? t("commandPalette.badgeScript")
                        : null;

                return (
                  <div
                    key={`${type}-${entry.tool?.id || entry.script?.id || entry.category?.id || entry.subcategory?.id}`}
                    onClick={() => runResult(entry)}
                    onMouseEnter={() => setActiveIndex(index)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      background:
                        index === activeIndex
                          ? "var(--surface-hover)"
                          : "transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        minWidth: 0,
                      }}
                    >
                      <Icon name={iconName} size={16} />

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--text)",
                              fontWeight: "600",
                              fontSize: "13px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {name}
                          </div>

                          {(reasonLabel || typeBadge) && (
                            <span
                              style={{
                                background: getSearchBadgeColor(
                                  typeBadge ||
                                    (reason === "recent"
                                      ? "RECENT"
                                      : "FAVORITE"),
                                ),
                                color: "#ffffff",
                                borderRadius: "999px",
                                padding: "1px 6px",
                                fontSize: "9px",
                                fontWeight: "700",
                                letterSpacing: "0.3px",
                                flexShrink: 0,
                              }}
                            >
                              {typeBadgeLabel ||
                                (reason === "recent"
                                  ? t("commandPalette.recentlyUsed")
                                  : t("commandPalette.favorite"))}
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            color: "var(--subtle)",
                            fontSize: "11px",
                          }}
                        >
                          {subtitle}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        color: "var(--subtle)",
                        fontSize: "11px",
                        flexShrink: 0,
                      }}
                    >
                      {t("commandPalette.enter")}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              padding: "8px 12px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              color: "var(--subtle)",
              fontSize: "11px",
            }}
          >
            <span>{t("commandPalette.navigationHint")}</span>
            <span>
              {t("commandPalette.resultsCount", { count: results.length })}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
