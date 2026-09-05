import { useEffect, useMemo, useState } from "react";

import ActionButton from "../../components/toolForms/shared/ActionButton";
import ActionRow from "../../components/toolForms/shared/ActionRow";
import SelectField from "../../components/toolForms/shared/SelectField";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { languages } from "../../i18n";
import { themes } from "../../core/themes";
import { getGroupedTimezoneOptions } from "../../utils/timezones";
import { formatClockTime } from "../../utils/timeSettings";

export default function BasicSettingsStep({
  wizardState,
  patchState,
  onNext,
  onBack,
}) {
  const { t } = useLanguage();
  const { updateTheme } = useTheme();

  // Recomputed once wizardState.timezone has a value so that zone stays the
  // representative shown for its UTC offset, instead of the dropdown
  // silently swapping to a different city at the same offset.
  const { options: timezoneOptions, guess } = useMemo(
    () => getGroupedTimezoneOptions({ preferredZones: [wizardState.timezone] }),
    [wizardState.timezone],
  );

  const currentTimezone = timezoneOptions.some(
    (option) => option.value === wizardState.timezone,
  )
    ? wizardState.timezone
    : guess;

  // The displayed value can differ from wizardState.timezone until the user
  // actually touches the dropdown (it falls back to the detected zone) -
  // keep the wizard's own state in sync so "Next" carries the shown value,
  // not the untouched "UTC" placeholder.
  useEffect(() => {
    if (wizardState.timezone !== currentTimezone) {
      patchState({ timezone: currentTimezone });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTimezone]);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);

    return () => clearInterval(interval);
  }, []);

  const previewTime = useMemo(() => {
    try {
      return formatClockTime(now, {
        timezone: currentTimezone,
        timeFormat: wizardState.timeFormat,
      });
    } catch {
      return "";
    }
  }, [currentTimezone, wizardState.timeFormat, now]);

  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: "18px", color: "var(--text)" }}>
        {t("setupWizard.settingsTitle")}
      </h2>

      <p style={{ margin: "0 0 20px", fontSize: "13px", color: "var(--subtle)" }}>
        {t("setupWizard.settingsDescription")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <SelectField
          label={t("setupWizard.languageLabel")}
          value={wizardState.language}
          onChange={(value) => patchState({ language: value })}
          options={languages.map((entry) => ({
            value: entry.code,
            label: entry.label,
          }))}
        />

        <div>
          <SelectField
            label={t("setupWizard.timezoneLabel")}
            value={currentTimezone}
            onChange={(value) => patchState({ timezone: value })}
            options={timezoneOptions}
          />

          {previewTime && (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "12px",
                color: "var(--subtle)",
              }}
            >
              {t("setupWizard.timezonePreview", { time: previewTime })}
            </p>
          )}
        </div>

        <SelectField
          label={t("adminCenter.general.timeFormatLabel")}
          value={wizardState.timeFormat}
          onChange={(value) => patchState({ timeFormat: value })}
          options={[
            { value: "24h", label: t("adminCenter.general.timeFormat24h") },
            { value: "12h", label: t("adminCenter.general.timeFormat12h") },
          ]}
        />

        <SelectField
          label={t("setupWizard.themeLabel")}
          value={wizardState.theme}
          onChange={(value) => {
            patchState({ theme: value });
            updateTheme(value);
          }}
          options={Object.entries(themes).map(([key, def]) => ({
            value: key,
            label: def.name,
          }))}
        />
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
