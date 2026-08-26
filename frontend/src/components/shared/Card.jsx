import { radius } from "../../core/tokens";

export default function Card({
  children,
  hoverShadow = false,
  accentColor,
  style,
  className = "",
  ...rest
}) {
  const hoverClass = `hover-card${hoverShadow ? " hover-card-shadow" : ""}`;

  return (
    <div
      className={`${hoverClass} ${className}`.trim()}
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: radius.lg,
        ...(accentColor ? { borderTop: `4px solid ${accentColor}` } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
