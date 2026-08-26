import { useEffect, useRef, useState } from "react";
import { Minus, Maximize2, Minimize2, X, Pin } from "lucide-react";

import { useSettings } from "../context/SettingsContext";
import { useModalA11y } from "../hooks/useModalA11y";
import { useLanguage } from "../context/LanguageContext";
import { actionColors } from "../core/tokens";

const MIN_WIDTH = 360;
const MIN_HEIGHT = 260;
const TITLE_BAR_HEIGHT = 44;
const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const handleResize = () =>
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

const controlButtonStyle = {
  background: "transparent",
  border: "none",
  color: "var(--subtle)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "26px",
  height: "26px",
  borderRadius: "6px",
  flexShrink: 0,
};

export default function FloatingWindow({
  win,
  isActive,
  title,
  icon,
  pinned,
  onTogglePin,
  showPin = true,
  onClose,
  onFocus,
  onMinimize,
  onToggleMaximize,
  onUpdate,
  children,
}) {
  const { settings } = useSettings();
  const { t } = useLanguage();

  const compactMode = settings?.compactMode || false;
  const isMobile = useIsMobile();
  const fullscreen = win.maximized || isMobile;

  const containerRef = useModalA11y({ isOpen: isActive, onClose });

  const dragState = useRef(null);
  const resizeState = useRef(null);

  const handleTitleBarPointerDown = (event) => {
    if (event.target.closest("[data-window-control]")) {
      return;
    }

    onFocus();

    if (fullscreen) return;

    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: win.position.x,
      originY: win.position.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTitleBarPointerMove = (event) => {
    if (!dragState.current) return;

    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;

    const maxX = Math.max(0, window.innerWidth - win.size.width);
    const maxY = Math.max(0, window.innerHeight - win.size.height);

    onUpdate({
      position: {
        x: Math.min(Math.max(dragState.current.originX + dx, 0), maxX),
        y: Math.min(Math.max(dragState.current.originY + dy, 0), maxY),
      },
    });
  };

  const handleTitleBarPointerUp = () => {
    dragState.current = null;
  };

  const handleResizePointerDown = (event) => {
    event.stopPropagation();
    onFocus();

    if (fullscreen) return;

    resizeState.current = {
      startX: event.clientX,
      startY: event.clientY,
      originWidth: win.size.width,
      originHeight: win.size.height,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizePointerMove = (event) => {
    if (!resizeState.current) return;

    const dx = event.clientX - resizeState.current.startX;
    const dy = event.clientY - resizeState.current.startY;

    const maxWidth = window.innerWidth - win.position.x;
    const maxHeight = window.innerHeight - win.position.y;

    onUpdate({
      size: {
        width: Math.min(
          Math.max(resizeState.current.originWidth + dx, MIN_WIDTH),
          maxWidth,
        ),
        height: Math.min(
          Math.max(resizeState.current.originHeight + dy, MIN_HEIGHT),
          maxHeight,
        ),
      },
    });
  };

  const handleResizePointerUp = () => {
    resizeState.current = null;
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      tabIndex={-1}
      onMouseDown={onFocus}
      style={{
        position: "fixed",
        left: fullscreen ? 0 : win.position.x,
        top: fullscreen ? 0 : win.position.y,
        width: fullscreen ? "100vw" : win.size.width,
        height: fullscreen ? "100vh" : win.size.height,
        zIndex: win.zIndex,
        background: "var(--card)",
        border: fullscreen ? "none" : "1px solid var(--border)",
        borderRadius: fullscreen ? 0 : "12px",
        boxShadow: isActive
          ? "0 20px 60px rgba(0,0,0,0.45)"
          : "0 8px 24px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        onPointerDown={handleTitleBarPointerDown}
        onPointerMove={handleTitleBarPointerMove}
        onPointerUp={handleTitleBarPointerUp}
        onPointerCancel={handleTitleBarPointerUp}
        onDoubleClick={() => !isMobile && onToggleMaximize()}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          height: `${TITLE_BAR_HEIGHT}px`,
          padding: "0 8px 0 14px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          cursor: fullscreen ? "default" : "move",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: 0,
          }}
        >
          {icon}

          <span
            style={{
              color: "var(--text)",
              fontWeight: "600",
              fontSize: compactMode ? "13px" : "14px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
          {showPin && (
            <button
              type="button"
              data-window-control
              onClick={onTogglePin}
              aria-label={
                pinned
                  ? t("toolWindows.unpinTaskbar")
                  : t("toolWindows.pinTaskbar")
              }
              title={
                pinned
                  ? t("toolWindows.unpinTaskbar")
                  : t("toolWindows.pinTaskbar")
              }
              style={{
                ...controlButtonStyle,
                color: pinned ? "var(--primary)" : "var(--subtle)",
              }}
            >
              <Pin size={13} fill={pinned ? "currentColor" : "none"} />
            </button>
          )}

          <button
            type="button"
            data-window-control
            onClick={onMinimize}
            aria-label={t("toolWindows.minimize")}
            title={t("toolWindows.minimize")}
            style={controlButtonStyle}
          >
            <Minus size={14} />
          </button>

          {!isMobile && (
            <button
              type="button"
              data-window-control
              onClick={onToggleMaximize}
              aria-label={
                win.maximized
                  ? t("toolWindows.restore")
                  : t("toolWindows.maximize")
              }
              title={
                win.maximized
                  ? t("toolWindows.restore")
                  : t("toolWindows.maximize")
              }
              style={controlButtonStyle}
            >
              {win.maximized ? (
                <Minimize2 size={13} />
              ) : (
                <Maximize2 size={13} />
              )}
            </button>
          )}

          <button
            type="button"
            data-window-control
            onClick={onClose}
            aria-label={t("toolWindows.close")}
            title={t("toolWindows.close")}
            style={{ ...controlButtonStyle, color: actionColors.dangerText }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: compactMode ? "14px" : "18px",
        }}
      >
        {children}
      </div>

      {!fullscreen && (
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: "16px",
            height: "16px",
            cursor: "nwse-resize",
          }}
        />
      )}
    </div>
  );
}
