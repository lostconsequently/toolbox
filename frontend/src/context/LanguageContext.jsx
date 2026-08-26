import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { DEFAULT_LANGUAGE, STORAGE_KEY, languages, translate } from "../i18n";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved && languages.some((entry) => entry.code === saved)) {
      return saved;
    }

    return DEFAULT_LANGUAGE;
  });

  const setLanguage = useCallback((nextLanguage) => {
    localStorage.setItem(STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  const t = useCallback(
    (key, params) => translate(language, key, params),
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, languages, t }),
    [language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
