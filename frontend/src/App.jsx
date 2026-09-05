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

  // index.html declares multiple <link rel="icon"> variants (.ico, two PNG
  // sizes, SVG) so browsers can pick whichever they render best - updating
  // only the first one left most browsers still showing the built-in icon.
  // Each link's original href is captured once (before any override) so a
  // custom favicon can be reverted back to the real default on remove/reset,
  // instead of leaving the last-set custom icon stuck in the tab forever.
  useEffect(() => {
    const links = document.querySelectorAll('link[rel="icon"]');

    links.forEach((link) => {
      if (!link.dataset.defaultHref) {
        link.dataset.defaultHref = link.href;
      }

      link.href = faviconUrl || link.dataset.defaultHref;
    });
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

        "--status-info": currentTheme.statusInfo,

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
