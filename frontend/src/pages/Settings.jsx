import {
  BarChart3,
  Zap,
  Star,
  Clock3,
  FolderTree,
  LayoutDashboard,
  Minimize2,
  Palette,
} from "lucide-react";

import { useSettings } from "../context/SettingsContext";
import FontSelect from "../components/FontSelect";
import Header from "../components/Header";
import Card from "../components/shared/Card";
import SelectField from "../components/toolForms/shared/SelectField";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { themes } from "../core/themes";
import { cardPadding, stackedFieldMaxWidth } from "../core/tokens";

export default function Settings() {
  const { language, setLanguage, languages, t } = useLanguage();

  const { theme, updateTheme } = useTheme();

  const { settings, updateSetting } = useSettings();

  const compactMode = settings?.compactMode || false;

  const themeOptions = Object.entries(themes)
    .map(([key, def]) => ({ value: key, label: def.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const languageOptions = languages
    .map((entry) => ({ value: entry.code, label: entry.label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const cardStyle = {
    padding: compactMode ? cardPadding.compact : cardPadding.normal,
    marginBottom: compactMode ? cardPadding.compact : cardPadding.normal,
  };

  return (
    <div>
      <Header
        title={t("settings.title")}
        crumbs={[
          { label: t("nav.dashboard"), to: "/" },
          { label: t("settings.title") },
        ]}
      />

      <Card style={cardStyle} hoverLift={false}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <Palette size={16} />
          <h3 style={{ margin: 0 }}>{t("settings.interfaceHeading")}</h3>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "14px",
            maxWidth: stackedFieldMaxWidth,
          }}
        >
          <SelectField
            label={t("setupWizard.themeLabel")}
            value={theme}
            onChange={updateTheme}
            compactMode={compactMode}
            className="hover-card"
            options={themeOptions}
          />

          <SelectField
            label={t("setupWizard.languageLabel")}
            value={language}
            onChange={setLanguage}
            compactMode={compactMode}
            className="hover-card"
            options={languageOptions}
          />

          {theme === "matrix" && (
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
          )}

          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px",
                color: "var(--subtle)",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {t("adminCenter.general.fontLabel")}
            </label>

            <FontSelect
              value={settings.fontFamily}
              onChange={(key) => updateSetting("fontFamily", key)}
              compactMode={compactMode}
              className="hover-card"
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
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
          <LayoutDashboard size={16} />
          <h3 style={{ margin: 0 }}>
            {t("settings.dashboardPrefsHeading")}
          </h3>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <label style={{ display: "block" }}>
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

          <label style={{ display: "block" }}>
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

          <label style={{ display: "block" }}>
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

          <label style={{ display: "block" }}>
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

          <label style={{ display: "block" }}>
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
      </Card>
    </div>
  );
}
