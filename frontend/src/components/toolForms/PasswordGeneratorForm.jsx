import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import FormSection from "./shared/FormSection";
import InfoTile from "./shared/InfoTile";
import ActionButton from "./shared/ActionButton";
import ActionRow from "./shared/ActionRow";
import CheckboxOption from "./shared/CheckboxOption";
import {
  generatePassword,
  generatePasswords,
} from "../../core/toolEngines/passwordEngine";
import FormField from "./shared/FormField";
import CopyButton from "./shared/CopyButton";
import StatusBadge from "./shared/StatusBadge";
import StatusMessage from "./shared/StatusMessage";
import ToolFormLayout from "./shared/ToolFormLayout";
import ResultGrid from "./shared/ResultGrid";

const defaultOptions = {
  length: 16,
  includeLowercase: true,
  includeUppercase: true,
  includeNumbers: true,
  includeSpecial: true,
  excludeAmbiguous: false,
};

export default function PasswordGeneratorForm({ compactMode = false }) {
  const [options, setOptions] = useState(defaultOptions);

  const [result, setResult] = useState(null);

  const [bulkPasswords, setBulkPasswords] = useState([]);

  const generate = (nextOptions = options) => {
    try {
      const generated = generatePassword(nextOptions);

      setResult(generated);
    } catch (error) {
      setResult({
        error: error?.message || "Generating the password failed.",
      });
    }
  };

  const generateBulk = (count) => {
    try {
      const passwords = generatePasswords(count, options);

      setBulkPasswords(passwords);
    } catch (error) {
      setResult({
        error: error?.message || "Generating the password failed.",
      });

      setBulkPasswords([]);
    }
  };

  useEffect(() => {
    generate(options);
  }, [options]);

  const updateOption = (key, value) => {
    setOptions((currentOptions) => ({
      ...currentOptions,
      [key]: value,
    }));
  };
  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection title="Generated password" compactMode={compactMode}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto auto",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <FormField
            value={result?.password || ""}
            onChange={() => {}}
            compactMode={compactMode}
            mono
            disabled
          />

          <ActionButton
            onClick={() => generate(options)}
            icon={<RefreshCw size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title="Generate a new password"
          >
            Refresh
          </ActionButton>

          <CopyButton
            value={result?.password || ""}
            label="Copy"
            copiedLabel="Copied"
            compactMode={compactMode}
            variant="primary"
          />
        </div>

        {result?.error && (
          <StatusMessage status="error" compactMode={compactMode}>
            {result.error}
          </StatusMessage>
        )}

        {result?.password && (
          <div
            style={{
              marginTop: "12px",
            }}
          >
            <ResultGrid compactMode={compactMode}>
              <InfoTile
                compactMode={compactMode}
                label="Strength"
                value={
                  <StatusBadge
                    compactMode={compactMode}
                    label={result.strength}
                    status={
                      result.strength === "Strong"
                        ? "success"
                        : result.strength === "Average"
                          ? "warning"
                          : "error"
                    }
                  />
                }
              />

              <InfoTile
                compactMode={compactMode}
                label="Entropy"
                value={`${result.entropy} bits`}
              />

              <InfoTile
                compactMode={compactMode}
                label="AD compatible"
                value={
                  result.adCompatible ? "Likely suitable" : "Check the policy"
                }
                icon={<ShieldCheck size={14} />}
              />
            </ResultGrid>
          </div>
        )}

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={() => generateBulk(5)}
            icon={<RefreshCw size={14} />}
            variant="secondary"
            compactMode={compactMode}
          >
            Generate 5
          </ActionButton>

          <ActionButton
            onClick={() => generateBulk(10)}
            icon={<RefreshCw size={14} />}
            variant="secondary"
            compactMode={compactMode}
          >
            Generate 10
          </ActionButton>

          {bulkPasswords.length > 0 && (
            <CopyButton
              value={bulkPasswords.join("\n")}
              label="Copy as list"
              copiedLabel="Copied"
              compactMode={compactMode}
              variant="secondary"
            />
          )}
        </ActionRow>

        {bulkPasswords.length > 0 && (
          <div
            style={{
              marginTop: "12px",
            }}
          >
            <FormField
              value={bulkPasswords.join("\n")}
              onChange={() => {}}
              compactMode={compactMode}
              mono
              textarea
              rows={Math.min(bulkPasswords.length, 10)}
              disabled
            />
          </div>
        )}
      </FormSection>

      <FormSection
        title="Options"
        description="Decide how the password is composed."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gap: "12px",
          }}
        >
          <FormField
            label="Length"
            type="number"
            value={options.length}
            onChange={(value) => updateOption("length", Number(value))}
            compactMode={compactMode}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
            }}
          >
            <CheckboxOption
              compactMode={compactMode}
              label="Lowercase letters"
              checked={options.includeLowercase}
              onChange={(value) => updateOption("includeLowercase", value)}
            />

            <CheckboxOption
              compactMode={compactMode}
              label="Uppercase letters"
              checked={options.includeUppercase}
              onChange={(value) => updateOption("includeUppercase", value)}
            />

            <CheckboxOption
              compactMode={compactMode}
              label="Digits"
              checked={options.includeNumbers}
              onChange={(value) => updateOption("includeNumbers", value)}
            />

            <CheckboxOption
              compactMode={compactMode}
              label="Special characters"
              checked={options.includeSpecial}
              onChange={(value) => updateOption("includeSpecial", value)}
            />

            <CheckboxOption
              compactMode={compactMode}
              label="Exclude ambiguous characters"
              checked={options.excludeAmbiguous}
              onChange={(value) => updateOption("excludeAmbiguous", value)}
            />
          </div>
        </div>
      </FormSection>
    </ToolFormLayout>
  );
}
