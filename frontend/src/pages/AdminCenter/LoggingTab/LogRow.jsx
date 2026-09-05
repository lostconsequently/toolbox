import LevelBadge from "../../../components/shared/LevelBadge";
import Card from "../../../components/shared/Card";
import { useTimeSettings } from "../../../context/TimeSettingsContext";
import { useLanguage } from "../../../context/LanguageContext";

export default function LogRow({ entry, onSelect, compactMode, isMobile }) {
  const { formatDateTime } = useTimeSettings();
  const { t } = useLanguage();
  const timestamp = formatDateTime(new Date(entry.createdAt));

  if (isMobile) {
    // The desktop grid needs ~610px of fixed columns to lay out without
    // clipping - below the mobile breakpoint this stacks each field with
    // its own label instead (see LogTable's matching rowHeight increase).
    return (
      <Card
        hoverLift={false}
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
          padding: compactMode ? "8px 10px" : "10px 12px",
          display: "grid",
          gap: "4px",
          cursor: "pointer",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LevelBadge level={entry.level} compactMode={compactMode} />

          <span
            style={{
              fontSize: "11px",
              color: "var(--subtle)",
              fontFamily: "var(--mono, monospace)",
            }}
          >
            {timestamp}
          </span>
        </div>

        <div
          style={{
            fontSize: compactMode ? "12px" : "13px",
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {entry.message}
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            fontSize: "11px",
            color: "var(--subtle)",
          }}
        >
          <span>
            {t("adminCenter.logging.columnEventType")}: {entry.eventType}
          </span>
          <span>
            {t("adminCenter.logging.columnUser")}: {entry.userLabel || "—"}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      hoverLift={false}
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
