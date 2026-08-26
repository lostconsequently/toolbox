import {
  BarChart3,
  Zap,
  Star,
  Clock3,
  FolderTree,
  Minimize2,
} from "lucide-react";

import { useSettings } from "../context/SettingsContext";
import FontSelect from "../components/FontSelect";
import Header from "../components/Header";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { themes } from "../core/themes";

export default function Settings() {
  const { language, setLanguage, languages, t } = useLanguage();

  const { theme, updateTheme } = useTheme();

  const { settings, updateSetting } = useSettings();

  const compactMode = settings?.compactMode || false;

  return (
    <div>
      <Header
        title={t("settings.title")}
        crumbs={[
          { label: t("nav.dashboard"), to: "/" },
          { label: t("settings.title") },
        ]}
      />

      <div
        style={{
          background: "var(--card)",
          padding: compactMode ? "14px" : "20px",
          borderRadius: "12px",
          marginBottom: compactMode ? "14px" : "20px",
          border: "1px solid var(--border)",
        }}
      >
        <h2>{t("settings.interfaceHeading")}</h2>

        <div
          style={{
            marginBottom: compactMode ? "14px" : "24px",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
            }}
          >
            {t("settings.selectTheme")}
          </label>

          <select
            value={theme}
            onChange={(e) => updateTheme(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "260px",
              height: compactMode ? "36px" : "42px",
              boxSizing: "border-box",
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0 12px",
              fontSize: "14px",
              outline: "none",
            }}
          >
            {Object.entries(themes).map(([key, themeDef]) => (
              <option key={key} value={key}>
                {themeDef.name}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            marginBottom: compactMode ? "14px" : "24px",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
            }}
          >
            {t("settings.selectLanguage")}
          </label>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "260px",
              height: compactMode ? "36px" : "42px",
              boxSizing: "border-box",
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0 12px",
              fontSize: "14px",
              outline: "none",
            }}
          >
            {languages.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>

        {theme === "matrix" && (
          <div
            style={{
              marginBottom: compactMode ? "14px" : "24px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <input
                type="checkbox"
                checked={settings.matrixRainEnabled !== false}
                onChange={(e) =>
                  updateSetting("matrixRainEnabled", e.target.checked)
                }
              />
              {t("settings.matrixEffect")}
            </label>
          </div>
        )}

        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
            }}
          >
            {t("settings.selectFont")}
          </label>

          <FontSelect
            value={settings.fontFamily}
            onChange={(key) => updateSetting("fontFamily", key)}
            compactMode={compactMode}
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          <input
            type="checkbox"
            checked={settings.compactMode}
            onChange={(e) => updateSetting("compactMode", e.target.checked)}
          />
          <Minimize2 size={16} />
          {t("settings.compactMode")}
        </label>

        <h2>{t("settings.dashboardPrefsHeading")}</h2>

        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "10px",
            }}
          >
            <input
              type="checkbox"
              checked={settings.showStats}
              onChange={(e) => updateSetting("showStats", e.target.checked)}
            />{" "}
            <BarChart3
              size={16}
              style={{
                verticalAlign: "middle",
                marginRight: "6px",
              }}
            />
            {t("settings.showStats")}
          </label>

          <label
            style={{
              display: "block",
              marginBottom: "10px",
            }}
          >
            <input
              type="checkbox"
              checked={settings.showQuickCategories}
              onChange={(e) =>
                updateSetting("showQuickCategories", e.target.checked)
              }
            />{" "}
            <Zap
              size={16}
              style={{
                verticalAlign: "middle",
                marginRight: "6px",
              }}
            />
            {t("settings.showQuickCategories")}
          </label>

          <label
            style={{
              display: "block",
              marginBottom: "10px",
            }}
          >
            <input
              type="checkbox"
              checked={settings.showFavorites}
              onChange={(e) => updateSetting("showFavorites", e.target.checked)}
            />{" "}
            <Star
              size={16}
              style={{
                verticalAlign: "middle",
                marginRight: "6px",
              }}
            />
            {t("settings.showFavorites")}
          </label>

          <label
            style={{
              display: "block",
              marginBottom: "10px",
            }}
          >
            <input
              type="checkbox"
              checked={settings.showRecentTools}
              onChange={(e) =>
                updateSetting("showRecentTools", e.target.checked)
              }
            />{" "}
            <Clock3
              size={16}
              style={{
                verticalAlign: "middle",
                marginRight: "6px",
              }}
            />
            {t("settings.showRecentTools")}
          </label>

          <label
            style={{
              display: "block",
              marginBottom: "10px",
            }}
          >
            <input
              type="checkbox"
              checked={settings.showCategories}
              onChange={(e) =>
                updateSetting("showCategories", e.target.checked)
              }
            />{" "}
            <FolderTree
              size={16}
              style={{
                verticalAlign: "middle",
                marginRight: "6px",
              }}
            />
            {t("settings.showCategories")}
          </label>
        </div>
      </div>
    </div>
  );
}
