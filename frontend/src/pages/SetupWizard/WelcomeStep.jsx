import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import ActionButton from "../../components/toolForms/shared/ActionButton";
import ActionRow from "../../components/toolForms/shared/ActionRow";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";

export default function WelcomeStep({ onNext }) {
  const { t } = useLanguage();
  const [version, setVersion] = useState(null);

  useEffect(() => {
    let ignore = false;

    api
      .getAppInfo()
      .then((info) => {
        if (!ignore) setVersion(info.version);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

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
        <Sparkles size={26} color="var(--primary)" />
      </div>

      <h1
        style={{
          margin: "0 0 10px",
          fontSize: "22px",
          fontWeight: "700",
          color: "var(--text)",
        }}
      >
        {t("setupWizard.welcomeTitle")}
      </h1>

      <p
        style={{
          margin: "0 0 8px",
          fontSize: "14px",
          color: "var(--subtle)",
        }}
      >
        {t("setupWizard.welcomeDescription")}
      </p>

      {version && (
        <p
          style={{
            margin: "0 0 24px",
            fontSize: "12px",
            color: "var(--subtle)",
          }}
        >
          {t("setupWizard.welcomeVersion", { version })}
        </p>
      )}

      <ActionRow justify="center" marginTop="24px">
        <ActionButton variant="primary" onClick={onNext}>
          {t("setupWizard.getStarted")}
        </ActionButton>
      </ActionRow>
    </div>
  );
}
