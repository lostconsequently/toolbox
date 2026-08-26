import { useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useScriptLibrary } from "../context/ScriptLibraryContext";
import { useToolWindows } from "../context/ToolWindowsContext";
import ScriptWindow from "./ScriptWindow";
import ToolWindow from "./ToolWindow";
import ConfigureToolWindow from "./toolsCenter/ConfigureToolWindow";
import ToolWindowsTaskbar from "./ToolWindowsTaskbar";
import WindowErrorBoundary from "./WindowErrorBoundary";

export default function ToolWindowManager() {
  const { tools, loading } = useApp();
  const { scripts, loading: scriptsLoading } = useScriptLibrary();

  const {
    openWindows,
    openTool,
    openScript,
    closeWindow,
    focusWindow,
    minimizeWindow,
    restoreWindow,
    toggleMaximize,
    updateWindow,
    pinnedItems,
    unpinItem,
  } = useToolWindows();

  useEffect(() => {
    if (loading || scriptsLoading) return;

    const toolIds = new Set(tools.map((tool) => String(tool.id)));

    const liveIds = {
      tool: toolIds,
      toolConfig: toolIds,
      script: new Set(scripts.map((script) => String(script.id))),
    };

    const stillExists = (kind, id) => liveIds[kind]?.has(String(id));

    openWindows.forEach((win) => {
      if (!stillExists(win.kind, win.item.id)) {
        closeWindow(win.id);
      }
    });

    pinnedItems.forEach((entry) => {
      if (!stillExists(entry.kind, entry.id)) {
        unpinItem(entry.kind, entry.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools, scripts, loading, scriptsLoading]);

  const visibleWindows = openWindows.filter((win) => !win.minimized);

  const topZIndex = visibleWindows.reduce(
    (max, win) => Math.max(max, win.zIndex),
    -Infinity,
  );

  const activeId = visibleWindows.find((win) => win.zIndex === topZIndex)?.id;

  const handleSelect = (win) => {
    if (win.minimized) {
      restoreWindow(win.id);
    } else if (win.id === activeId) {
      minimizeWindow(win.id);
    } else {
      focusWindow(win.id);
    }
  };

  const itemKey = (kind, id) => `${kind}-${id}`;

  const pinnedKeys = new Set(
    pinnedItems.map((entry) => itemKey(entry.kind, entry.id)),
  );

  const windowsByItem = new Map();
  openWindows.forEach((win) => {
    const key = itemKey(win.kind, win.item.id);
    const list = windowsByItem.get(key) || [];
    list.push(win);
    windowsByItem.set(key, list);
  });

  const liveItem = (kind, id) =>
    kind === "script"
      ? scripts.find((script) => String(script.id) === String(id))
      : tools.find((tool) => String(tool.id) === String(id));

  const openItem = (kind, item) =>
    kind === "script" ? openScript(item) : openTool(item);

  const toTaskbarTool = (kind, item) =>
    kind === "script"
      ? { name: item.title || item.name, icon: "script" }
      : { name: item.name, icon: item.icon || "tool" };

  const pinnedTaskbarItems = pinnedItems.map((entry) => {
    const key = itemKey(entry.kind, entry.id);
    const matchingWindows = windowsByItem.get(key) || [];
    const activeWindow =
      matchingWindows.find((win) => win.id === activeId) || matchingWindows[0];

    const fullItem = liveItem(entry.kind, entry.id) || entry;

    return {
      id: `pinned-${key}`,
      tool: toTaskbarTool(entry.kind, fullItem),
      isPinned: true,
      isActive: Boolean(activeWindow && activeWindow.id === activeId),
      minimized: Boolean(activeWindow?.minimized),
      hasWindow: matchingWindows.length > 0,
      onSelect: () =>
        activeWindow
          ? handleSelect(activeWindow)
          : openItem(entry.kind, fullItem),
      onTogglePin: () => unpinItem(entry.kind, entry.id),
      onClose: activeWindow ? () => closeWindow(activeWindow.id) : null,
    };
  });

  const windowTaskbarItems = openWindows
    .filter((win) => !pinnedKeys.has(itemKey(win.kind, win.item.id)))
    .map((win) => ({
      id: win.id,
      tool: toTaskbarTool(win.kind, win.item),
      isPinned: false,
      isActive: win.id === activeId,
      minimized: win.minimized,
      hasWindow: true,
      onSelect: () => handleSelect(win),
      onTogglePin: null,
      onClose: () => closeWindow(win.id),
    }));

  return (
    <>
      {visibleWindows.map((win) => {
        const windowProps = {
          win,
          isActive: win.id === activeId,
          onClose: () => closeWindow(win.id),
          onFocus: () => focusWindow(win.id),
          onMinimize: () => minimizeWindow(win.id),
          onToggleMaximize: () => toggleMaximize(win.id),
          onUpdate: (patch) => updateWindow(win.id, patch),
        };

        const windowTitle = win.item.name || win.item.title;
        const boundaryProps = {
          title: windowTitle,
          onClose: () => closeWindow(win.id),
        };

        if (win.kind === "script") {
          return (
            <WindowErrorBoundary key={win.id} {...boundaryProps}>
              <ScriptWindow {...windowProps} />
            </WindowErrorBoundary>
          );
        }

        if (win.kind === "toolConfig") {
          return (
            <WindowErrorBoundary key={win.id} {...boundaryProps}>
              <ConfigureToolWindow {...windowProps} />
            </WindowErrorBoundary>
          );
        }

        return (
          <WindowErrorBoundary key={win.id} {...boundaryProps}>
            <ToolWindow {...windowProps} />
          </WindowErrorBoundary>
        );
      })}

      <ToolWindowsTaskbar
        items={[...pinnedTaskbarItems, ...windowTaskbarItems]}
      />
    </>
  );
}
