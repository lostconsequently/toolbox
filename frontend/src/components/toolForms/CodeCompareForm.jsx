import { useEffect, useMemo, useRef, useState } from "react";
import { GitCompare, ArrowLeftRight, X } from "lucide-react";

import FormSection from "./shared/FormSection";
import SelectField from "./shared/SelectField";
import ActionButton from "./shared/ActionButton";
import ActionRow from "./shared/ActionRow";
import CheckboxOption from "./shared/CheckboxOption";
import ToolFormLayout from "./shared/ToolFormLayout";
import StatusMessage from "./shared/StatusMessage";
import StatusBadge from "./shared/StatusBadge";
import CopyButton from "./shared/CopyButton";
import ViewModeToggle from "../shared/ViewModeToggle";

import { useLanguage } from "../../context/LanguageContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  CODE_COMPARE_LANGUAGES,
  LARGE_INPUT_CHAR_THRESHOLD,
  compareText,
  formatDiffAsText,
} from "../../core/toolEngines/codeCompareEngine";

const DEBOUNCE_MS = 250;
const EMPTY_TEXT = { original: "", modified: "" };

const ROW_STYLES = {
  unchanged: { background: "transparent", borderColor: "transparent" },
  added: {
    background: "color-mix(in srgb, var(--status-success) 14%, transparent)",
    borderColor: "var(--status-success)",
  },
  removed: {
    background: "color-mix(in srgb, var(--status-error) 14%, transparent)",
    borderColor: "var(--status-error)",
  },
  changed: {
    background: "color-mix(in srgb, var(--status-warning) 14%, transparent)",
    borderColor: "var(--status-warning)",
  },
};

const ROW_MARKERS = { unchanged: " ", added: "+", removed: "-", changed: "~" };

function splitDisplayLines(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function LineNumberedEditor({
  label,
  value,
  onChange,
  onScroll,
  textareaRef,
  gutterRef,
  placeholder,
  ariaLabel,
  compactMode,
}) {
  const lineCount = Math.max(1, splitDisplayLines(value).length);
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount],
  );

  const fontSize = compactMode ? "12px" : "13px";

  return (
    <div style={{ minWidth: 0 }}>
      <label
        style={{
          display: "block",
          marginBottom: "6px",
          color: "var(--subtle)",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        {label}
      </label>

      <div
        style={{
          display: "flex",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          background: "var(--surface)",
          overflow: "hidden",
          height: compactMode ? "220px" : "280px",
        }}
      >
        <div
          ref={gutterRef}
          aria-hidden="true"
          style={{
            overflow: "hidden",
            flexShrink: 0,
            padding: "10px 8px",
            textAlign: "right",
            color: "var(--subtle)",
            borderRight: "1px solid var(--border)",
            userSelect: "none",
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: "var(--mono, monospace)",
              fontSize,
              lineHeight: 1.5,
            }}
          >
            {lineNumbers}
          </pre>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={onScroll}
          placeholder={placeholder}
          aria-label={ariaLabel}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          style={{
            flex: 1,
            minWidth: 0,
            resize: "none",
            border: "none",
            outline: "none",
            padding: "10px",
            background: "transparent",
            color: "var(--text)",
            fontFamily: "var(--mono, monospace)",
            fontSize,
            lineHeight: 1.5,
            whiteSpace: "pre",
            overflowWrap: "normal",
          }}
        />
      </div>
    </div>
  );
}

function DiffLine({
  lineNumber,
  content,
  marker,
  style,
  compactMode,
  isPlaceholder,
}) {
  return (
    <div
      style={{
        display: "flex",
        borderLeft: `3px solid ${style.borderColor}`,
        background: style.background,
        fontFamily: "var(--mono, monospace)",
        fontSize: compactMode ? "12px" : "13px",
        lineHeight: 1.6,
        minHeight: compactMode ? "20px" : "22px",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: "44px",
          textAlign: "right",
          padding: "0 8px",
          color: "var(--subtle)",
          userSelect: "none",
        }}
      >
        {lineNumber ?? ""}
      </span>

      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: "16px",
          textAlign: "center",
          color: "var(--subtle)",
          userSelect: "none",
        }}
      >
        {marker}
      </span>

      <span
        style={{
          flex: 1,
          minWidth: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: isPlaceholder ? "transparent" : "var(--text)",
          padding: "0 8px 0 0",
        }}
      >
        {isPlaceholder ? " " : content}
      </span>
    </div>
  );
}

export default function CodeCompareForm({ compactMode = false }) {
  const { t } = useLanguage();

  const [originalText, setOriginalText] = useState("");
  const [modifiedText, setModifiedText] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [viewMode, setViewMode] = useState("sideBySide");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreEmptyLines, setIgnoreEmptyLines] = useState(false);

  const [compareInputs, setCompareInputs] = useState(EMPTY_TEXT);

  const originalTextareaRef = useRef(null);
  const originalGutterRef = useRef(null);
  const modifiedTextareaRef = useRef(null);
  const modifiedGutterRef = useRef(null);

  const debouncedOriginal = useDebouncedValue(originalText, DEBOUNCE_MS);
  const debouncedModified = useDebouncedValue(modifiedText, DEBOUNCE_MS);

  const isLargeInput =
    originalText.length + modifiedText.length > LARGE_INPUT_CHAR_THRESHOLD;

  useEffect(() => {
    if (!isLargeInput) {
      setCompareInputs({
        original: debouncedOriginal,
        modified: debouncedModified,
      });
    }
  }, [debouncedOriginal, debouncedModified, isLargeInput]);

  const pendingManualCompare =
    isLargeInput &&
    (compareInputs.original !== originalText ||
      compareInputs.modified !== modifiedText);

  const diffResult = useMemo(() => {
    try {
      return compareText(compareInputs.original, compareInputs.modified, {
        ignoreWhitespace,
        ignoreCase,
        ignoreEmptyLines,
      });
    } catch (error) {
      console.error("Code Compare failed:", error);

      return {
        status: "error",
        rows: [],
        stats: { added: 0, removed: 0, changed: 0 },
        identical: false,
        originalLineCount: 0,
        modifiedLineCount: 0,
      };
    }
  }, [compareInputs, ignoreWhitespace, ignoreCase, ignoreEmptyLines]);

  const resultText = useMemo(
    () => formatDiffAsText(diffResult.rows),
    [diffResult.rows],
  );

  const handleCompare = () => {
    setCompareInputs({ original: originalText, modified: modifiedText });
  };

  const handleSwap = () => {
    setOriginalText(modifiedText);
    setModifiedText(originalText);
    setCompareInputs({ original: modifiedText, modified: originalText });
  };

  const handleClear = () => {
    setOriginalText("");
    setModifiedText("");
    setCompareInputs(EMPTY_TEXT);
  };

  const syncScroll = (sourceTextarea, targets) => {
    const top = sourceTextarea.scrollTop;

    for (const target of targets) {
      if (target.current && target.current.scrollTop !== top) {
        target.current.scrollTop = top;
      }
    }
  };

  const handleOriginalScroll = (event) => {
    syncScroll(event.target, [
      originalGutterRef,
      modifiedTextareaRef,
      modifiedGutterRef,
    ]);
  };

  const handleModifiedScroll = (event) => {
    syncScroll(event.target, [
      modifiedGutterRef,
      originalTextareaRef,
      originalGutterRef,
    ]);
  };

  const languageOptions = CODE_COMPARE_LANGUAGES.map((value) => ({
    value,
    label: t(`codeCompare.languages.${value}`),
  }));

  const viewModeLabels = {
    sideBySide: t("codeCompare.viewModeSideBySide"),
    inline: t("codeCompare.viewModeInline"),
  };

  const statusText = (() => {
    if (pendingManualCompare) return t("codeCompare.largeInputWarning");
    if (diffResult.status === "empty") return t("codeCompare.statusEmpty");
    if (diffResult.status === "tooLarge")
      return t("codeCompare.statusTooLarge");
    if (diffResult.status === "error") return t("codeCompare.statusError");
    if (diffResult.identical) return t("codeCompare.statusIdentical");

    return t("codeCompare.statusDifferences", {
      count: String(
        diffResult.stats.added +
          diffResult.stats.removed +
          diffResult.stats.changed,
      ),
      added: String(diffResult.stats.added),
      removed: String(diffResult.stats.removed),
      changed: String(diffResult.stats.changed),
    });
  })();

  const statusVariant = (() => {
    if (pendingManualCompare) return "warning";
    if (diffResult.status === "tooLarge" || diffResult.status === "error") {
      return "error";
    }
    if (diffResult.status === "empty") return "neutral";

    return diffResult.identical ? "success" : "warning";
  })();

  const showRows =
    !pendingManualCompare &&
    diffResult.status === "success" &&
    diffResult.rows.length > 0;

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title={t("codeCompare.title")}
        description={t("codeCompare.description")}
        compactMode={compactMode}
      >
        <div style={{ marginBottom: "12px", maxWidth: "320px" }}>
          <SelectField
            label={t("codeCompare.languageLabel")}
            value={language}
            onChange={setLanguage}
            options={languageOptions}
            compactMode={compactMode}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "12px",
          }}
        >
          <LineNumberedEditor
            label={t("codeCompare.originalLabel")}
            value={originalText}
            onChange={setOriginalText}
            onScroll={handleOriginalScroll}
            textareaRef={originalTextareaRef}
            gutterRef={originalGutterRef}
            placeholder={t("codeCompare.originalPlaceholder")}
            ariaLabel={t("codeCompare.originalAriaLabel")}
            compactMode={compactMode}
          />

          <LineNumberedEditor
            label={t("codeCompare.modifiedLabel")}
            value={modifiedText}
            onChange={setModifiedText}
            onScroll={handleModifiedScroll}
            textareaRef={modifiedTextareaRef}
            gutterRef={modifiedGutterRef}
            placeholder={t("codeCompare.modifiedPlaceholder")}
            ariaLabel={t("codeCompare.modifiedAriaLabel")}
            compactMode={compactMode}
          />
        </div>

        {isLargeInput && (
          <StatusMessage status="warning" compactMode={compactMode}>
            {t("codeCompare.largeInputWarning")}
          </StatusMessage>
        )}

        <FormSection
          title={t("codeCompare.optionsTitle")}
          compactMode={compactMode}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: compactMode ? "10px" : "14px",
            }}
          >
            <CheckboxOption
              label={t("codeCompare.ignoreWhitespace")}
              checked={ignoreWhitespace}
              onChange={setIgnoreWhitespace}
              compactMode={compactMode}
            />

            <CheckboxOption
              label={t("codeCompare.ignoreCase")}
              checked={ignoreCase}
              onChange={setIgnoreCase}
              compactMode={compactMode}
            />

            <CheckboxOption
              label={t("codeCompare.ignoreEmptyLines")}
              checked={ignoreEmptyLines}
              onChange={setIgnoreEmptyLines}
              compactMode={compactMode}
            />
          </div>
        </FormSection>

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={handleCompare}
            icon={<GitCompare size={14} />}
            variant="primary"
            compactMode={compactMode}
            disabled={!originalText && !modifiedText}
          >
            {t("codeCompare.actionCompare")}
          </ActionButton>

          <ActionButton
            onClick={handleSwap}
            icon={<ArrowLeftRight size={14} />}
            variant="secondary"
            compactMode={compactMode}
            disabled={!originalText && !modifiedText}
            title={t("codeCompare.actionSwapTitle")}
          >
            {t("codeCompare.actionSwap")}
          </ActionButton>

          <ActionButton
            onClick={handleClear}
            icon={<X size={14} />}
            variant="secondary"
            compactMode={compactMode}
            disabled={!originalText && !modifiedText}
            title={t("codeCompare.actionClearTitle")}
          >
            {t("codeCompare.actionClear")}
          </ActionButton>
        </ActionRow>
      </FormSection>

      <FormSection
        title={t("codeCompare.resultTitle")}
        compactMode={compactMode}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <ViewModeToggle
            value={viewMode}
            onChange={setViewMode}
            options={["sideBySide", "inline"]}
            labels={viewModeLabels}
            compactMode={compactMode}
          />

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <StatusBadge
              label={`${t("codeCompare.legendAdded")}: ${diffResult.stats.added}`}
              status="success"
              compactMode={compactMode}
            />
            <StatusBadge
              label={`${t("codeCompare.legendRemoved")}: ${diffResult.stats.removed}`}
              status="error"
              compactMode={compactMode}
            />
            <StatusBadge
              label={`${t("codeCompare.legendChanged")}: ${diffResult.stats.changed}`}
              status="warning"
              compactMode={compactMode}
            />
          </div>
        </div>

        <StatusMessage status={statusVariant} compactMode={compactMode}>
          {statusText}
        </StatusMessage>

        {showRows && (
          <div
            role="region"
            aria-label={t("codeCompare.resultTitle")}
            style={{
              marginTop: "12px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              overflow: "auto",
              maxHeight: "480px",
              background: "var(--surface)",
            }}
          >
            {viewMode === "sideBySide"
              ? diffResult.rows.map((row, index) => (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(260px, 1fr))",
                    }}
                  >
                    <DiffLine
                      lineNumber={row.originalLineNumber}
                      content={row.originalLine}
                      marker={
                        row.originalLine === null ? " " : ROW_MARKERS[row.type]
                      }
                      style={
                        row.originalLine === null
                          ? ROW_STYLES.unchanged
                          : ROW_STYLES[row.type]
                      }
                      compactMode={compactMode}
                      isPlaceholder={row.originalLine === null}
                    />

                    <DiffLine
                      lineNumber={row.modifiedLineNumber}
                      content={row.modifiedLine}
                      marker={
                        row.modifiedLine === null ? " " : ROW_MARKERS[row.type]
                      }
                      style={
                        row.modifiedLine === null
                          ? ROW_STYLES.unchanged
                          : ROW_STYLES[row.type]
                      }
                      compactMode={compactMode}
                      isPlaceholder={row.modifiedLine === null}
                    />
                  </div>
                ))
              : diffResult.rows.map((row, index) => {
                  if (row.type === "changed") {
                    return (
                      <div key={index}>
                        <DiffLine
                          lineNumber={row.originalLineNumber}
                          content={row.originalLine}
                          marker={ROW_MARKERS.changed}
                          style={ROW_STYLES.changed}
                          compactMode={compactMode}
                        />
                        <DiffLine
                          lineNumber={row.modifiedLineNumber}
                          content={row.modifiedLine}
                          marker={ROW_MARKERS.changed}
                          style={ROW_STYLES.changed}
                          compactMode={compactMode}
                        />
                      </div>
                    );
                  }

                  const isRemoved = row.type === "removed";

                  return (
                    <DiffLine
                      key={index}
                      lineNumber={
                        isRemoved
                          ? row.originalLineNumber
                          : row.modifiedLineNumber
                      }
                      content={isRemoved ? row.originalLine : row.modifiedLine}
                      marker={ROW_MARKERS[row.type]}
                      style={ROW_STYLES[row.type]}
                      compactMode={compactMode}
                    />
                  );
                })}
          </div>
        )}

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={resultText}
            label={t("codeCompare.actionCopyResult")}
            copiedLabel={t("codeCompare.copiedResult")}
            failedLabel={t("codeCompare.copyFailed")}
            compactMode={compactMode}
            variant="primary"
          />
        </ActionRow>
      </FormSection>
    </ToolFormLayout>
  );
}
