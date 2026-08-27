import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  PackageSearch,
  PauseCircle,
  Power,
  PowerOff,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";
import Header from "../components/Header";
import TemplateCatalogCard from "../components/toolsCenter/TemplateCatalogCard";
import CatalogFilterBar from "../components/toolsCenter/CatalogFilterBar";
import StatusMessage from "../components/toolForms/shared/StatusMessage";
import ActionButton from "../components/toolForms/shared/ActionButton";
import EmptyState from "../components/shared/EmptyState";
import { DEFAULT_INPUT_TEMPLATE } from "./Tools/LinkTemplateFields";
import { useApp } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";
import { useLanguage } from "../context/LanguageContext";
import { useToolWindows } from "../context/ToolWindowsContext";
import { useAdmin } from "../context/AdminContext";
import { useConfirm } from "../hooks/useConfirm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { toolRegistry } from "../core/toolRegistry";
import { getToolStatus } from "../core/toolStatus";
import { getMarketplaceCategoryLabel } from "../core/marketplaceCategories";
import { scoreTemplate, sortByScoreDesc } from "../core/utils/search";

function resolveInstallCategoryId(categories, hint) {
  const byHint = hint
    ? categories.find((c) => c.name?.toLowerCase() === hint.toLowerCase())
    : null;

  if (byHint) return byHint.id;

  const [firstCategory] = [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );

  return firstCategory?.id ?? null;
}

function CatalogStat({ icon: StatIcon, value, label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <StatIcon size={16} color={color} />

      <span
        style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)" }}
      >
        {value}
      </span>

      <span style={{ fontSize: "12px", color: "var(--subtle)" }}>{label}</span>
    </div>
  );
}

export default function ToolsCenter() {
  const { categories, tools, addTool, updateTool, deleteTool } = useApp();
  const { settings } = useSettings();
  const { t } = useLanguage();
  const { isAdmin } = useAdmin();
  const { openConfigureTool } = useToolWindows();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const compactMode = settings?.compactMode || false;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortMode, setSortMode] = useState("name");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [installError, setInstallError] = useState("");

  useEffect(() => {
    setSelectedIds((prev) => {
      const liveIds = new Set(tools.map((tool) => tool.id));
      const next = new Set([...prev].filter((id) => liveIds.has(id)));

      return next.size === prev.size ? prev : next;
    });
  }, [tools]);

  const toolByType = useMemo(() => {
    const map = new Map();

    tools.forEach((tool) => map.set(tool.toolType, tool));

    return map;
  }, [tools]);

  const catalogStats = useMemo(
    () => ({
      active: tools.filter((tool) => tool.enabled && !tool.isDraft).length,
      templates: Object.keys(toolRegistry).length,
      inactive: tools.filter((tool) => !tool.enabled).length,
    }),
    [tools],
  );

  const catalogEntries = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();

    let entries = Object.entries(toolRegistry).map(
      ([toolType, definition]) => ({
        toolType,
        definition,
        tool: toolByType.get(toolType),
      }),
    );

    if (categoryFilter) {
      entries = entries.filter(
        (entry) => entry.definition.marketplaceCategory === categoryFilter,
      );
    }

    if (statusFilter) {
      entries = entries.filter(
        (entry) => getToolStatus(entry.tool) === statusFilter,
      );
    }

    if (term) {
      entries = sortByScoreDesc(
        entries
          .map((entry) => ({
            ...entry,
            score: scoreTemplate(
              {
                label: entry.tool?.name || entry.definition.label,
                shortDescription:
                  entry.tool?.description || entry.definition.shortDescription,
              },
              term,
            ),
          }))
          .filter((entry) => entry.score > 0),
      );
    }

    const sorted = [...entries];

    if (sortMode === "name") {
      sorted.sort((a, b) =>
        (a.tool?.name || a.definition.label).localeCompare(
          b.tool?.name || b.definition.label,
        ),
      );
    } else if (sortMode === "category") {
      sorted.sort(
        (a, b) =>
          getMarketplaceCategoryLabel(
            a.definition.marketplaceCategory,
          ).localeCompare(
            getMarketplaceCategoryLabel(b.definition.marketplaceCategory),
          ) || a.definition.label.localeCompare(b.definition.label),
      );
    } else if (sortMode === "status") {
      sorted.sort(
        (a, b) =>
          getToolStatus(a.tool).localeCompare(getToolStatus(b.tool)) ||
          a.definition.label.localeCompare(b.definition.label),
      );
    } else if (sortMode === "recent") {
      sorted.sort((a, b) =>
        (b.tool?.createdAt || b.definition.addedAt || "").localeCompare(
          a.tool?.createdAt || a.definition.addedAt || "",
        ),
      );
    }

    return sorted;
  }, [toolByType, debouncedSearch, categoryFilter, statusFilter, sortMode]);

  const installTemplate = async (toolType) => {
    if (!isAdmin) return;

    const definition = toolRegistry[toolType];

    setInstallError("");

    try {
      await addTool({
        name: definition.label,
        description: definition.shortDescription,
        toolType,
        icon: definition.icon,
        categoryId: resolveInstallCategoryId(
          categories,
          definition.defaultCategoryHint,
        ),
        subcategoryId: null,
        config: "",
        inputTemplate:
          definition.showInputTemplate === false ? "" : DEFAULT_INPUT_TEMPLATE,
        favorite: false,
        enabled: true,
        isDraft: false,
        featured: false,
        sortOrder: 0,
      });
    } catch (err) {
      console.error(err);
      setInstallError(t("toolsCenter.installError", { name: definition.label }));
    }
  };

  const toggleEnabled = async (tool) => {
    if (!isAdmin) return;

    try {
      await updateTool(tool.id, { ...tool, enabled: !tool.enabled });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFeatured = async (tool) => {
    if (!isAdmin) return;

    try {
      await updateTool(tool.id, { ...tool, featured: !tool.featured });
    } catch (err) {
      console.error(err);
    }
  };

  const uninstallTemplate = async (tool) => {
    if (!isAdmin) return;

    const confirmed = await confirm(
      t("toolsCenter.uninstallConfirmMessage", { name: tool.name }),
      {
        title: t("toolsCenter.uninstallConfirmTitle"),
        danger: true,
      },
    );

    if (!confirmed) return;

    try {
      await deleteTool(tool.id);
    } catch (err) {
      console.error(err);
    }
  };

  const visibleInstalledTools = useMemo(
    () => catalogEntries.map((entry) => entry.tool).filter(Boolean),
    [catalogEntries],
  );

  const allVisibleSelected =
    visibleInstalledTools.length > 0 &&
    visibleInstalledTools.every((tool) => selectedIds.has(tool.id));

  const toggleSelect = (tool) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(tool.id)) {
        next.delete(tool.id);
      } else {
        next.add(tool.id);
      }

      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);

        visibleInstalledTools.forEach((tool) => next.delete(tool.id));

        return next;
      }

      const next = new Set(prev);

      visibleInstalledTools.forEach((tool) => next.add(tool.id));

      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedTools = tools.filter((tool) => selectedIds.has(tool.id));

  const runBulk = async (action) => {
    if (!isAdmin || selectedTools.length === 0 || bulkRunning) return;

    setBulkRunning(true);

    try {
      await Promise.all(selectedTools.map(action));
    } catch (err) {
      console.error(err);
    } finally {
      setBulkRunning(false);
    }
  };

  const bulkEnable = () =>
    runBulk((tool) => updateTool(tool.id, { ...tool, enabled: true }));

  const bulkDisable = () =>
    runBulk((tool) => updateTool(tool.id, { ...tool, enabled: false }));

  const bulkFeature = () =>
    runBulk((tool) => updateTool(tool.id, { ...tool, featured: true }));

  const bulkUnfeature = () =>
    runBulk((tool) => updateTool(tool.id, { ...tool, featured: false }));

  const bulkUninstall = async () => {
    if (!isAdmin || selectedTools.length === 0 || bulkRunning) return;

    const confirmed = await confirm(
      t("toolsCenter.bulkUninstallConfirmMessage", {
        count: selectedTools.length,
      }),
      {
        title: t("toolsCenter.bulkUninstallConfirmTitle"),
        danger: true,
      },
    );

    if (!confirmed) return;

    setBulkRunning(true);

    try {
      await Promise.all(selectedTools.map((tool) => deleteTool(tool.id)));
      clearSelection();
    } catch (err) {
      console.error(err);
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <div>
      {confirmDialog}

      <Header
        title={t("toolsCenter.title")}
        crumbs={[
          { label: t("nav.dashboard"), to: "/" },
          { label: t("toolsCenter.title") },
        ]}
      />

      {!isAdmin && (
        <StatusMessage status="warning">
          {t("toolsCenter.readOnlyNotice")}
        </StatusMessage>
      )}

      {installError && (
        <StatusMessage status="error">{installError}</StatusMessage>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          marginBottom: "18px",
          paddingBottom: "14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <CatalogStat
          icon={CheckCircle2}
          value={catalogStats.active}
          label={t("toolsCenter.statActive")}
          color="var(--status-success)"
        />

        <CatalogStat
          icon={PackageSearch}
          value={catalogStats.templates}
          label={t("toolsCenter.statTemplates")}
          color="var(--primary)"
        />

        <CatalogStat
          icon={PauseCircle}
          value={catalogStats.inactive}
          label={t("toolsCenter.statInactive")}
          color="var(--subtle)"
        />
      </div>

      <CatalogFilterBar
        search={search}
        onSearchChange={setSearch}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        compactMode={compactMode}
      />

      {catalogEntries.length === 0 && (
        <EmptyState
          message={t("toolsCenter.noneFound")}
          icon={<PackageSearch size={28} color="var(--subtle)" />}
          compactMode={compactMode}
        />
      )}

      {isAdmin && visibleInstalledTools.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              color: "var(--subtle)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
            />
            {t("toolsCenter.bulkSelectAllVisible")}
          </label>

          {selectedIds.size > 0 && (
            <span style={{ fontSize: "13px", color: "var(--subtle)" }}>
              {t("toolsCenter.bulkSelectedCount", { count: selectedIds.size })}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: selectedIds.size > 0 ? "72px" : 0,
        }}
      >
        {catalogEntries.map(({ toolType, definition, tool }) => (
          <TemplateCatalogCard
            key={toolType}
            toolType={toolType}
            definition={definition}
            isAdmin={isAdmin}
            compactMode={compactMode}
            tool={tool}
            selected={Boolean(tool) && selectedIds.has(tool.id)}
            onToggleSelect={toggleSelect}
            onInstall={installTemplate}
            onConfigure={openConfigureTool}
            onToggleEnabled={toggleEnabled}
            onToggleFeatured={toggleFeatured}
            onUninstall={uninstallTemplate}
          />
        ))}
      </div>

      {isAdmin && selectedIds.size > 0 && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "20px",
            transform: "translateX(-50%)",
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 14px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            flexWrap: "wrap",
            maxWidth: "calc(100vw - 40px)",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--text)",
            }}
          >
            {t("toolsCenter.bulkSelectedCount", { count: selectedIds.size })}
          </span>

          <ActionButton
            icon={<Power size={13} />}
            variant="secondary"
            compactMode
            disabled={bulkRunning}
            onClick={bulkEnable}
          >
            {t("toolsCenter.bulkEnable")}
          </ActionButton>

          <ActionButton
            icon={<PowerOff size={13} />}
            variant="secondary"
            compactMode
            disabled={bulkRunning}
            onClick={bulkDisable}
          >
            {t("toolsCenter.bulkDisable")}
          </ActionButton>

          <ActionButton
            icon={<Star size={13} />}
            variant="secondary"
            compactMode
            disabled={bulkRunning}
            onClick={bulkFeature}
          >
            {t("toolsCenter.bulkFeature")}
          </ActionButton>

          <ActionButton
            icon={<StarOff size={13} />}
            variant="secondary"
            compactMode
            disabled={bulkRunning}
            onClick={bulkUnfeature}
          >
            {t("toolsCenter.bulkUnfeature")}
          </ActionButton>

          <ActionButton
            icon={<Trash2 size={13} />}
            variant="danger"
            compactMode
            disabled={bulkRunning}
            onClick={bulkUninstall}
          >
            {t("toolsCenter.bulkUninstall")}
          </ActionButton>

          <ActionButton
            icon={<X size={13} />}
            variant="secondary"
            compactMode
            disabled={bulkRunning}
            onClick={clearSelection}
          >
            {t("toolsCenter.bulkClearSelection")}
          </ActionButton>
        </div>
      )}
    </div>
  );
}
