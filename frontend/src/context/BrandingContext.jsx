import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, toBackendUrl } from "../services/api";

const BrandingContext = createContext();

const DEFAULTS = {
  appName: "Toolbox",
  tagline: null,
  companyName: null,
  primaryColor: null,
  accentColor: null,
  loginTitle: null,
  loginSubtitle: null,
  loginWelcomeMessage: null,
  logoUrl: null,
  faviconUrl: null,
  loginBackgroundUrl: null,
};

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getBranding();

      setBranding({
        appName: data.appName || DEFAULTS.appName,
        tagline: data.tagline || null,
        companyName: data.companyName || null,
        primaryColor: data.primaryColor || null,
        accentColor: data.accentColor || null,
        loginTitle: data.loginTitle || null,
        loginSubtitle: data.loginSubtitle || null,
        loginWelcomeMessage: data.loginWelcomeMessage || null,
        logoUrl: toBackendUrl(data.logoUrl),
        faviconUrl: toBackendUrl(data.faviconUrl),
        loginBackgroundUrl: toBackendUrl(data.loginBackgroundUrl),
      });
    } catch (error) {
      console.error("Could not load branding config:", error);
      setBranding(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <BrandingContext.Provider value={{ ...branding, loading, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
