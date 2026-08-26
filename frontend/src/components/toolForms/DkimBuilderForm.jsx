import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

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

import {
  buildDkimRecord,
  dkimAlgorithmOptions,
  dkimKeyTypeOptions,
  dkimProviders,
  getDkimProvider,
} from "../../core/toolEngines/dkimEngine";

const emptyState = {
  provider: "m365",
  domain: "",
  initialDomain: "",
  selector: "",
  publicKey: "",
  algorithm: "",
  keyType: "rsa",
};

const statusLabels = {
  success: "Complete",
  warning: "Incomplete",
  error: "Invalid",
};

export default function DkimBuilderForm({ compactMode = false }) {
  const [values, setValues] = useState(emptyState);

  const selectedProvider = getDkimProvider(values.provider);

  const result = useMemo(() => buildDkimRecord(values), [values]);

  const updateValue = (key, value) => {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  };

  const reset = () => setValues({ ...emptyState, provider: values.provider });

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="DKIM Builder"
        description="Generate DKIM DNS records for Microsoft 365 and other mail providers. Nothing is changed in DNS; the records are only built and shown."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "10px",
          }}
        >
          <SelectField
            label="Provider"
            value={values.provider}
            onChange={(value) => updateValue("provider", value)}
            options={dkimProviders}
            compactMode={compactMode}
          />

          <FormField
            label="Domain name"
            value={values.domain}
            onChange={(value) => updateValue("domain", value)}
            placeholder="For example example.com"
            compactMode={compactMode}
            mono
          />

          {selectedProvider.mode === "m365" && (
            <FormField
              label="Initial domain (onmicrosoft.com)"
              value={values.initialDomain}
              onChange={(value) => updateValue("initialDomain", value)}
              placeholder="For example contoso or contoso.onmicrosoft.com"
              compactMode={compactMode}
              mono
            />
          )}

          {selectedProvider.mode !== "m365" && (
            <FormField
              label="Selector"
              value={values.selector}
              onChange={(value) => updateValue("selector", value)}
              placeholder={selectedProvider.defaultSelector || "selector"}
              compactMode={compactMode}
              mono
            />
          )}
        </div>

        {selectedProvider.mode === "custom" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
              marginTop: "12px",
            }}
          >
            <SelectField
              label="Key type"
              value={values.keyType}
              onChange={(value) => updateValue("keyType", value)}
              options={dkimKeyTypeOptions}
              compactMode={compactMode}
            />

            <SelectField
              label="Algorithm (hash restriction)"
              value={values.algorithm}
              onChange={(value) => updateValue("algorithm", value)}
              options={dkimAlgorithmOptions}
              compactMode={compactMode}
            />
          </div>
        )}

        {selectedProvider.mode !== "m365" && (
          <div style={{ marginTop: "12px" }}>
            <FormField
              label="Public key"
              value={values.publicKey}
              onChange={(value) => updateValue("publicKey", value)}
              placeholder="Paste the base64 public key here (with or without -----BEGIN PUBLIC KEY----- headers)"
              compactMode={compactMode}
              mono
              textarea
              rows={4}
            />
          </div>
        )}

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={reset}
            icon={<RotateCcw size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title="Clear fields"
          >
            Clear
          </ActionButton>
        </ActionRow>

        {result.notes.length > 0 && (
          <div style={{ marginTop: "10px" }}>
            <ResultGrid compactMode={compactMode}>
              {result.notes.map((note, index) => (
                <InfoTile
                  compactMode={compactMode}
                  key={`${note.label}-${index}`}
                  label={note.label}
                  value={note.text}
                />
              ))}
            </ResultGrid>
          </div>
        )}
      </FormSection>

      <FormSection title="Summary" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Status"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={statusLabels[result.status] || "Unknown"}
                status={result.status}
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Provider"
            value={result.provider}
          />

          <InfoTile
            compactMode={compactMode}
            label="Domain"
            value={result.domain || "Not filled in"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Record count"
            value={String(result.records.length)}
          />
        </ResultGrid>

        {result.warnings.map((warning, index) => (
          <StatusMessage
            key={`${warning}-${index}`}
            status={result.status}
            compactMode={compactMode}
          >
            {warning}
          </StatusMessage>
        ))}

        {result.records.length > 0 && (
          <ActionRow compactMode={compactMode}>
            <CopyButton
              value={result.combinedRecordText}
              label="Copy all records"
              copiedLabel="Records copied"
              compactMode={compactMode}
              variant="primary"
            />
          </ActionRow>
        )}
      </FormSection>

      {result.records.map((record) => (
        <FormSection
          key={record.selector}
          title={`DKIM record - ${record.selector}`}
          compactMode={compactMode}
        >
          <ResultGrid compactMode={compactMode}>
            <InfoTile
              compactMode={compactMode}
              label="Selector"
              value={record.selector}
            />

            <InfoTile
              compactMode={compactMode}
              label="Record type"
              value={record.type}
            />

            <InfoTile
              compactMode={compactMode}
              label="DKIM hostname"
              value={record.hostname}
            />

            <InfoTile
              compactMode={compactMode}
              label="Length"
              value={
                <StatusBadge
                  compactMode={compactMode}
                  label={`${record.length} characters`}
                  status={record.lengthStatus}
                />
              }
            />
          </ResultGrid>

          <div style={{ marginTop: "12px" }}>
            <FormField
              label="Record value"
              value={record.value}
              onChange={() => {}}
              compactMode={compactMode}
              mono
              textarea
              rows={3}
              disabled
            />
          </div>

          <ActionRow compactMode={compactMode}>
            <CopyButton
              value={record.hostname}
              label="Copy host"
              copiedLabel="Host copied"
              compactMode={compactMode}
              variant="secondary"
            />

            <CopyButton
              value={record.value}
              label="Copy value"
              copiedLabel="Value copied"
              compactMode={compactMode}
              variant="secondary"
            />

            <CopyButton
              value={record.fullRecord}
              label="Copy full record"
              copiedLabel="Record copied"
              compactMode={compactMode}
              variant="primary"
            />
          </ActionRow>
        </FormSection>
      ))}
    </ToolFormLayout>
  );
}
