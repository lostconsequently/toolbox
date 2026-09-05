import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../services/api";
import { formatClockTime, formatDateTime } from "../utils/timeSettings";

const TimeSettingsContext = createContext();

const DEFAULTS = {
  timezone: null,
  timeFormat: "24h",
  timeOffsetMinutes: 0,
};

export function TimeSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const status = await api.getSetupStatus();

      setSettings({
        timezone: status.timezone || null,
        timeFormat: status.timeFormat === "12h" ? "12h" : "24h",
        timeOffsetMinutes: status.timeOffsetMinutes || 0,
      });
    } catch (error) {
      console.error("Could not load time settings:", error);
      setSettings(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      ...settings,
      loading,
      refresh,
      formatClockTime: (date) => formatClockTime(date, settings),
      formatDateTime: (date) => formatDateTime(date, settings),
    }),
    [settings, loading, refresh],
  );

  return (
    <TimeSettingsContext.Provider value={value}>
      {children}
    </TimeSettingsContext.Provider>
  );
}

export const useTimeSettings = () => useContext(TimeSettingsContext);
