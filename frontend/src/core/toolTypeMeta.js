import { toolRegistry } from "./toolRegistry";
import {
  getMarketplaceCategoryColor,
  getMarketplaceCategoryLabel,
} from "./marketplaceCategories";

// The badge next to each tool's title is meant to show the tool's *kind*
// at a glance - a small, shared vocabulary a user can learn to recognize
// across the whole catalog. Previously it rendered toolRegistry[toolType]'s
// own `label`, which is unique per tool (e.g. "BSOD Analyzer"), so the badge
// just repeated the title next to it instead of adding new information.
// Every registry entry already carries a `marketplaceCategory` - the same
// small category set Tools Center's filter bar uses - so this delegates to
// that shared vocabulary instead of inventing a second one.
function getCategory(toolType) {
  return toolRegistry[toolType]?.marketplaceCategory;
}

export function getToolTypeLabel(toolType) {
  const category = getCategory(toolType);

  return category ? getMarketplaceCategoryLabel(category) : "Tool";
}

export function getToolTypeColor(toolType) {
  const category = getCategory(toolType);

  return category ? getMarketplaceCategoryColor(category) : "#475569";
}
