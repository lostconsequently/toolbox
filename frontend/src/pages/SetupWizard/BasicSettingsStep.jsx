import { useEffect, useMemo, useState } from "react";

import ActionButton from "../../components/toolForms/shared/ActionButton";
import ActionRow from "../../components/toolForms/shared/ActionRow";
import SelectField from "../../components/toolForms/shared/SelectField";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { languages } from "../../i18n";
import { themes } from "../../core/themes";

function getUtcOffsetLabel(zone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());

    const offset = parts.find((part) => part.type === "timeZoneName")?.value;

    return offset ? offset.replace("GMT", "UTC") : "UTC";
  } catch {
    return "";
  }
}

function getTimezoneOptions() {
  const guess = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  if (typeof Intl.supportedValuesOf === "function") {
    try {
      const zones = Intl.supportedValuesOf("timeZone");

      return { zones, guess };
    } catch {
      // Fall through to the curated fallback below.
    }
  }

  return {
    zones: [
      "UTC",
      "Europe/Amsterdam",
      "Europe/London",
      "Europe/Berlin",
      "Europe/Istanbul",
      "America/New_York",
      "America/Los_Angeles",
      "Asia/Tokyo",
      "Australia/Sydney",
    ],
    guess,
  };
}

export default function BasicSettingsStep({
  wizardState,
  patchState,
  onNext,
  onBack,
}) {
  const { t } = useLanguage();
  const { updateTheme } = useTheme();

  const { zones, guess } = useMemo(getTimezoneOptions, []);

  const timezoneOptions = useMemo(
    () =>
      zones
        .map((zone) => ({
          value: zone,
          label: `${zone} (${getUtcOffsetLabel(zone)})`,
          offset: getUtcOffsetLabel(zone),
        }))
        .sort((a, b) => a.value.localeCompare(b.value)),
    [zones],
  );

  const currentTimezone =
    wizardState.timezone && zones.includes(wizardState.timezone)
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
      return new Intl.DateTimeFormat(undefined, {
        timeZone: currentTimezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);
    } catch {
      return "";
    }
  }, [currentTimezone, now]);

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
