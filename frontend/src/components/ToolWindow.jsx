import { useMemo, useState } from "react";
import { Copy, RotateCcw } from "lucide-react";
import { toolRegistry } from "../core/toolRegistry";
import { useSettings } from "../context/SettingsContext";
import { useToolWindows } from "../context/ToolWindowsContext";
import { executeTool } from "../core/utils/executeTool";
import { useLanguage } from "../context/LanguageContext";
import ActionButton from "./toolForms/shared/ActionButton";
import ActionRow from "./toolForms/shared/ActionRow";
import CheckboxOption from "./toolForms/shared/CheckboxOption";
import FormField from "./toolForms/shared/FormField";
import FloatingWindow from "./FloatingWindow";
import Icon from "./Icon";
import ToolResultView from "./ToolResultView";

export default function ToolWindow({
  win,
  isActive,
  onClose,
  onFocus,
  onMinimize,
  onToggleMaximize,
  onUpdate,
}) {
  const { settings } = useSettings();
  const { t } = useLanguage();
  const compactMode = settings?.compactMode || false;

  const { pinItem, unpinItem, isPinned } = useToolWindows();

  const [values, setValues] = useState({});
  const [result, setResult] = useState(null);
  const [step, setStep] = useState("input");
  const [running, setRunning] = useState(false);

  const tool = win.item;
  const toolDefinition = toolRegistry[tool.toolType];
  const CustomForm = toolDefinition?.form;
  const pinned = isPinned("tool", tool.id);

  const inputDefinitions = useMemo(() => {
    if (!tool?.inputTemplate) return [];

    try {
      return JSON.parse(tool.inputTemplate);
    } catch {
      return [];
    }
  }, [tool]);

  const updateValue = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleRun = async () => {
    setRunning(true);

    try {
      const res = await executeTool(tool, values);

      if (res) {
        setResult(res);
        setStep("result");
      }
    } catch (error) {
      setResult(error?.message || t("toolWindows.unknownError"));
      setStep("result");
    } finally {
      setRunning(false);
    }
  };

  const showDescription = tool.description && (CustomForm || step === "input");

  return (
    <FloatingWindow
      win={win}
      isActive={isActive}
      title={tool.name}
      icon={<Icon name={tool.icon || "tool"} size={16} />}
      pinned={pinned}
      onTogglePin={() =>
        pinned ? unpinItem("tool", tool.id) : pinItem("tool", tool)
      }
      onClose={onClose}
      onFocus={onFocus}
      onMinimize={onMinimize}
      onToggleMaximize={onToggleMaximize}
      onUpdate={onUpdate}
    >
      {showDescription && (
        <p style={{ color: "var(--subtle)", marginTop: 0 }}>
          {tool.description}
        </p>
      )}

      {CustomForm ? (
        <CustomForm tool={tool} onClose={onClose} compactMode={compactMode} />
      ) : step === "result" ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => setStep("input")}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "6px 10px",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RotateCcw size={13} /> {t("toolWindows.retry")}
            </button>

            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(
                  typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2),
                )
              }
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "6px 10px",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Copy size={13} /> {t("toolWindows.copy")}
            </button>
          </div>

          <ToolResultView result={result} compactMode={compactMode} />
        </>
      ) : (
        <>
          {inputDefinitions.length > 0 ? (
            inputDefinitions.map((input) => (
              <div key={input.name} style={{ marginBottom: "12px" }}>
                {input.type === "checkbox" ? (
                  <>
                    {input.label && (
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "var(--subtle)",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {input.label}
                      </label>
                    )}

                    <CheckboxOption
                      label={input.placeholder || input.label}
                      checked={Boolean(values[input.name])}
                      onChange={(checked) => updateValue(input.name, checked)}
                      compactMode={compactMode}
                    />
                  </>
                ) : (
                  <FormField
                    label={input.label}
                    value={values[input.name] || ""}
                    onChange={(value) => updateValue(input.name, value)}
                    placeholder={
                      input.placeholder ||
                      (input.name === "header"
                        ? t("toolWindows.pasteMailHeader")
                        : input.label)
                    }
                    type={
                      input.type === "number"
                        ? "number"
                        : input.type === "email"
                          ? "email"
                          : input.type === "url"
                            ? "url"
                            : "text"
                    }
                    textarea={
                      input.type === "textarea" || input.name === "header"
                    }
                    rows={input.name === "header" ? 12 : 6}
                    mono={input.name === "header"}
                    required={Boolean(input.required)}
                    compactMode={compactMode}
                  />
                )}
              </div>
            ))
          ) : (
            <p style={{ color: "var(--subtle)" }}>
              {t("toolWindows.noExtraInput")}
            </p>
          )}

          {tool.config && (
            <pre
              style={{
                background: "var(--surface)",
                color: "var(--subtle)",
                padding: "12px",
                borderRadius: "8px",
                marginTop: "18px",
                whiteSpace: "pre-wrap",
                border: "1px solid var(--border)",
                fontSize: "13px",
              }}
            >
              {tool.config}
            </pre>
          )}

          <ActionRow
            justify="flex-end"
            marginTop="20px"
            compactMode={compactMode}
          >
            <ActionButton
              variant="secondary"
              onClick={onClose}
              compactMode={compactMode}
            >
              {t("common.cancel")}
            </ActionButton>

            <ActionButton
              variant="primary"
              onClick={handleRun}
              disabled={running}
              compactMode={compactMode}
            >
              {running ? t("toolWindows.running") : t("common.run")}
            </ActionButton>
          </ActionRow>
        </>
      )}
    </FloatingWindow>
  );
}
