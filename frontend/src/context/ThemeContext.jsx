import { createContext, useContext, useEffect, useState } from "react";
import { themes } from "../core/themes";
import { api } from "../services/api";

const ThemeContext = createContext();
const validThemes = Object.keys(themes);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("toolbox_theme");

    if (savedTheme && validThemes.includes(savedTheme)) {
      return savedTheme;
    }

    // No saved preference yet (this browser's first visit, or the org
    // default fetch below hasn't landed) - start from the OS's own
    // light/dark setting rather than always defaulting to dark, same as
    // most modern web apps. A saved preference or org default always wins
    // once known.
    const prefersLight =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: light)").matches;

    return prefersLight ? "light" : "dark";
  });

  // Only when this browser has never saved its own theme: pick up the
  // org-wide default (Admin Center's General tab) instead of the hardcoded
  // "dark" fallback above. Fetched post-mount, so a saved preference always
  // wins immediately with no network round trip; a brand-new browser
  // briefly shows "dark" before flipping to the org default.
  useEffect(() => {
    if (localStorage.getItem("toolbox_theme")) {
      return;
    }

    let ignore = false;

    api
      .getSetupStatus()
      .then((status) => {
        if (ignore) return;

        if (status.theme && validThemes.includes(status.theme)) {
          setTheme(status.theme);
        }
      })
      .catch(() => {
        // No org default reachable - the hardcoded "dark" fallback stands.
      });

    return () => {
      ignore = true;
    };
  }, []);

  const updateTheme = (newTheme) => {
    localStorage.setItem("toolbox_theme", newTheme);

    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        updateTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
