import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Categories from "./pages/Categories";
import Subcategories from "./pages/Subcategories";
import Tools from "./pages/Tools";
import ToolsCenter from "./pages/ToolsCenter";
import ScriptLibrary from "./pages/ScriptLibrary";
import AdminCenter from "./pages/AdminCenter";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Recover from "./pages/Recover";
import SetupWizard from "./pages/SetupWizard";

import { themes } from "./core/themes";

import { useTheme } from "./context/ThemeContext";
import { useBranding } from "./context/BrandingContext";
import { useSettings } from "./context/SettingsContext";
import { useSetupStatus } from "./hooks/useSetupStatus";

import MainLayout from "./layouts/MainLayout";
import CommandPalette from "./components/CommandPalette";
import ToolWindowManager from "./components/ToolWindowManager";
import MatrixRain from "./components/MatrixRain";
import WinXpBackground from "./components/WinXpBackground";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireAdminRole from "./components/RequireAdminRole";
import RequireSetupComplete from "./components/RequireSetupComplete";
import RedirectIfSetupComplete from "./components/RedirectIfSetupComplete";

function App() {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const { appName, faviconUrl, primaryColor, accentColor } = useBranding();
  const { completed: setupCompleted, loading: setupLoading } =
    useSetupStatus();

  const currentTheme = themes[theme];

  useEffect(() => {
    document.title = appName;
  }, [appName]);

  useEffect(() => {
    if (!faviconUrl) return;

    const link = document.querySelector('link[rel="icon"]');

    if (link) {
      link.href = faviconUrl;
    }
  }, [faviconUrl]);

  const matrixRainActive =
    theme === "matrix" && settings?.matrixRainEnabled !== false;
  const customBackgroundActive =
    matrixRainActive || Boolean(currentTheme.hasSceneBackground);

  return (
    <div
      style={{
        "--bg": currentTheme.background,

        "--surface": currentTheme.surface,

        "--surface-hover": currentTheme.surfaceHover,

        "--card": currentTheme.card,

        "--border": currentTheme.border,

        "--text": currentTheme.text,

        "--subtle": currentTheme.subtleText,

        "--primary": primaryColor || currentTheme.primary,

        "--accent": accentColor || primaryColor || currentTheme.primary,

        "--overlay": currentTheme.overlay,

        "--status-success": currentTheme.statusSuccess,

        "--status-warning": currentTheme.statusWarning,

        "--status-error": currentTheme.statusError,

        backgroundColor: customBackgroundActive
          ? "transparent"
          : currentTheme.background,

        color: currentTheme.text,

        minHeight: "100vh",
      }}
    >
      <MatrixRain />
      <WinXpBackground />

      <BrowserRouter>
        <Routes>
          <Route
            path="/setup"
            element={
              <RedirectIfSetupComplete
                completed={setupCompleted}
                loading={setupLoading}
              >
                <SetupWizard />
              </RedirectIfSetupComplete>
            }
          />

          <Route
            path="/login"
            element={
              <RequireSetupComplete
                completed={setupCompleted}
                loading={setupLoading}
              >
                <Login />
              </RequireSetupComplete>
            }
          />

          <Route
            path="/recover"
            element={
              <RequireSetupComplete
                completed={setupCompleted}
                loading={setupLoading}
              >
                <Recover />
              </RequireSetupComplete>
            }
          />

          <Route
            path="/*"
            element={
              <RequireSetupComplete
                completed={setupCompleted}
                loading={setupLoading}
              >
                <ProtectedRoute>
                  <MainLayout>
                    <Routes>
                    <Route path="/" element={<Dashboard />} />

                    <Route
                      path="/categories"
                      element={
                        <RequireAdminRole>
                          <Categories />
                        </RequireAdminRole>
                      }
                    />

                    <Route
                      path="/subcategories"
                      element={
                        <RequireAdminRole>
                          <Subcategories />
                        </RequireAdminRole>
                      }
                    />

                    <Route path="/tools" element={<Tools />} />

                    <Route
                      path="/tools-center"
                      element={
                        <RequireAdminRole>
                          <ToolsCenter />
                        </RequireAdminRole>
                      }
                    />

                    <Route path="/script-library" element={<ScriptLibrary />} />

                    <Route
                      path="/admin-center"
                      element={
                        <RequireAdminRole>
                          <AdminCenter />
                        </RequireAdminRole>
                      }
                    />

                    <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </MainLayout>

                  <CommandPalette />
                </ProtectedRoute>
              </RequireSetupComplete>
            }
          />
        </Routes>
      </BrowserRouter>

      <ToolWindowManager />
    </div>
  );
}

export default App;
