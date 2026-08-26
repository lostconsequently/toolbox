import { NavLink } from "react-router-dom";
import {
  Home,
  FolderTree,
  Folder,
  Wrench,
  FileCode,
  ShieldCheck,
  Settings,
  Store,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useSettings } from "../context/SettingsContext";
import { useLanguage } from "../context/LanguageContext";
import { APP_VERSION } from "../config/appInfo";
import { TASKBAR_HEIGHT } from "../core/tokens";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useModalA11y } from "../hooks/useModalA11y";
import "../styles/hoverCard.css";

const MOBILE_DRAWER_BREAKPOINT = "(max-width: 640px)";

export default function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const { settings } = useSettings();
  const { t } = useLanguage();
  const { appName, logoUrl } = useBranding();
  const { isAuthRequired, user } = useAuth();

  const isRestrictedUser = isAuthRequired && user?.role === "user";

  const isNarrowViewport = useMediaQuery("(max-width: 900px)");
  const isMobileViewport = useMediaQuery(MOBILE_DRAWER_BREAKPOINT);
  const compactMode =
    (settings?.compactMode || isNarrowViewport) && !isMobileViewport;

  const containerRef = useModalA11y({
    isOpen: isMobileViewport && mobileOpen,
    onClose: onCloseMobile,
  });

  const handleNavClick = () => {
    if (isMobileViewport) onCloseMobile?.();
  };

  const dashboardItem = {
    name: t("nav.dashboard"),
    path: "/",
    icon: Home,
  };

  const workspaceItems = [
    {
      name: t("nav.tools"),
      path: "/tools",
      icon: Wrench,
    },
    {
      name: t("nav.scriptLibrary"),
      path: "/script-library",
      icon: FileCode,
    },
    !isRestrictedUser && {
      name: t("nav.categories"),
      path: "/categories",
      icon: FolderTree,
    },
    !isRestrictedUser && {
      name: t("nav.subcategories"),
      path: "/subcategories",
      icon: Folder,
    },
    {
      name: t("nav.settings"),
      path: "/settings",
      icon: Settings,
    },
  ].filter(Boolean);

  const managementItems = isRestrictedUser
    ? []
    : [
        {
          name: t("nav.toolsCenter"),
          path: "/tools-center",
          icon: Store,
        },
        {
          name: t("nav.adminCenter"),
          path: "/admin-center",
          icon: ShieldCheck,
        },
      ];

  const renderNavItem = (item) => {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={handleNavClick}
        className="hover-shift-right"
        style={({ isActive }) => ({
          display: "flex",
          alignItems: "center",

          justifyContent: compactMode ? "center" : "flex-start",

          gap: compactMode ? "0" : "12px",
          padding: compactMode ? "10px 12px" : "14px 16px",
          borderRadius: "10px",
          textDecoration: "none",

          background: isActive
            ? "color-mix(in srgb, var(--primary) 14%, transparent)"
            : "transparent",

          color: "var(--text)",

          boxShadow: isActive ? "inset 3px 0 0 var(--primary)" : "none",
        })}
      >
        <Icon size={compactMode ? 18 : 20} />
        {!compactMode && <span>{item.name}</span>}
      </NavLink>
    );
  };

  const renderSection = (labelKey, items) => (
    <div
      key={labelKey}
      role="group"
      aria-label={t(labelKey)}
      style={{
        marginTop: compactMode ? "8px" : "10px",
        paddingTop: compactMode ? "8px" : "10px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: compactMode ? "4px" : "8px",
      }}
    >
      {!compactMode && (
        <span
          style={{
            display: "block",
            padding: "0 16px",
            marginBottom: "2px",
            color: "var(--subtle)",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.6px",
            textTransform: "uppercase",
          }}
        >
          {t(labelKey)}
        </span>
      )}

      {items.map(renderNavItem)}
    </div>
  );

  return (
    <>
      {isMobileViewport && mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
          }}
        />
      )}

      <aside
        ref={isMobileViewport ? containerRef : undefined}
        role={isMobileViewport ? "dialog" : undefined}
        aria-modal={isMobileViewport ? true : undefined}
        aria-label={isMobileViewport ? t("sidebar.openMenu") : undefined}
        tabIndex={isMobileViewport ? -1 : undefined}
        style={{
          width: isMobileViewport ? "260px" : compactMode ? "72px" : "260px",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          padding: compactMode && !isMobileViewport ? "12px" : "20px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          position: isMobileViewport ? "fixed" : "sticky",
          top: 0,
          left: 0,
          alignSelf: "flex-start",
          height: "100vh",
          boxSizing: "border-box",
          overflowY: "auto",
          zIndex: 1000,
          transform: isMobileViewport
            ? `translateX(${mobileOpen ? "0" : "-100%"})`
            : "none",
          transition: isMobileViewport ? "transform 0.2s ease" : "none",
        }}
      >
        <div
          style={{
            marginBottom: compactMode ? "16px" : "30px",
            paddingBottom: compactMode ? "10px" : "16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",

              justifyContent: compactMode ? "center" : "flex-start",

              gap: compactMode ? "0" : "10px",
            }}
          >
            <img
              src={logoUrl || "/favicon.svg"}
              alt={appName}
              style={{
                width: compactMode ? "42px" : "56px",

                height: compactMode ? "42px" : "56px",

                objectFit: "contain",
              }}
            />

            {!compactMode && (
              <h2
                style={{
                  margin: 0,
                  color: "var(--text)",
                  fontSize: "28px",
                  fontWeight: "700",
                  letterSpacing: "-0.5px",
                }}
              >
                {appName}
              </h2>
            )}

            {isMobileViewport && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label={t("sidebar.closeMenu")}
                title={t("sidebar.closeMenu")}
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  cursor: "pointer",
                  padding: "6px 10px",
                  fontSize: "13px",
                }}
              >
                ✕
              </button>
            )}
          </div>

          <p
            style={{
              marginTop: "6px",
              marginBottom: 0,
              marginLeft: "34px",
              color: "var(--subtle)",
              fontSize: "12px",
              letterSpacing: "0.3px",
              opacity: 0.85,
            }}
          ></p>
        </div>

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: compactMode ? "4px" : "8px",
          }}
        >
          {renderNavItem(dashboardItem)}
          {renderSection("sidebar.workspaceSection", workspaceItems)}
          {managementItems.length > 0 &&
            renderSection("sidebar.managementSection", managementItems)}
        </nav>

        <div
          style={{
            marginTop: "auto",
            paddingTop: compactMode ? "10px" : "16px",
            paddingBottom: `${TASKBAR_HEIGHT}px`,
            borderTop: "1px solid var(--border)",
            textAlign: compactMode ? "center" : "left",
          }}
        >
          <div
            style={{
              color: "var(--subtle)",
              fontSize: "11px",
              fontWeight: "600",
              opacity: 0.7,
            }}
          >
            {appName} v{APP_VERSION}
          </div>
        </div>
      </aside>
    </>
  );
}
