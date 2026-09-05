import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fontRegistry } from "../config/fontRegistry";
import { api } from "../services/api";

const SettingsContext = createContext();

const FONT_STORAGE_KEY = "toolbox_font";

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const defaultSettings = {
      showStats: true,
      showQuickCategories: true,
      showFavorites: true,
      showRecentTools: true,
      showCategories: true,
      compactMode: false,

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

  // fontFamily lives in its own localStorage key (not the bundled
  // toolbox_settings blob above) - unlike the other dashboard prefs it has
  // an org-wide default (Admin Center's General tab), so it needs the same
  // "only if this browser hasn't picked one yet" fallback ThemeContext/
  // LanguageContext use, which requires knowing whether a value was ever
  // explicitly saved versus just defaulted.
  //
  // Browsers that used Toolbox before this split still have their chosen
  // font sitting in the old bundled toolbox_settings blob - read it once as
  // a one-time migration so upgrading doesn't silently reset an existing
  // user's font back to the default.
  const [fontFamily, setFontFamilyState] = useState(() => {
    const saved = localStorage.getItem(FONT_STORAGE_KEY);

    if (saved && fontRegistry[saved]) {
      return saved;
    }

    try {
      const legacy = JSON.parse(
        localStorage.getItem("toolbox_settings") || "null",
      )?.fontFamily;

      if (legacy && fontRegistry[legacy]) {
        localStorage.setItem(FONT_STORAGE_KEY, legacy);
        return legacy;
      }
    } catch {
      // Invalid JSON - already reported by the settings-loading effect above.
    }

    return "segoe";
  });

  useEffect(() => {
    if (localStorage.getItem(FONT_STORAGE_KEY)) {
      return;
    }

    let ignore = false;

    api
      .getSetupStatus()
      .then((status) => {
        if (ignore) return;

        if (status.fontFamily && fontRegistry[status.fontFamily]) {
          setFontFamilyState(status.fontFamily);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const selectedFont = fontRegistry[fontFamily] || fontRegistry.segoe;

    document.body.style.fontFamily = selectedFont.value;
  }, [fontFamily]);

  const updateSetting = useCallback((key, value) => {
    if (key === "fontFamily") {
      localStorage.setItem(FONT_STORAGE_KEY, value);
      setFontFamilyState(value);
      return;
    }

    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const value = useMemo(
    () => ({
      settings: { ...settings, fontFamily },
      updateSetting,
    }),
    [settings, fontFamily, updateSetting],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
