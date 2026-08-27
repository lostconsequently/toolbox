import { useState } from "react";
import { Check } from "lucide-react";

import { useLanguage } from "../../context/LanguageContext";

import WelcomeStep from "./WelcomeStep";
import MethodStep from "./MethodStep";
import BasicSettingsStep from "./BasicSettingsStep";
import SummaryStep from "./SummaryStep";
import ConfigureStep from "./ConfigureStep";
import DoneStep from "./DoneStep";

const TOTAL_STEPS = 6;

export default function SetupWizard() {
  const { t } = useLanguage();

  const [step, setStep] = useState(1);

  const [wizardState, setWizardState] = useState({
    method: null, // "fresh" | "restore"
    seedOption: null, // "empty" | "categories" | "categoriesAndTools"
    restoreToken: null,
    restoreInfo: null, // { sizeBytes, modifiedAt }
    language: "en",
    timezone: "UTC",
    theme: "dark",
  });

  const patchState = (patch) =>
    setWizardState((prev) => ({ ...prev, ...patch }));

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const stepLabels = [
    t("setupWizard.stepWelcome"),
    t("setupWizard.stepMethod"),
    t("setupWizard.stepSettings"),
    t("setupWizard.stepSummary"),
    t("setupWizard.stepConfigure"),
    t("setupWizard.stepDone"),
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "32px 28px",
          boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "28px",
            flexWrap: "wrap",
          }}
        >
          {stepLabels.map((label, index) => {
            const stepNumber = index + 1;
            const isDone = stepNumber < step;
            const isActive = stepNumber === step;

            return (
              <div
                key={label}
                title={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "700",
                    background: isDone || isActive ? "var(--primary)" : "var(--surface)",
                    color: isDone || isActive ? "#ffffff" : "var(--subtle)",
                    border: isActive
                      ? "2px solid var(--primary)"
                      : "1px solid var(--border)",
                  }}
                >
                  {isDone ? <Check size={13} /> : stepNumber}
                </div>

                {stepNumber < TOTAL_STEPS && (
                  <div
                    style={{
                      width: "16px",
                      height: "2px",
                      background: isDone ? "var(--primary)" : "var(--border)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {step === 1 && <WelcomeStep onNext={goNext} />}

        {step === 2 && (
          <MethodStep
            wizardState={wizardState}
            patchState={patchState}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 3 && (
          <BasicSettingsStep
            wizardState={wizardState}
            patchState={patchState}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 4 && (
          <SummaryStep
            wizardState={wizardState}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === 5 && (
          <ConfigureStep wizardState={wizardState} onDone={goNext} />
        )}

        {step === 6 && <DoneStep wizardState={wizardState} />}
      </div>
    </div>
  );
}
