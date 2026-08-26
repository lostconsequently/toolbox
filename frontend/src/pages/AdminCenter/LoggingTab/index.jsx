import { useEffect, useRef, useState } from "react";
import { ScrollText, Settings2 } from "lucide-react";

import Badge from "../../../components/shared/Badge";
import LogFilterBar from "./LogFilterBar";
import LogTable from "./LogTable";
import LogDetailDrawer from "./LogDetailDrawer";
import LogRetentionSettings from "./LogRetentionSettings";
import LogExportButton from "./LogExportButton";
import { useAdmin } from "../../../context/AdminContext";
import { useLanguage } from "../../../context/LanguageContext";
import { useSettings } from "../../../context/SettingsContext";
import { api } from "../../../services/api";

const DEFAULT_FILTERS = {
  level: [],
  category: [],
  eventType: "",
  q: "",
  from: "",
  to: "",
  includeUserAudit: true,
};

export default function LoggingTab({ confirm, setNotice }) {
  const { isAdmin } = useAdmin();
  const { t } = useLanguage();
  const { settings } = useSettings();

  const compactMode = settings?.compactMode || false;

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [entries, setEntries] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const loadingRef = useRef(false);

  const loadPage = async (reset) => {
    if (!isAdmin || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const result = await api.getLogs({
        level: filters.level,
        category: filters.category,
        eventType: filters.eventType || undefined,
        q: filters.q || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        cursor: reset ? undefined : cursor,
        includeUserAudit: filters.includeUserAudit,
      });

      setEntries((prev) =>
        reset ? result.entries : [...prev, ...result.entries],
      );
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error(err);

      setNotice({
        status: "error",
        message: err.message || t("adminCenter.logging.loadFailed"),
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    setEntries([]);
    setCursor(null);

    loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, filters]);

  const handleEndReached = () => {
    if (hasMore && !loadingRef.current) {
      loadPage(false);
    }
  };

  const refresh = () => {
    setEntries([]);
    setCursor(null);
    loadPage(true);
  };

  return (
    <div
      style={{
        background: "var(--card)",
        padding: compactMode ? "14px" : "20px",
        borderRadius: "12px",
        marginBottom: compactMode ? "14px" : "20px",
        border: "1px solid var(--border)",
        opacity: isAdmin ? 1 : 0.6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              marginTop: 0,
              marginBottom: "4px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {t("adminCenter.logging.heading")}

            <Badge
              label={t("common.beta")}
              color="var(--status-warning)"
              variant="soft"
              compactMode
            />
          </h2>

          <p style={{ color: "var(--subtle)", margin: 0 }}>
            {t("adminCenter.logging.description")}
          </p>
        </div>

        <LogExportButton
          filters={filters}
          compactMode={compactMode}
          setNotice={setNotice}
        />
      </div>

      <div
        style={{
          marginTop: "18px",
          padding: compactMode ? "12px" : "16px",
          background: "var(--surface)",
          borderRadius: "10px",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "14px",
          }}
        >
          <ScrollText size={16} />
          <h3 style={{ margin: 0 }}>
            {t("adminCenter.logging.eventsHeading")}
          </h3>
        </div>

        <LogFilterBar
          filters={filters}
          onChange={setFilters}
          compactMode={compactMode}
        />

        <LogTable
          entries={entries}
          onEndReached={handleEndReached}
          onSelectEntry={setSelectedEntry}
          compactMode={compactMode}
          loading={loading}
        />
      </div>

      <div
        style={{
          marginTop: "16px",
          padding: compactMode ? "12px" : "16px",
          background: "var(--surface)",
          borderRadius: "10px",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "14px",
          }}
        >
          <Settings2 size={16} />
          <h3 style={{ margin: 0 }}>
            {t("adminCenter.logging.retentionHeading")}
          </h3>
        </div>

        <LogRetentionSettings
          isAdmin={isAdmin}
          confirm={confirm}
          setNotice={setNotice}
          compactMode={compactMode}
          onPurged={refresh}
        />
      </div>

      <LogDetailDrawer
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
}
