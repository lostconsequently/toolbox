import { radius } from "../../core/tokens";

export default function Card({
  children,
  hoverShadow = false,
  // Static/section cards (a settings panel, a list row with its own inner
  // buttons) shouldn't lift on hover - only cards that are themselves the
  // clickable target (ToolCard, ScriptCard, a clickable log row) should.
  // Defaults to on so every existing clickable-card caller keeps working
  // unchanged; non-interactive callers opt out with hoverLift={false}.
  hoverLift = true,
  accentColor,
  style,
  className = "",
  ...rest
}) {
  const hoverClass = [
    hoverLift ? "hover-card" : "",
    hoverShadow ? "hover-card-shadow" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
