import { getToolTypeColor, getToolTypeLabel } from "../core/toolTypeMeta";
import Badge from "./shared/Badge";

export const TOOL_TYPE_BADGE_COLUMN_WIDTH = 190;

export default function ToolTypeBadge({ toolType, compactMode = false }) {
  const label = getToolTypeLabel(toolType);

  return (
    <Badge
      label={label}
      color={getToolTypeColor(toolType)}
      variant="solid"
      compactMode={compactMode}
    />
  );
}
