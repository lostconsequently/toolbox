import { useEffect, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  Info,
  LifeBuoy,
  Server,
  Tag,
} from "lucide-react";

import Card from "../../components/shared/Card";
import { useAdmin } from "../../context/AdminContext";
import { useBranding } from "../../context/BrandingContext";
import { useLanguage } from "../../context/LanguageContext";
import { useSettings } from "../../context/SettingsContext";
import { api } from "../../services/api";
import { APP_LINKS, APP_VERSION, RELEASE_NAME } from "../../config/appInfo";
import { cardPadding } from "../../core/tokens";

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

// Lucide dropped brand/logo icons, so the GitHub mark is inlined here
// instead - path is GitHub's own "mark-github" octicon.
function GithubMark({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0c-4.42 0-8 3.58-8 8a8.013 8.013 0 0 0 5.47 7.59c.4.08.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

const LINK_ICONS = {
  documentation: BookOpen,
  repository: GithubMark,
  releaseNotes: Tag,
  support: LifeBuoy,
};

export default function AboutTab({ setNotice }) {
  const { isAdmin } = useAdmin();
  const { appName, companyName } = useBranding();
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
      .catch((err) => {
        if (ignore) return;

        console.error(err);

        setNotice?.({
          status: "error",
          message: err.message || t("adminCenter.about.loadFailed"),
        });
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const cardStyle = {
    padding: compactMode ? cardPadding.compact : cardPadding.normal,
    marginBottom: compactMode ? cardPadding.compact : cardPadding.normal,
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
      <Card style={cardStyle} hoverLift={false}>
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
      </Card>

      <Card style={cardStyle} hoverLift={false}>
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
      </Card>

      <Card style={cardStyle} hoverLift={false}>
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
      </Card>
    </div>
  );
}
