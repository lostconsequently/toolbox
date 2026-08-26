import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";
import AdminButton from "../components/AdminButton";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { useLanguage } from "../context/LanguageContext";
import { themes } from "../core/themes";
import { TASKBAR_HEIGHT } from "../core/tokens";

const MOBILE_DRAWER_BREAKPOINT = "(max-width: 640px)";

function LoadingSkeleton() {
  return (
    <div style={{ display: "grid", gap: "14px" }}>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          style={{
            height: "72px",
            borderRadius: "12px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}

export default function MainLayout({ children }) {
  const { loading } = useApp();
  const { isAuthRequired, user, logout } = useAuth();
  const isNarrowViewport = useMediaQuery("(max-width: 900px)");
  const isMobileViewport = useMediaQuery(MOBILE_DRAWER_BREAKPOINT);
  const { theme } = useTheme();
  const { settings } = useSettings();
  const { t } = useLanguage();
  const location = useLocation();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const matrixRainActive =
    theme === "matrix" && settings?.matrixRainEnabled !== false;
  const customBackgroundActive =
    matrixRainActive || Boolean(themes[theme]?.hasSceneBackground);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: customBackgroundActive ? "transparent" : "var(--bg)",
      }}
    >
      <Sidebar
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: isNarrowViewport ? "14px" : "24px",
          paddingBottom: `${(isNarrowViewport ? 14 : 24) + TASKBAR_HEIGHT}px`,
          overflow: "auto",
          color: "var(--text)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: isMobileViewport ? "space-between" : "flex-end",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          {isMobileViewport && (
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label={t("sidebar.openMenu")}
              title={t("sidebar.openMenu")}
              className="a11y-focus-ring"
              style={{
                display: "flex",
                alignItems: "center",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                cursor: "pointer",
                padding: "6px 8px",
              }}
            >
              <Menu size={18} />
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
              )
            }
            title={t("commandPalette.tooltip")}
            className="a11y-focus-ring"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "transparent",
              border: "none",
              color: "var(--subtle)",
              fontSize: "12px",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span>{t("sidebar.quickSearchHint")}</span>
            <span
              style={{
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "2px 6px",
              }}
            >
              Ctrl+K
            </span>
          </button>

          <AdminButton />

          {isAuthRequired && user && (
            <button
              type="button"
              onClick={logout}
              title={t("login.signOut")}
              aria-label={t("login.signOut")}
              className="a11y-focus-ring"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "13px",
                cursor: "pointer",
                padding: "6px 10px",
              }}
            >
              <LogOut size={14} />
              {!isNarrowViewport && t("login.signOut")}
            </button>
          )}
        </div>

        {loading ? <LoadingSkeleton /> : children}
      </main>
    </div>
  );
}
