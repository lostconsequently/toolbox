import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import FormSection from "./shared/FormSection";
import FormField from "./shared/FormField";
import SelectField from "./shared/SelectField";
import ActionButton from "./shared/ActionButton";
import ToolFormLayout from "./shared/ToolFormLayout";
import ResultGrid from "./shared/ResultGrid";
import InfoTile from "./shared/InfoTile";
import StatusBadge from "./shared/StatusBadge";
import StatusMessage from "./shared/StatusMessage";
import ActionRow from "./shared/ActionRow";
import CopyButton from "./shared/CopyButton";
import CheckboxOption from "./shared/CheckboxOption";

import {
  charsetOptions,
  generateSecret,
  generateSecrets,
  getSecretStrength,
  secretPresets,
} from "../../core/toolEngines/secretEngine";

function escapeEnvValue(value = "") {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const presetOptions = secretPresets.map((preset) => ({
  label: preset.label,
  value: preset.label,
}));

export default function SecretGeneratorForm({ compactMode = false }) {
  const [preset, setPreset] = useState("JWT Secret");

  const [length, setLength] = useState(64);

  const [secret, setSecret] = useState(generateSecret(64));
  const [error, setError] = useState("");

  const [useUppercase, setUseUppercase] = useState(true);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSpecial, setUseSpecial] = useState(true);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");

  const selectedPreset = secretPresets.find((item) => item.label === preset);

  const charOptions = {
    uppercase: useUppercase,
    lowercase: useLowercase,
    numbers: useNumbers,
    special: useSpecial,
    prefix,
    suffix,
  };

  const effectiveCharset =
    (useUppercase ? charsetOptions.uppercase.length : 0) +
    (useLowercase ? charsetOptions.lowercase.length : 0) +
    (useNumbers ? charsetOptions.numbers.length : 0) +
    (useSpecial ? charsetOptions.special.length : 0);
  const bits = length * Math.log2(Math.max(effectiveCharset, 1));

  const strength = getSecretStrength(length);

  useEffect(() => {
    try {
      setSecret(generateSecret(length, charOptions));
      setError("");
    } catch (err) {
      setError(err?.message || "Generating the secret failed.");
    }
  }, [
    length,
    useUppercase,
    useLowercase,
    useNumbers,
    useSpecial,
    prefix,
    suffix,
  ]);

  const handlePresetChange = (value) => {
    setPreset(value);

    const selected = secretPresets.find((item) => item.label === value);

    if (selected) {
      setLength(selected.recommendedLength);
      setUseUppercase(true);
      setUseLowercase(true);
      setUseNumbers(true);
      setUseSpecial(true);
      setPrefix("");
      setSuffix("");
    }
  };

  const generate = (count = 1) => {
    const options = {
      uppercase: useUppercase,
      lowercase: useLowercase,
      numbers: useNumbers,
      special: useSpecial,
      prefix,
      suffix,
    };

    try {
      if (count > 1) {
        setSecret(generateSecrets(count, length, options).join("\n"));
      } else {
        setSecret(generateSecret(length, options));
      }
      setError("");
    } catch (err) {
      setError(err?.message || "Generating the secret failed.");
    }
  };

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Secret Generator"
        description="Generate cryptographic secrets for applications, APIs and sessions."
        compactMode={compactMode}
      >
        <SelectField
          label="Type"
          value={preset}
          onChange={handlePresetChange}
          options={presetOptions}
          compactMode={compactMode}
        />

        <div
          style={{
            marginTop: "12px",
          }}
        >
          <FormField
            label="Length"
            value={String(length)}
            onChange={(value) => {
              setLength(Math.max(8, Math.min(256, Number(value) || 64)));
            }}
            compactMode={compactMode}
            mono
          />
        </div>

        <StatusMessage status="neutral" compactMode={compactMode}>
          {selectedPreset?.description}
          {" • Recommended length: "}
          {selectedPreset?.recommendedLength}
        </StatusMessage>

        {error && (
          <StatusMessage status="error" compactMode={compactMode}>
            {error}
          </StatusMessage>
        )}
      </FormSection>

      <FormSection
        title="Options"
        description="Choose which characters are used."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "flex",
            gap: compactMode ? "10px" : "14px",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              key: "useUppercase",
              label: "Uppercase letters",
              state: useUppercase,
              set: setUseUppercase,
            },
            {
              key: "useLowercase",
              label: "Lowercase letters",
              state: useLowercase,
              set: setUseLowercase,
            },
            {
              key: "useNumbers",
              label: "Digits",
              state: useNumbers,
              set: setUseNumbers,
            },
            {
              key: "useSpecial",
              label: "Special characters",
              state: useSpecial,
              set: setUseSpecial,
            },
          ].map(({ key, label, state, set }) => (
            <CheckboxOption
              key={key}
              label={label}
              checked={state}
              onChange={(value) => set(value)}
              compactMode={compactMode}
            />
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
            marginTop: "12px",
          }}
        >
          <FormField
            label="Prefix"
            value={prefix}
            onChange={setPrefix}
            placeholder="sk-"
            compactMode={compactMode}
            mono
          />

          <FormField
            label="Suffix"
            value={suffix}
            onChange={setSuffix}
            placeholder="-v1"
            compactMode={compactMode}
            mono
          />
        </div>
      </FormSection>

      <FormSection title="Result" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile compactMode={compactMode} label="Type" value={preset} />

          <InfoTile
            compactMode={compactMode}
            label="Length"
            value={`${length} characters`}
          />

          <InfoTile
            compactMode={compactMode}
            label="Strength"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={strength.label}
                status={strength.status}
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Entropy"
            value={`~${Math.round(bits)} bits`}
          />

          <InfoTile
            compactMode={compactMode}
            label="Recommended"
            value={`${selectedPreset?.recommendedLength ?? 64} characters`}
          />
        </ResultGrid>

        <div
          style={{
            marginTop: "12px",
          }}
        >
          <FormField
            label="Secret"
            value={secret}
            onChange={() => {}}
            compactMode={compactMode}
            textarea
            rows={4}
            mono
            disabled
          />
        </div>

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={() => generate()}
            icon={<RefreshCw size={14} />}
            variant="primary"
            compactMode={compactMode}
          >
            Generate
          </ActionButton>

          <ActionButton
            onClick={() => generate(5)}
            icon={<RefreshCw size={14} />}
            variant="secondary"
            compactMode={compactMode}
          >
            Generate 5
          </ActionButton>

          <ActionButton
            onClick={() => generate(10)}
            icon={<RefreshCw size={14} />}
            variant="secondary"
            compactMode={compactMode}
          >
            Generate 10
          </ActionButton>

          <CopyButton
            value={secret}
            label="Copy secret"
            copiedLabel="Secret copied"
            compactMode={compactMode}
            variant="secondary"
          />

          <CopyButton
            value={`SECRET_KEY="${escapeEnvValue(secret)}"`}
            label="Copy as .env"
            copiedLabel=".env copied"
            compactMode={compactMode}
            variant="secondary"
          />
        </ActionRow>
      </FormSection>
    </ToolFormLayout>
  );
}
