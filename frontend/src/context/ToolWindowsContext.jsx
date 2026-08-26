import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ToolWindowsContext = createContext();

const DEFAULT_WIDTH = 980;
const DEFAULT_HEIGHT = 760;
const CASCADE_STEP = 32;
const CASCADE_MAX_STEPS = 8;
const PINNED_TOOLS_KEY = "pinned_tools";

const BASE_Z_INDEX = 3000;

function normalizeKind(kind) {
  if (kind === "script" || kind === "toolConfig") return kind;

  return "tool";
}

function toPinnedEntry(kind, item) {
  return normalizeKind(kind) === "script"
    ? {
        kind: "script",
        id: item.id,
        name: item.title,
        language: item.language,
        categoryId: item.categoryId,
        subcategoryId: item.subcategoryId,
      }
    : {
        kind: "tool",
        id: item.id,
        name: item.name,
        icon: item.icon,
        toolType: item.toolType,
        categoryId: item.categoryId,
        subcategoryId: item.subcategoryId,
      };
}

function loadPinnedItems() {
  try {
    const saved = localStorage.getItem(PINNED_TOOLS_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry) => entry && entry.id !== undefined && entry.id !== null)
      .map((entry) => ({ ...entry, kind: normalizeKind(entry.kind) }));
  } catch (error) {
    console.error("Invalid pinned_tools found:", error);

    return [];
  }
}

function samePinnedEntry(entry, kind, id) {
  return entry.kind === normalizeKind(kind) && String(entry.id) === String(id);
}

function clampPosition(position, size) {
  const maxX = Math.max(0, window.innerWidth - size.width);
  const maxY = Math.max(0, window.innerHeight - size.height);

  return {
    x: Math.min(Math.max(position.x, 0), maxX),
    y: Math.min(Math.max(position.y, 0), maxY),
  };
}

export function ToolWindowsProvider({ children }) {
  const [openWindows, setOpenWindows] = useState([]);
  const [pinnedItems, setPinnedItems] = useState(loadPinnedItems);

  const nextZIndex = useRef(BASE_Z_INDEX);
  const cascadeCount = useRef(0);

  useEffect(() => {
    localStorage.setItem(PINNED_TOOLS_KEY, JSON.stringify(pinnedItems));
  }, [pinnedItems]);

  const openWindow = useCallback((kind, item) => {
    const id = `${kind}-${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const size = {
      width: Math.min(DEFAULT_WIDTH, window.innerWidth - 40),
      height: Math.min(DEFAULT_HEIGHT, window.innerHeight - 100),
    };

    const step = cascadeCount.current % CASCADE_MAX_STEPS;
    cascadeCount.current += 1;

    const centeredX = (window.innerWidth - size.width) / 2;
    const centeredY = (window.innerHeight - size.height) / 2;

    const cascadeOffset = step * (CASCADE_STEP / 2);

    const position = clampPosition(
      {
        x: centeredX + cascadeOffset,
        y: centeredY + cascadeOffset,
      },
      size,
    );

    const zIndex = nextZIndex.current++;

    setOpenWindows((prev) => [
      ...prev,
      {
        id,
        kind: normalizeKind(kind),
        item,
        position,
        size,
        zIndex,
        minimized: false,
        maximized: false,
      },
    ]);

    return id;
  }, []);

  const openTool = useCallback(
    (tool) => openWindow("tool", tool),
    [openWindow],
  );

  const openScript = useCallback(
    (script) => openWindow("script", script),
    [openWindow],
  );

  const openConfigureTool = useCallback(
    (tool) => openWindow("toolConfig", tool),
    [openWindow],
  );

  const closeWindow = useCallback((id) => {
    setOpenWindows((prev) => prev.filter((win) => win.id !== id));
  }, []);

  const focusWindow = useCallback((id) => {
    const zIndex = nextZIndex.current++;

    setOpenWindows((prev) =>
      prev.map((win) =>
        win.id === id ? { ...win, zIndex, minimized: false } : win,
      ),
    );
  }, []);

  const minimizeWindow = useCallback((id) => {
    setOpenWindows((prev) =>
      prev.map((win) => (win.id === id ? { ...win, minimized: true } : win)),
    );
  }, []);

  const toggleMaximize = useCallback((id) => {
    setOpenWindows((prev) =>
      prev.map((win) =>
        win.id === id ? { ...win, maximized: !win.maximized } : win,
      ),
    );
  }, []);

  const updateWindow = useCallback((id, patch) => {
    setOpenWindows((prev) =>
      prev.map((win) => (win.id === id ? { ...win, ...patch } : win)),
    );
  }, []);

  const pinItem = useCallback((kind, item) => {
    setPinnedItems((prev) => {
      if (prev.some((entry) => samePinnedEntry(entry, kind, item.id))) {
        return prev;
      }

      return [...prev, toPinnedEntry(kind, item)];
    });
  }, []);

  const unpinItem = useCallback((kind, id) => {
    setPinnedItems((prev) =>
      prev.filter((entry) => !samePinnedEntry(entry, kind, id)),
    );
  }, []);

  const isPinned = useCallback(
    (kind, id) => pinnedItems.some((entry) => samePinnedEntry(entry, kind, id)),
    [pinnedItems],
  );

  const value = useMemo(
    () => ({
      openWindows,
      openTool,
      openScript,
      openConfigureTool,
      closeWindow,
      focusWindow,
      minimizeWindow,
      restoreWindow: focusWindow,
      toggleMaximize,
      updateWindow,
      pinnedItems,
      pinItem,
      unpinItem,
      isPinned,
    }),
    [
      openWindows,
      openTool,
      openScript,
      openConfigureTool,
      closeWindow,
      focusWindow,
      minimizeWindow,
      toggleMaximize,
      updateWindow,
      pinnedItems,
      pinItem,
      unpinItem,
      isPinned,
    ],
  );

  return (
    <ToolWindowsContext.Provider value={value}>
      {children}
    </ToolWindowsContext.Provider>
  );
}

export const useToolWindows = () => useContext(ToolWindowsContext);
