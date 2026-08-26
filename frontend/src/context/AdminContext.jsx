import { createContext, useContext, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { api, setForceLogoutHandler } from "../services/api";
import { useAuth } from "./AuthContext";

const AdminContext = createContext();

export function AdminProvider({ children }) {
  const { user: layer1User } = useAuth();

  const [hasAdminToken, setHasAdminToken] = useState(() => {
    return Boolean(sessionStorage.getItem("toolbox_admin_token"));
  });

  const [sessionExpired, setSessionExpired] = useState(false);

  const isAdmin = hasAdminToken || layer1User?.role === "admin";

  useEffect(() => {
    const token = sessionStorage.getItem("toolbox_admin_token");

    if (!token) {
      setHasAdminToken(false);
    }
  }, []);

  useEffect(() => {
    setForceLogoutHandler(() => {
      flushSync(() => {
        setHasAdminToken(false);
        setSessionExpired(true);
      });
    });

    return () => setForceLogoutHandler(null);
  }, []);

  const loginAdmin = async (password) => {
    try {
      const result = await api.loginAdmin(password);

      if (result?.token) {
        sessionStorage.setItem("toolbox_admin_token", result.token);

        flushSync(() => {
          setHasAdminToken(true);
          setSessionExpired(false);
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error("Admin login failed:", error);

      return false;
    }
  };

  const logoutAdmin = async () => {
    try {
      await api.logoutAdmin();
    } catch (error) {
      console.error("Admin logout failed:", error);
    }

    sessionStorage.removeItem("toolbox_admin_token");

    flushSync(() => {
      setHasAdminToken(false);
    });
  };

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        loginAdmin,
        logoutAdmin,
        sessionExpired,
        clearSessionExpired: () => setSessionExpired(false),
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);
