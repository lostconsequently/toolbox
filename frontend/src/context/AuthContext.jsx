import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, setForceLoginRedirectHandler } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [mode, setMode] = useState("disabled");
  const [ssoAvailable, setSsoAvailable] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await api.getAuthStatus();

      setMode(status.mode);
      setSsoAvailable(status.ssoAvailable);

      if (status.mode === "disabled") {
        setUser(null);
        return;
      }

      const { user: currentUser } = await api.getSessionUser();

      setUser(currentUser);
    } catch (error) {
      console.error("Could not load authentication status:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    setForceLoginRedirectHandler(() => {
      setUser(null);
    });

    return () => setForceLoginRedirectHandler(null);
  }, []);

  const loginLocal = async (password, username) => {
    const result = await api.loginSession(password, username);

    setUser(result.user);

    return result.user;
  };

  const logout = async () => {
    try {
      await api.logoutSession();
    } catch (error) {
      console.error("Logout failed:", error);
    }

    setUser(null);
  };

  const isAuthRequired = mode !== "disabled";

  return (
    <AuthContext.Provider
      value={{
        mode,
        ssoAvailable,
        user,
        loading,
        isAuthRequired,
        isLoggedIn: !isAuthRequired || Boolean(user),
        loginLocal,
        logout,
        refreshStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
