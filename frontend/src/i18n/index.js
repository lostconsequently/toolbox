import nl from "./nl";
import en from "./en";
import tr from "./tr";
import fy from "./fy";

export const translations = {
  nl,
  en,
  tr,
  fy,
};

export const languages = [
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
  { code: "tr", label: "Türkçe" },
  { code: "fy", label: "Frysk" },
];

export const DEFAULT_LANGUAGE = "en";
export const FALLBACK_LANGUAGE = "nl";
export const STORAGE_KEY = "toolbox_language";

function getByPath(dict, path) {
  return path
    .split(".")
    .reduce(
      (value, part) =>
        value && value[part] !== undefined ? value[part] : undefined,
      dict,
    );
}

function interpolate(str, params) {
  if (!params) return str;

  return str.replace(/\{(\w+)\}/g, (match, key) =>
    params[key] !== undefined ? params[key] : match,
  );
}

export function translate(language, key, params) {
  const value =
    getByPath(translations[language], key) ??
    getByPath(translations[FALLBACK_LANGUAGE], key) ??
    key;

  return typeof value === "string" ? interpolate(value, params) : value;
}

export function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return stored && translations[stored] ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
