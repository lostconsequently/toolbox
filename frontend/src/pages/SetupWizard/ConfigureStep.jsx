import { useEffect, useRef, useState } from "react";

import ActionButton from "../../components/toolForms/shared/ActionButton";
import ActionRow from "../../components/toolForms/shared/ActionRow";
import StatusMessage from "../../components/toolForms/shared/StatusMessage";
import ProgressBar from "../../components/shared/ProgressBar";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";

// There is no real-time progress channel from the backend (one atomic
// POST /setup/complete call does everything) - these stages advance on a
// timer purely for visual feedback while that call is in flight, and jump
// straight to 100% once it actually resolves.
const STAGES = [
  { key: "configureStepDatabase", at: 10 },
  { key: "configureStepConfig", at: 45 },
  { key: "configureStepIntegrity", at: 75 },
  { key: "configureStepFinishing", at: 92 },
];

export default function ConfigureStep({ wizardState, onDone }) {
  const { t } = useLanguage();

  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  const timerRef = useRef(null);
  const hasAutoRunRef = useRef(false);

  const run = () => {
    setError("");
    setProgress(0);
    setRunning(true);

    let stageIndex = 0;

    timerRef.current = setInterval(() => {
      if (stageIndex < STAGES.length) {
        setProgress(STAGES[stageIndex].at);
        stageIndex += 1;
      }
    }, 500);

    api
      .completeSetup({
        language: wizardState.language,
        timezone: wizardState.timezone,
        theme: wizardState.theme,
        restoreToken:
          wizardState.method === "restore" ? wizardState.restoreToken : undefined,
        seedOption:
          wizardState.method === "fresh" ? wizardState.seedOption : undefined,
      })
      .then(() => {
        clearInterval(timerRef.current);
        setProgress(100);
        setRunning(false);

        setTimeout(onDone, 400);
      })
      .catch((err) => {
        clearInterval(timerRef.current);
        setRunning(false);
        setError(err.message || t("setupWizard.configureFailed"));
      });
  };

  useEffect(() => {
    // Guards against React StrictMode's dev-only double-invoke of effects
    // (mount -> cleanup -> mount) firing this destructive, non-idempotent
    // call twice on the same page load - completeSetup() is a one-shot
    // action, not safe to fire-and-forget more than once per wizard visit.
    if (hasAutoRunRef.current) return;

    hasAutoRunRef.current = true;
    run();

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStageLabel = STAGES.filter((stage) => stage.at <= progress).pop();

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: "18px", color: "var(--text)" }}>
        {t("setupWizard.configureTitle")}
      </h2>

      <ProgressBar
        progress={progress}
        label={
          currentStageLabel
            ? t(`setupWizard.${currentStageLabel.key}`)
            : undefined
        }
      />

      {error && (
        <>
          <StatusMessage status="error">{error}</StatusMessage>

          <ActionRow justify="center" marginTop="20px">
            <ActionButton variant="primary" onClick={run} disabled={running}>
              {t("setupWizard.tryAgain")}
            </ActionButton>
          </ActionRow>
        </>
      )}
    </div>
  );
}
