import ActionButton from "../../components/toolForms/shared/ActionButton";
import ActionRow from "../../components/toolForms/shared/ActionRow";
import { useLanguage } from "../../context/LanguageContext";
import { languages } from "../../i18n";
import { themes } from "../../core/themes";

function SummaryRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        padding: "8px 0",
        borderBottom: "1px solid var(--border)",
        fontSize: "13px",
      }}
    >
      <span style={{ color: "var(--subtle)" }}>{label}</span>
      <strong style={{ color: "var(--text)", textAlign: "right" }}>
        {value}
      </strong>
    </div>
  );
}

const SEED_LABEL_KEYS = {
  empty: "setupWizard.seedEmptyTitle",
  categories: "setupWizard.seedCategoriesTitle",
  categoriesAndTools: "setupWizard.seedCategoriesAndToolsTitle",
};

export default function SummaryStep({ wizardState, onNext, onBack }) {
  const { t } = useLanguage();

  const languageLabel =
    languages.find((entry) => entry.code === wizardState.language)?.label ||
    wizardState.language;

  const themeLabel = themes[wizardState.theme]?.name || wizardState.theme;

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: "18px", color: "var(--text)" }}>
        {t("setupWizard.summaryTitle")}
      </h2>

      <p style={{ margin: "0 0 20px", fontSize: "13px", color: "var(--subtle)" }}>
        {t("setupWizard.summaryDescription")}
      </p>

      <div>
        <SummaryRow
          label={t("setupWizard.summaryMethod")}
          value={
            wizardState.method === "restore"
              ? t("setupWizard.summaryMethodRestore")
              : t("setupWizard.summaryMethodFresh")
          }
        />

        {wizardState.method === "restore" && wizardState.restoreInfo && (
          <SummaryRow
            label={t("setupWizard.summaryBackupFile")}
            value={new Date(
              wizardState.restoreInfo.modifiedAt,
            ).toLocaleString()}
          />
        )}

        {wizardState.method === "fresh" && (
          <SummaryRow
            label={t("setupWizard.summaryStarterContent")}
            value={t(
              SEED_LABEL_KEYS[wizardState.seedOption] ||
                "setupWizard.seedEmptyTitle",
            )}
          />
        )}

        <SummaryRow
          label={t("setupWizard.summaryLanguage")}
          value={languageLabel}
        />

        <SummaryRow
          label={t("setupWizard.summaryTimezone")}
          value={wizardState.timezone}
        />

        <SummaryRow label={t("setupWizard.summaryTheme")} value={themeLabel} />
      </div>

      <ActionRow justify="space-between" marginTop="24px">
        <ActionButton variant="secondary" onClick={onBack}>
          {t("setupWizard.back")}
        </ActionButton>

        <ActionButton variant="primary" onClick={onNext}>
          {t("setupWizard.next")}
        </ActionButton>
      </ActionRow>
    </div>
  );
}
