import React from "react";
import ReactDOM from "react-dom/client";
import { AdminProvider } from "./context/AdminContext";
import { AuthProvider } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { SettingsProvider } from "./context/SettingsContext";
import App from "./App";

import { AppProvider } from "./context/AppContext";
import { ScriptLibraryProvider } from "./context/ScriptLibraryContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ToolWindowsProvider } from "./context/ToolWindowsContext";
import ErrorBoundary from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <BrandingProvider>
            <SettingsProvider>
              <AuthProvider>
                <AdminProvider>
                  <AppProvider>
                    <ScriptLibraryProvider>
                      <ToolWindowsProvider>
                        <App />
                      </ToolWindowsProvider>
                    </ScriptLibraryProvider>
                  </AppProvider>
                </AdminProvider>
              </AuthProvider>
            </SettingsProvider>
          </BrandingProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
