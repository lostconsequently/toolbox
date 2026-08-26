import Icon from "./Icon";
import Card from "./shared/Card";
import { useSettings } from "../context/SettingsContext";
import "../styles/hoverCard.css";

export default function StatCard({
  title,
  value,
  color = "var(--primary)",
  icon = "tool",
  onClick,
}) {
  const { settings } = useSettings();

  const compactMode = settings?.compactMode || false;

  const isClickable = Boolean(onClick);

  return (
    <Card
      hoverShadow
      accentColor={color}
      className={isClickable ? "hover-card-glow" : ""}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={isClickable ? title : undefined}
      style={{
        padding: compactMode ? "10px" : "16px",
        textAlign: "center",
        cursor: isClickable ? "pointer" : "default",
        outline: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              color: "var(--subtle)",
              fontSize: compactMode ? "11px" : "12px",
              fontWeight: "500",
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: "4px",

              fontSize: compactMode ? "22px" : "28px",

              fontWeight: "700",
              color: "var(--text)",
              lineHeight: 1,
            }}
          >
            {value}
          </div>
        </div>

        <Icon name={icon} size={compactMode ? 22 : 28} />
      </div>
    </Card>
  );
}
