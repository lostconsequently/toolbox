import { Pin, X } from "lucide-react";
import Icon from "./Icon";
import { useLanguage } from "../context/LanguageContext";
import "../styles/hoverCard.css";

function TaskbarIcon({ tool, isActive }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "22px",
        height: "22px",
        borderRadius: "7px",
        flexShrink: 0,
        color: isActive ? "#ffffff" : "var(--text)",
        background: isActive
          ? "rgba(255, 255, 255, 0.22)"
          : "color-mix(in srgb, var(--text) 10%, transparent)",
        border: `1px solid ${
          isActive
            ? "rgba(255, 255, 255, 0.35)"
            : "color-mix(in srgb, var(--text) 20%, transparent)"
        }`,
      }}
    >
      <Icon name={tool.icon || "tool"} size={14} color="currentColor" />
    </span>
  );
}

export default function ToolWindowsTaskbar({ items }) {
  const { t } = useLanguage();
  const hasItems = items && items.length > 0;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9500,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        minHeight: "42px",
        boxSizing: "border-box",
        background: "var(--card)",
        borderTop: "1px solid var(--border)",
        overflowX: "auto",
      }}
    >
      {!hasItems && (
        <span
          style={{
            color: "var(--subtle)",
            fontSize: "12px",
          }}
        >
          {t("toolWindows.noneOpen")}
        </span>
      )}

      {(items || []).map((item) => {
        const { tool, isActive, isPinned, minimized, hasWindow } = item;

        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={item.onSelect}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                item.onSelect();
              }
            }}
            className={`a11y-focus-ring taskbar-pill${isActive ? " taskbar-pill-active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: isActive ? "var(--primary)" : "var(--surface)",
              border: `1px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
              borderRadius: "999px",
              padding: "5px 8px 5px 6px",
              cursor: "pointer",
              flexShrink: 0,
              opacity: hasWindow && minimized ? 0.7 : 1,
            }}
          >
            <TaskbarIcon tool={tool} isActive={isActive} />

            <span
              style={{
                color: isActive ? "#ffffff" : "var(--text)",
                fontSize: "12px",
                fontWeight: isActive ? "600" : "400",
                whiteSpace: "nowrap",
              }}
            >
              {tool.name}
            </span>

            {item.onTogglePin && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  item.onTogglePin();
                }}
                aria-label={
                  isPinned
                    ? t("toolWindows.unpinAria", { name: tool.name })
                    : t("toolWindows.pinAria", { name: tool.name })
                }
                title={isPinned ? t("toolWindows.unpin") : t("toolWindows.pin")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: isActive ? "#ffffff" : "var(--subtle)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                <Pin size={11} fill={isPinned ? "currentColor" : "none"} />
              </button>
            )}

            {item.onClose && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  item.onClose();
                }}
                aria-label={t("toolWindows.closeAria", { name: tool.name })}
                style={{
                  background: "transparent",
                  border: "none",
                  color: isActive ? "#ffffff" : "var(--subtle)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
