import { toolRegistry } from "../toolRegistry";

const RECENT_ITEMS_KEY = "recent_tools";
const RECENT_ITEMS_LIMIT = 10;

function normalizeRecentEntry(entry) {
  if (!entry || entry.id === undefined || entry.id === null) return null;

  return {
    ...entry,
    kind: entry.kind === "script" ? "script" : "tool",
  };
}

export function getRecentItems() {
  try {
    const saved = localStorage.getItem(RECENT_ITEMS_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeRecentEntry).filter(Boolean);
  } catch (error) {
    console.error("Invalid recent_tools found:", error);

    return [];
  }
}

export function filterExistingRecentItems(recentItems, tools, scripts = []) {
  const liveToolIds = new Set(tools.map((tool) => String(tool.id)));
  const liveScriptIds = new Set(scripts.map((script) => String(script.id)));

  return recentItems.filter((entry) =>
    entry.kind === "script"
      ? liveScriptIds.has(String(entry.id))
      : liveToolIds.has(String(entry.id)),
  );
}

function storeRecentEntry(entry) {
  const remaining = getRecentItems().filter(
    (existing) =>
      !(
        existing.kind === entry.kind && String(existing.id) === String(entry.id)
      ),
  );

  localStorage.setItem(
    RECENT_ITEMS_KEY,
    JSON.stringify(
      [{ ...entry, usedAt: Date.now() }, ...remaining].slice(
        0,
        RECENT_ITEMS_LIMIT,
      ),
    ),
  );
}

export function addRecentTool(tool) {
  storeRecentEntry({
    kind: "tool",
    id: tool.id,
    name: tool.name,
    icon: tool.icon,
    toolType: tool.toolType,
    categoryId: tool.categoryId,
    subcategoryId: tool.subcategoryId,
  });
}

export function addRecentScript(script) {
  storeRecentEntry({
    kind: "script",
    id: script.id,
    name: script.title,
    language: script.language,
    categoryId: script.categoryId,
    subcategoryId: script.subcategoryId,
  });
}

export async function executeTool(tool, inputValues) {
  const toolDefinition = toolRegistry[tool.toolType];

  if (!toolDefinition) {
    throw new Error(`Unknown tool type: ${tool.toolType}`);
  }

  if (!toolDefinition.engine) {
    throw new Error(`No engine found for tool type: ${tool.toolType}`);
  }

  const result = await toolDefinition.engine(tool, inputValues);

  if (result) {
    addRecentTool(tool);
  }

  return result;
}
