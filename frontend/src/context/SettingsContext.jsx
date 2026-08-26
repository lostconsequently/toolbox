import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fontRegistry } from "../config/fontRegistry";
const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const defaultSettings = {
      showStats: true,
      showQuickCategories: true,
      showFavorites: true,
      showRecentTools: true,
      showCategories: true,
      compactMode: false,

      fontFamily: "segoe",

      matrixRainEnabled: true,

      collapsedSections: {
        favorites: false,
        recent: false,
        categories: false,
      },
    };

    try {
      const savedSettings = localStorage.getItem("toolbox_settings");

      if (!savedSettings) {
        return defaultSettings;
      }

      return {
        ...defaultSettings,
        ...JSON.parse(savedSettings),
      };
    } catch (error) {
      console.error("Invalid toolbox_settings found:", error);

      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem("toolbox_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const selectedFont = fontRegistry[settings.fontFamily || "segoe"];

    if (!selectedFont) {
      return;
    }

    document.body.style.fontFamily = selectedFont.value;
  }, [settings.fontFamily]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const value = useMemo(
    () => ({
      settings,
      updateSetting,
    }),
    [settings, updateSetting],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
