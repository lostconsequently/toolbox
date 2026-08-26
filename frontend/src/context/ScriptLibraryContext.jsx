import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { api } from "../services/api";
import { useAdmin } from "./AdminContext";
import { useAuth } from "./AuthContext";

const ScriptLibraryContext = createContext();

export function ScriptLibraryProvider({ children }) {
  const { isAdmin } = useAdmin();
  const { isLoggedIn } = useAuth();

  const [scripts, setScripts] = useState([]);

  const [loading, setLoading] = useState(true);

  const loadRequestId = useRef(0);

  const loadScripts = useCallback(async () => {
    const requestId = ++loadRequestId.current;

    try {
      const scriptsData = await api.getScripts();

      if (requestId !== loadRequestId.current) {
        return;
      }

      setScripts(scriptsData);
    } catch (err) {
      console.error("Script library load error:", err);
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadScripts();
  }, [loadScripts, isAdmin, isLoggedIn]);

  useEffect(() => {
    const handleFocus = () => loadScripts();

    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, [loadScripts]);

  const addScript = useCallback(async (data) => {
    const created = await api.createScript(data);

    setScripts((prev) => [...prev, created]);

    return created;
  }, []);

  const updateScript = useCallback(async (id, data) => {
    const updated = await api.updateScript(id, data);

    setScripts((prev) =>
      prev.map((script) =>
        script.id === id ? { ...updated, fields: script.fields } : script,
      ),
    );

    return updated;
  }, []);

  const deleteScript = useCallback(async (id) => {
    await api.deleteScript(id);

    setScripts((prev) => prev.filter((script) => script.id !== id));
  }, []);

  const toggleScriptFavorite = useCallback(async (id, isFavorite) => {
    const updated = await api.toggleScriptFavorite(id, isFavorite);

    setScripts((prev) =>
      prev.map((script) =>
        script.id === id ? { ...updated, fields: script.fields } : script,
      ),
    );

    return updated;
  }, []);

  const loadScriptFields = useCallback(async (scriptId) => {
    const fields = await api.getScriptFields(scriptId);

    setScripts((prev) =>
      prev.map((script) =>
        script.id === scriptId ? { ...script, fields } : script,
      ),
    );

    return fields;
  }, []);

  const addScriptField = useCallback(async (scriptId, data) => {
    const created = await api.createScriptField(scriptId, data);

    setScripts((prev) =>
      prev.map((script) =>
        script.id === scriptId
          ? { ...script, fields: [...(script.fields || []), created] }
          : script,
      ),
    );

    return created;
  }, []);

  const updateScriptField = useCallback(async (scriptId, fieldId, data) => {
    const updated = await api.updateScriptField(scriptId, fieldId, data);

    setScripts((prev) =>
      prev.map((script) =>
        script.id === scriptId
          ? {
              ...script,
              fields: (script.fields || []).map((field) =>
                field.id === fieldId ? updated : field,
              ),
            }
          : script,
      ),
    );

    return updated;
  }, []);

  const deleteScriptField = useCallback(async (scriptId, fieldId) => {
    await api.deleteScriptField(scriptId, fieldId);

    setScripts((prev) =>
      prev.map((script) =>
        script.id === scriptId
          ? {
              ...script,
              fields: (script.fields || []).filter(
                (field) => field.id !== fieldId,
              ),
            }
          : script,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      scripts,
      loading,
      reloadScripts: loadScripts,

      addScript,
      updateScript,
      deleteScript,
      toggleScriptFavorite,

      loadScriptFields,
      addScriptField,
      updateScriptField,
      deleteScriptField,
    }),
    [
      scripts,
      loading,
      loadScripts,
      addScript,
      updateScript,
      deleteScript,
      toggleScriptFavorite,
      loadScriptFields,
      addScriptField,
      updateScriptField,
      deleteScriptField,
    ],
  );

  return (
    <ScriptLibraryContext.Provider value={value}>
      {children}
    </ScriptLibraryContext.Provider>
  );
}

export function useScriptLibrary() {
  return useContext(ScriptLibraryContext);
}
