import { CheckCircle2 } from "lucide-react";

import ActionButton from "../../components/toolForms/shared/ActionButton";
import ActionRow from "../../components/toolForms/shared/ActionRow";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";

export default function DoneStep({ wizardState }) {
  const { t, setLanguage } = useLanguage();
  const { updateTheme } = useTheme();

  const start = () => {
    // Apply the chosen theme/language to this browser immediately, then hard
    // reload so every context (Auth/Branding/etc, all fetch-once-on-mount)
    // picks up the now-configured instance from scratch.
    updateTheme(wizardState.theme);
    setLanguage(wizardState.language);

    window.location.href = "/";
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "16px",
          background: "var(--overlay)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <CheckCircle2 size={26} color="var(--status-success)" />
      </div>

      <h1 style={{ margin: "0 0 10px", fontSize: "20px", color: "var(--text)" }}>
        {t("setupWizard.doneTitle")}
      </h1>

      <p style={{ margin: "0 0 24px", fontSize: "13px", color: "var(--subtle)" }}>
        {t("setupWizard.doneDescription")}
      </p>

      <ActionRow justify="center">
        <ActionButton variant="primary" onClick={start}>
          {t("setupWizard.startToolbox")}
        </ActionButton>
      </ActionRow>
    </div>
  );
}
