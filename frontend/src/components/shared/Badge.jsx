import { radius } from "../../core/tokens";

export default function Badge({
  label,
  color,
  variant = "solid",
  compactMode = false,
  title,
  icon,
}) {
  const isSoft = variant === "soft";

  return (
    <span
      title={title || label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: icon ? "4px" : 0,
        justifyContent: "center",
        boxSizing: "border-box",
        height: compactMode ? "20px" : "22px",
        padding: compactMode ? "0 7px" : "0 8px",
        borderRadius: radius.pill,
        background: isSoft ? "var(--overlay)" : color,
        border: isSoft ? "1px solid var(--border)" : "none",
        color: isSoft ? color : "var(--text)",
        fontSize: compactMode ? "11px" : "12px",
        fontWeight: isSoft ? "700" : "600",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </span>
  );
}
