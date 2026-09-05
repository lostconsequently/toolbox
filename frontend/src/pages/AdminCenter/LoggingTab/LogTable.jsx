import VirtualizedList from "../../../components/shared/VirtualizedList";
import LogRow from "./LogRow";
import { useLanguage } from "../../../context/LanguageContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { MOBILE_BREAKPOINT_QUERY } from "../../../core/tokens";

const ROW_HEIGHT = 44;
const COMPACT_ROW_HEIGHT = 38;
// The mobile row stacks timestamp+level, message, and event type+user
// across three lines instead of five fixed columns - tall enough to fit
// that without clipping.
const MOBILE_ROW_HEIGHT = 96;
const MOBILE_COMPACT_ROW_HEIGHT = 84;

export default function LogTable({
  entries,
  onEndReached,
  onSelectEntry,
  compactMode,
  loading,
}) {
  const { t } = useLanguage();
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);

  const rowHeight = isMobile
    ? compactMode
      ? MOBILE_COMPACT_ROW_HEIGHT
      : MOBILE_ROW_HEIGHT
    : compactMode
      ? COMPACT_ROW_HEIGHT
      : ROW_HEIGHT;

  return (
    <div>
      {!isMobile && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "150px 100px 220px 140px minmax(0, 1fr)",
            gap: "12px",
            padding: compactMode ? "0 10px 6px" : "0 12px 8px",
            fontSize: "11px",
            fontWeight: "600",
            color: "var(--subtle)",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          <span>{t("adminCenter.logging.columnTimestamp")}</span>
          <span>{t("adminCenter.logging.columnLevel")}</span>
          <span>{t("adminCenter.logging.columnEventType")}</span>
          <span>{t("adminCenter.logging.columnUser")}</span>
          <span>{t("adminCenter.logging.columnDetails")}</span>
        </div>
      )}

      <VirtualizedList
        items={entries}
        rowHeight={rowHeight}
        overscan={10}
        height={520}
        onEndReached={onEndReached}
        renderRow={(entry) => (
          <LogRow
            entry={entry}
            onSelect={onSelectEntry}
            compactMode={compactMode}
            isMobile={isMobile}
          />
        )}
        emptyState={
          <div
            style={{
              padding: "40px 12px",
              textAlign: "center",
              color: "var(--subtle)",
              fontSize: "13px",
            }}
          >
            {loading ? t("common.loading") : t("adminCenter.logging.empty")}
          </div>
        }
      />
    </div>
  );
}
