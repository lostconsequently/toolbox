import { useLanguage } from "../../context/LanguageContext";
import { useSettings } from "../../context/SettingsContext";

export default function GeneralTab() {
  const { t } = useLanguage();
  const { settings } = useSettings();

  const compactMode = settings?.compactMode || false;

  return (
    <div
      style={{
        background: "var(--card)",
        padding: compactMode ? "14px" : "20px",
        borderRadius: "12px",
        marginBottom: compactMode ? "14px" : "20px",
        border: "1px solid var(--border)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>{t("adminCenter.generalHeading")}</h2>

      <p style={{ color: "var(--subtle)", marginBottom: 0 }}>
        {t("adminCenter.generalDescription")}
      </p>
    </div>
  );
}
