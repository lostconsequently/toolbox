import { useEffect, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  FolderGit,
  Info,
  LifeBuoy,
  Server,
  Tag,
} from "lucide-react";

import { useAdmin } from "../../context/AdminContext";
import { useBranding } from "../../context/BrandingContext";
import { useLanguage } from "../../context/LanguageContext";
import { useSettings } from "../../context/SettingsContext";
import { api } from "../../services/api";
import { APP_LINKS, APP_VERSION, RELEASE_NAME } from "../../config/appInfo";

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return null;

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

const LINK_ICONS = {
  documentation: BookOpen,
  repository: FolderGit,
  releaseNotes: Tag,
  support: LifeBuoy,
};

export default function AboutTab() {
  const { isAdmin } = useAdmin();
  const { appName, tagline, companyName, logoUrl } = useBranding();
  const { t } = useLanguage();
  const { settings } = useSettings();

  const compactMode = settings?.compactMode || false;

  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let ignore = false;

    api
      .getSystemInfo()
      .then((info) => {
        if (!ignore) setSystemInfo(info);
      })
      .catch(console.error);

    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  const cardStyle = {
    background: "var(--card)",
    padding: compactMode ? "14px" : "20px",
    borderRadius: "12px",
    marginBottom: compactMode ? "14px" : "20px",
    border: "1px solid var(--border)",
  };

  const infoRows = [
    { label: t("adminCenter.about.version"), value: APP_VERSION },
    RELEASE_NAME && {
      label: t("adminCenter.about.release"),
      value: RELEASE_NAME,
    },
    {
      label: t("adminCenter.about.environment"),
      value: systemInfo?.environment,
    },
    {
      label: t("adminCenter.about.databaseVersion"),
      value: systemInfo ? `SQLite ${systemInfo.sqliteVersion}` : null,
    },
    {
      label: t("adminCenter.about.databaseSize"),
      value: formatBytes(systemInfo?.databaseSizeBytes),
    },
  ].filter(Boolean);

  const availableLinks = Object.entries(APP_LINKS).filter(([, url]) => url);

  const currentYear = new Date().getFullYear();

  return (
    <div style={{ opacity: isAdmin ? 1 : 0.6 }}>
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img
            src={logoUrl || "/favicon.svg"}
            alt=""
            style={{ width: "48px", height: "48px", objectFit: "contain" }}
          />

          <div>
            <h2 style={{ margin: 0 }}>{appName}</h2>

            {tagline && (
              <div
                style={{
                  color: "var(--subtle)",
                  fontSize: "13px",
                  marginTop: "2px",
                }}
              >
                {tagline}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <Info size={16} />
          <h3 style={{ margin: 0 }}>
            {t("adminCenter.about.applicationInfo")}
          </h3>
        </div>

        <div style={{ display: "grid", gap: "8px", fontSize: "13px" }}>
          {infoRows.map((row) => (
            <div
              key={row.label}
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span style={{ color: "var(--subtle)" }}>{row.label}</span>
              <strong>{row.value ?? "—"}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <Server size={16} />
          <h3 style={{ margin: 0 }}>{t("adminCenter.about.linksHeading")}</h3>
        </div>

        {availableLinks.length === 0 ? (
          <div style={{ color: "var(--subtle)", fontSize: "13px" }}>
            {t("adminCenter.about.noLinks")}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {availableLinks.map(([key, url]) => {
              const LinkIcon = LINK_ICONS[key] || ExternalLink;

              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "var(--text)",
                  }}
                >
                  <LinkIcon size={14} />
                  {t(`adminCenter.about.link.${key}`)}
                  <ExternalLink
                    size={11}
                    style={{ marginLeft: "auto", color: "var(--subtle)" }}
                  />
                </a>
              );
            })}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
          {t("adminCenter.about.creditsHeading")}
        </h3>

        <div
          style={{
            fontSize: "13px",
            color: "var(--subtle)",
            display: "grid",
            gap: "6px",
          }}
        >
          <div>
            &copy; {currentYear} {companyName || appName}
          </div>

          <div>{t("adminCenter.about.acknowledgements")}</div>
        </div>
      </div>
    </div>
  );
}
