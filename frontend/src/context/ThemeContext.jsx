import { createContext, useContext, useState } from "react";
import { themes } from "../core/themes";

const ThemeContext = createContext();
const validThemes = Object.keys(themes);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("toolbox_theme");

    if (savedTheme && validThemes.includes(savedTheme)) {
      return savedTheme;
    }

    return "dark";
  });

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
