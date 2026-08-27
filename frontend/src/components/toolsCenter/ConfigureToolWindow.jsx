import { useState } from "react";
import FloatingWindow from "../FloatingWindow";
import Icon from "../Icon";
import ToolFormPanel from "../../pages/Tools/ToolFormPanel";
import { useApp } from "../../context/AppContext";
import { useSettings } from "../../context/SettingsContext";
import { useLanguage } from "../../context/LanguageContext";

export default function ConfigureToolWindow({
  win,
  isActive,
  onClose,
  onFocus,
  onMinimize,
  onToggleMaximize,
  onUpdate,
}) {
  const { categories, subcategories, tools, updateTool } = useApp();
  const { settings } = useSettings();
  const { t } = useLanguage();

  const compactMode = settings?.compactMode || false;

  const [error, setError] = useState("");

  const tool = tools.find((t) => t.id === win.item.id) || win.item;

  const handleSubmit = async (formData) => {
    setError("");

    try {
      await updateTool(tool.id, {
        ...formData,
        favorite: tool.favorite || false,
        sortOrder: tool.sortOrder || 0,
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError(t("toolsCenter.configureError", { name: tool.name }));
    }
  };

  return (
    <FloatingWindow
      win={win}
      isActive={isActive}
      title={t("toolsCenter.actionConfigureTitle", { name: tool.name })}
      icon={<Icon name={tool.icon || "tool"} size={16} />}
      showPin={false}
      onClose={onClose}
      onFocus={onFocus}
      onMinimize={onMinimize}
      onToggleMaximize={onToggleMaximize}
      onUpdate={onUpdate}
    >
      <ToolFormPanel
        editingTool={tool}
        categories={categories}
        subcategories={subcategories}
        compactMode={compactMode}
        error={error}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </FloatingWindow>
  );
}
