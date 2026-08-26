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

const AppContext = createContext();

export function AppProvider({ children }) {
  const { isAdmin } = useAdmin();
  const { isLoggedIn } = useAuth();

  const [categories, setCategories] = useState([]);

  const [subcategories, setSubcategories] = useState([]);

  const [tools, setTools] = useState([]);

  const [loading, setLoading] = useState(true);

  const loadRequestId = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestId.current;

    try {
      const [categoriesData, subcategoriesData, toolsData] = await Promise.all([
        api.getCategories(),
        api.getSubcategories(),
        api.getTools(),
      ]);

      if (requestId !== loadRequestId.current) {
        return;
      }

      setCategories(categoriesData);
      setSubcategories(subcategoriesData);
      setTools(toolsData);
    } catch (err) {
      console.error("Backend load error:", err);
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, isAdmin, isLoggedIn]);

  useEffect(() => {
    const handleFocus = () => loadData();

    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, [loadData]);

  const addCategory = useCallback(async (data) => {
    const created = await api.createCategory(data);

    setCategories((prev) => [...prev, created]);

    return created;
  }, []);

  const updateCategory = useCallback(async (id, data) => {
    const updated = await api.updateCategory(id, data);

    setCategories((prev) =>
      prev.map((category) => (category.id === id ? updated : category)),
    );

    return updated;
  }, []);

  const deleteCategory = useCallback(async (id) => {
    await api.deleteCategory(id);

    setCategories((prev) => prev.filter((category) => category.id !== id));

    setSubcategories((prev) =>
      prev.filter((subcategory) => subcategory.categoryId !== id),
    );

    setTools((prev) => prev.filter((tool) => tool.categoryId !== id));
  }, []);

  const addSubcategory = useCallback(async (data) => {
    const created = await api.createSubcategory(data);

    setSubcategories((prev) => [...prev, created]);

    return created;
  }, []);

  const updateSubcategory = useCallback(async (id, data) => {
    const updated = await api.updateSubcategory(id, data);

    setSubcategories((prev) =>
      prev.map((subcategory) =>
        subcategory.id === id ? updated : subcategory,
      ),
    );

    return updated;
  }, []);

  const deleteSubcategory = useCallback(async (id) => {
    await api.deleteSubcategory(id);

    setSubcategories((prev) =>
      prev.filter((subcategory) => subcategory.id !== id),
    );

    setTools((prev) =>
      prev.map((tool) =>
        tool.subcategoryId === id
          ? {
              ...tool,
              subcategoryId: null,
            }
          : tool,
      ),
    );
  }, []);

  const addTool = useCallback(async (data) => {
    const created = await api.createTool(data);

    setTools((prev) => [...prev, created]);

    return created;
  }, []);

  const updateTool = useCallback(async (id, data) => {
    const updated = await api.updateTool(id, data);

    setTools((prev) => prev.map((tool) => (tool.id === id ? updated : tool)));

    return updated;
  }, []);

  const deleteTool = useCallback(async (id) => {
    await api.deleteTool(id);

    setTools((prev) => prev.filter((tool) => tool.id !== id));
  }, []);

  const toggleToolFavorite = useCallback(async (id, favorite) => {
    const updated = await api.toggleToolFavorite(id, favorite);

    setTools((prev) => prev.map((tool) => (tool.id === id ? updated : tool)));

    return updated;
  }, []);

  const value = useMemo(
    () => ({
      categories,
      subcategories,
      tools,
      loading,
      reloadData: loadData,

      addCategory,
      updateCategory,
      deleteCategory,

      addSubcategory,
      updateSubcategory,
      deleteSubcategory,

      addTool,
      updateTool,
      deleteTool,
      toggleToolFavorite,
    }),
    [
      categories,
      subcategories,
      tools,
      loading,
      loadData,
      addCategory,
      updateCategory,
      deleteCategory,
      addSubcategory,
      updateSubcategory,
      deleteSubcategory,
      addTool,
      updateTool,
      deleteTool,
      toggleToolFavorite,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
