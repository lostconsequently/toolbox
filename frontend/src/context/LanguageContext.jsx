import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_LANGUAGE, STORAGE_KEY, languages, translate } from "../i18n";
import { api } from "../services/api";

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

  // Same "only if nothing saved yet" rule as ThemeContext - see its comment.
  // Uses setLanguageState directly (not setLanguage) so the org default is
  // never written into localStorage as if the user had chosen it - that
  // would incorrectly "lock in" the value and survive a later org-default
  // change.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) {
      return;
    }

    let ignore = false;

    api
      .getSetupStatus()
      .then((status) => {
        if (ignore) return;

        if (
          status.language &&
          languages.some((entry) => entry.code === status.language)
        ) {
          setLanguageState(status.language);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
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
