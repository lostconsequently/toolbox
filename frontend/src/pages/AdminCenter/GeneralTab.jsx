import { useEffect, useMemo, useState } from "react";
import { Clock, Globe } from "lucide-react";

import ActionButton from "../../components/toolForms/shared/ActionButton";
import FormField from "../../components/toolForms/shared/FormField";
import SelectField from "../../components/toolForms/shared/SelectField";
import StatusMessage from "../../components/toolForms/shared/StatusMessage";
import Card from "../../components/shared/Card";
import FontSelect from "../../components/FontSelect";
import { useAdmin } from "../../context/AdminContext";
import { useLanguage } from "../../context/LanguageContext";
import { useSettings } from "../../context/SettingsContext";
import { useTimeSettings } from "../../context/TimeSettingsContext";
import { languages } from "../../i18n";
import { themes } from "../../core/themes";
import { fontRegistry } from "../../config/fontRegistry";
import { getGroupedTimezoneOptions } from "../../utils/timezones";
import { api } from "../../services/api";
import { cardPadding, stackedFieldMaxWidth } from "../../core/tokens";

// datetime-local inputs want "YYYY-MM-DDTHH:mm" in the browser's own local
// time - not UTC, and not toISOString() (which is UTC and would show the
// wrong wall-clock value to the admin looking at their own screen).
function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function GeneralTab({ setNotice }) {
  const { isAdmin } = useAdmin();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { refresh: refreshTimeSettings } = useTimeSettings();

  const compactMode = settings?.compactMode || false;

  const [language, setLanguage] = useState("");
  const [timezone, setTimezone] = useState("");
  const [theme, setTheme] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [timeFormat, setTimeFormat] = useState("24h");
  const [timeMode, setTimeMode] = useState("auto");
  const [timeOffsetMinutes, setTimeOffsetMinutes] = useState(0);
  const [manualDateTime, setManualDateTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  // Recomputed once the saved org timezone has loaded so that zone stays
  // the representative shown for its UTC offset, instead of the dropdown
  // silently swapping to a different city at the same offset.
  const { options: timezoneOptions } = useMemo(
    () => getGroupedTimezoneOptions({ preferredZones: [timezone] }),
    [timezone],
  );

  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let ignore = false;

    setLoading(true);
    setLoadError(false);

    api
      .getSetupStatus()
      .then((status) => {
        if (ignore) return;

        const offset = status.timeOffsetMinutes || 0;

        setLanguage(status.language || "");
        setTimezone(status.timezone || "");
        setTheme(status.theme || "");
        setFontFamily(
          status.fontFamily && fontRegistry[status.fontFamily]
            ? status.fontFamily
            : "segoe",
        );
        setTimeFormat(status.timeFormat === "12h" ? "12h" : "24h");
        setTimeMode(status.timeMode === "manual" ? "manual" : "auto");
        setTimeOffsetMinutes(offset);
        // Seeded from the currently-effective time (now + saved offset) so
        // switching to Manual starts from "what the clock reads right now"
        // rather than an empty field.
        setManualDateTime(
          toDatetimeLocalValue(new Date(Date.now() + offset * 60 * 1000)),
        );
      })
      .catch((err) => {
        if (ignore) return;

        console.error(err);
        // Fields stay blank/default on a failed load - Save is kept
        // disabled below so a transient fetch error can never silently
        // overwrite the real org defaults with empty values.
        setLoadError(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [reloadToken]);

  const save = async () => {
    setSaveError("");

    let offsetToSend = 0;

    if (timeMode === "manual") {
      const parsed = new Date(manualDateTime);

      if (Number.isNaN(parsed.getTime())) {
        setSaveError(t("adminCenter.general.timeManualInvalid"));
        return;
      }

      offsetToSend = Math.round((parsed.getTime() - Date.now()) / (60 * 1000));
    }

    setSaving(true);

    try {
      await api.updateOrgDefaults({
        language,
        timezone,
        theme,
        timeFormat,
        timeMode,
        timeOffsetMinutes: offsetToSend,
        fontFamily,
      });

      setTimeOffsetMinutes(offsetToSend);
      await refreshTimeSettings();

      setNotice?.({
        status: "success",
        message: t("adminCenter.general.saveSuccess"),
      });
    } catch (err) {
      console.error(err);

      setNotice?.({
        status: "error",
        message: err.message || t("adminCenter.general.saveFailed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const cardStyle = {
    padding: compactMode ? cardPadding.compact : cardPadding.normal,
    marginBottom: compactMode ? cardPadding.compact : cardPadding.normal,
  };

  return (
    <div style={{ opacity: isAdmin ? 1 : 0.6 }}>
      <Card style={cardStyle} hoverLift={false}>
        {loadError && (
          <StatusMessage status="error">
            {t("adminCenter.general.loadFailed")}{" "}
            <ActionButton
              variant="secondary"
              compactMode
              className="hover-card"
              onClick={() => setReloadToken((token) => token + 1)}
            >
              {t("setupWizard.tryAgain")}
            </ActionButton>
          </StatusMessage>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <Globe size={16} />
          <h3 style={{ margin: 0 }}>
            {t("adminCenter.general.localizationHeading")}
          </h3>
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
            label={t("setupWizard.languageLabel")}
            value={language}
            onChange={setLanguage}
            disabled={!isAdmin || loading}
            compactMode={compactMode}
            className="hover-card"
            options={languages
              .map((entry) => ({
                value: entry.code,
                label: entry.label,
              }))
              .sort((a, b) => a.label.localeCompare(b.label))}
          />

          <SelectField
            label={t("setupWizard.themeLabel")}
            value={theme}
            onChange={setTheme}
            disabled={!isAdmin || loading}
            compactMode={compactMode}
            className="hover-card"
            options={Object.entries(themes)
              .map(([key, def]) => ({
                value: key,
                label: def.name,
              }))
              .sort((a, b) => a.label.localeCompare(b.label))}
          />

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
              value={fontFamily}
              onChange={setFontFamily}
              compactMode={compactMode}
              disabled={!isAdmin || loading}
              className="hover-card"
            />
          </div>
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
          <Clock size={16} />
          <h3 style={{ margin: 0 }}>{t("adminCenter.general.timeHeading")}</h3>
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
            label={t("setupWizard.timezoneLabel")}
            value={timezone}
            onChange={setTimezone}
            disabled={!isAdmin || loading}
            compactMode={compactMode}
            className="hover-card"
            options={timezoneOptions}
          />

          <SelectField
            label={t("adminCenter.general.timeFormatLabel")}
            value={timeFormat}
            onChange={setTimeFormat}
            disabled={!isAdmin || loading}
            compactMode={compactMode}
            className="hover-card"
            options={[
              { value: "24h", label: t("adminCenter.general.timeFormat24h") },
              { value: "12h", label: t("adminCenter.general.timeFormat12h") },
            ].sort((a, b) => a.label.localeCompare(b.label))}
          />

          <SelectField
            label={t("adminCenter.general.timeModeLabel")}
            value={timeMode}
            className="hover-card"
            onChange={(value) => {
              setTimeMode(value);

              // Re-seed from the live effective time whenever switching
              // back into Manual, so it starts from "now" rather than a
              // stale value left over from an earlier edit.
              if (value === "manual") {
                setManualDateTime(
                  toDatetimeLocalValue(
                    new Date(Date.now() + timeOffsetMinutes * 60 * 1000),
                  ),
                );
              }
            }}
            disabled={!isAdmin || loading}
            compactMode={compactMode}
            options={[
              { value: "auto", label: t("adminCenter.general.timeModeAuto") },
              {
                value: "manual",
                label: t("adminCenter.general.timeModeManual"),
              },
            ].sort((a, b) => a.label.localeCompare(b.label))}
          />

          {timeMode === "manual" && (
            <FormField
              label={t("adminCenter.general.timeManualLabel")}
              hint={t("adminCenter.general.timeManualHint")}
              type="datetime-local"
              value={manualDateTime}
              onChange={setManualDateTime}
              disabled={!isAdmin || loading}
              compactMode={compactMode}
              wrapperClassName="hover-card"
            />
          )}
        </div>

        {saveError && (
          <div style={{ marginTop: "8px" }}>
            <StatusMessage status="error">{saveError}</StatusMessage>
          </div>
        )}
      </Card>

      <ActionButton
        variant="primary"
        onClick={save}
        disabled={!isAdmin || loading || loadError || saving}
        compactMode={compactMode}
        className="hover-card"
      >
        {saving ? t("common.saving") : t("adminCenter.general.save")}
      </ActionButton>
    </div>
  );
}
