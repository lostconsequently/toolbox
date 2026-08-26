import { X } from "lucide-react";

import LevelBadge from "../../../components/shared/LevelBadge";
import ActionButton from "../../../components/toolForms/shared/ActionButton";
import { useLanguage } from "../../../context/LanguageContext";
import { useModalA11y } from "../../../hooks/useModalA11y";

function DetailRow({ label, value }) {
  if (!value) return null;

  return (
    <div style={{ marginBottom: "14px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: "600",
          color: "var(--subtle)",
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "13px",
          color: "var(--text)",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function LogDetailDrawer({ entry, onClose }) {
  const { t, language } = useLanguage();
  const containerRef = useModalA11y({ isOpen: Boolean(entry), onClose });

  if (!entry) return null;

  const timestamp = new Date(entry.createdAt).toLocaleString(
    language === "nl" ? "nl-NL" : "en-US",
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 10001,
      }}
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("adminCenter.logging.detailHeading")}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(480px, 100%)",
          height: "100%",
          background: "var(--card)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.35)",
          padding: "20px",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ margin: 0 }}>
            {t("adminCenter.logging.detailHeading")}
          </h3>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--subtle)",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <LevelBadge level={entry.level} />
        </div>

        <DetailRow
          label={t("adminCenter.logging.columnTimestamp")}
          value={timestamp}
        />
        <DetailRow
          label={t("adminCenter.logging.filterCategory")}
          value={t(`adminCenter.logging.category.${entry.category}`)}
        />
        <DetailRow
          label={t("adminCenter.logging.columnEventType")}
          value={entry.eventType}
        />
        <DetailRow
          label={t("adminCenter.logging.detailSource")}
          value={entry.source}
        />
        <DetailRow
          label={t("adminCenter.logging.columnUser")}
          value={entry.userLabel}
        />
        <DetailRow label={t("adminCenter.logging.detailIp")} value={entry.ip} />
        <DetailRow
          label={t("adminCenter.logging.detailMessage")}
          value={entry.message}
        />

        {entry.details && (
          <div style={{ marginBottom: "14px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "var(--subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginBottom: "4px",
              }}
            >
              {t("adminCenter.logging.detailContext")}
            </div>

            <pre
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "12px",
                fontFamily: "var(--mono, monospace)",
                color: "var(--text)",
                overflowX: "auto",
                margin: 0,
              }}
            >
              {JSON.stringify(entry.details, null, 2)}
            </pre>
          </div>
        )}

        {entry.stackTrace && (
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "var(--subtle)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginBottom: "4px",
              }}
            >
              {t("adminCenter.logging.detailStackTrace")}
            </div>

            <pre
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "11px",
                fontFamily: "var(--mono, monospace)",
                color: "var(--status-error)",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
              }}
            >
              {entry.stackTrace}
            </pre>
          </div>
        )}

        <div style={{ marginTop: "20px" }}>
          <ActionButton variant="secondary" onClick={onClose}>
            {t("common.close")}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
