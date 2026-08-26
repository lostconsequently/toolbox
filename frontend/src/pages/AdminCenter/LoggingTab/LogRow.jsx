import LevelBadge from "../../../components/shared/LevelBadge";
import Card from "../../../components/shared/Card";

export default function LogRow({ entry, onSelect, compactMode, language }) {
  const timestamp = new Date(entry.createdAt).toLocaleString(
    language === "nl" ? "nl-NL" : "en-US",
  );

  return (
    <Card
      hoverShadow
      tabIndex={0}
      role="button"
      onClick={() => onSelect(entry)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(entry);
        }
      }}
      style={{
        padding: compactMode ? "6px 10px" : "8px 12px",
        display: "grid",
        gridTemplateColumns: "150px 100px 220px 140px minmax(0, 1fr)",
        gap: "12px",
        alignItems: "center",
        cursor: "pointer",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          fontSize: compactMode ? "11px" : "12px",
          color: "var(--subtle)",
          fontFamily: "var(--mono, monospace)",
          whiteSpace: "nowrap",
        }}
      >
        {timestamp}
      </span>

      <LevelBadge level={entry.level} compactMode={compactMode} />

      <span
        style={{
          fontSize: compactMode ? "11px" : "12px",
          fontFamily: "var(--mono, monospace)",
          color: "var(--text)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {entry.eventType}
      </span>

      <span
        style={{
          fontSize: compactMode ? "12px" : "13px",
          color: "var(--subtle)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {entry.userLabel || "—"}
      </span>

      <span
        style={{
          fontSize: compactMode ? "12px" : "13px",
          color: "var(--text)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {entry.message}
      </span>
    </Card>
  );
}
