import { ChevronDown, ChevronRight } from "lucide-react";
import Icon from "../Icon";

export default function CollapsibleSectionHeader({
  iconName,
  title,
  collapsed,
  onToggleCollapse,
  expandLabel,
  collapseLabel,
}) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={onToggleCollapse}
          className="a11y-focus-ring"
          aria-expanded={!collapsed}
          aria-label={collapsed ? expandLabel : collapseLabel}
          title={collapsed ? expandLabel : collapseLabel}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--subtle)",
            cursor: "pointer",
            fontSize: "12px",
            padding: 0,
            minWidth: "14px",
            display: "flex",
            borderRadius: "4px",
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        <Icon name={iconName} size={22} />

        <h2 style={{ margin: 0, color: "var(--text)" }}>{title}</h2>
      </div>
    </div>
  );
}
