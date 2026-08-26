import { useMemo, useState } from "react";
import { Printer, RotateCcw, ShieldCheck } from "lucide-react";

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
  buildSmtpConfiguration,
  mfdBrands,
  smtpAuthMethods,
  smtpAuthenticationOptions,
  smtpProviders,
  smtpSecurityOptions,
} from "../../core/toolEngines/smtpConfigurationEngine";

const emptyState = {
  provider: "m365-auth",
  domain: "",
  region: "eu-west-1",
  customHost: "",
  customPort: "587",
  customSecurity: "STARTTLS",
  customAuthentication: "Yes",
  customUsername: "",
  customPassword: "",
  mfdMode: false,
  mfdBrand: "",
  authMethod: "basic",
};

export default function SmtpConfigurationBuilderForm({ compactMode = false }) {
  const [values, setValues] = useState(emptyState);

  const result = useMemo(() => {
    return buildSmtpConfiguration(values);
  }, [values]);

  const selectedProvider =
    smtpProviders.find((provider) => provider.value === values.provider) ||
    smtpProviders[0];

  const updateValue = (key, value) => {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  };

  const reset = () => {
    setValues(emptyState);
  };

  const statusText = result.host
    ? "The SMTP configuration has been built."
    : "Fill in the missing details to complete the SMTP configuration.";

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="SMTP Configuration Builder"
        description="Choose an SMTP preset and generate the server, port, security and authentication settings."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "10px",
          }}
        >
          <SelectField
            label="Provider"
            value={values.provider}
            onChange={(value) => updateValue("provider", value)}
            options={smtpProviders}
            compactMode={compactMode}
          />

          {selectedProvider.requiresDomain && (
            <FormField
              label="Domain name"
              value={values.domain}
              onChange={(value) => updateValue("domain", value)}
              placeholder="For example google.com"
              compactMode={compactMode}
              mono
            />
          )}

          {selectedProvider.requiresRegion && (
            <FormField
              label="Amazon SES region"
              value={values.region}
              onChange={(value) => updateValue("region", value)}
              placeholder="For example eu-west-1"
              compactMode={compactMode}
              mono
            />
          )}
        </div>

        {selectedProvider.supportsOAuth2 && (
          <div
            style={{
              marginTop: "12px",
            }}
          >
            <SelectField
              label="Authentication method"
              value={values.authMethod}
              onChange={(value) => updateValue("authMethod", value)}
              options={smtpAuthMethods}
              compactMode={compactMode}
            />
          </div>
        )}

        <div
          style={{
            marginTop: "10px",
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              fontSize: compactMode ? "12px" : "13px",
              color: values.mfdMode ? "var(--text)" : "var(--subtle)",
            }}
          >
            <input
              type="checkbox"
              checked={values.mfdMode}
              onChange={(e) => updateValue("mfdMode", e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <Printer size={14} />
            Printer / scanner mode
          </label>
          {values.mfdMode && (
            <div
              style={{
                marginTop: "10px",
              }}
            >
              <SelectField
                label="Brand"
                value={values.mfdBrand}
                onChange={(value) => updateValue("mfdBrand", value)}
                options={mfdBrands}
                compactMode={compactMode}
              />
            </div>
          )}
        </div>

        {selectedProvider.custom && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
              marginTop: "12px",
            }}
          >
            <div>
              <FormField
                label="SMTP server"
                value={values.customHost}
                onChange={(value) => updateValue("customHost", value)}
                placeholder="smtp.example.nl"
                compactMode={compactMode}
                mono
              />
              {result.hostWarning && (
                <StatusBadge
                  compactMode={compactMode}
                  label={result.hostWarning}
                  status="error"
                />
              )}
            </div>

            <div>
              <FormField
                label="Port"
                value={values.customPort}
                onChange={(value) => updateValue("customPort", value)}
                placeholder="587"
                compactMode={compactMode}
                mono
              />
              {result.portWarning && (
                <StatusBadge
                  compactMode={compactMode}
                  label={result.portWarning}
                  status="error"
                />
              )}
            </div>

            <SelectField
              label="Security"
              value={values.customSecurity}
              onChange={(value) => updateValue("customSecurity", value)}
              options={smtpSecurityOptions}
              compactMode={compactMode}
            />

            <SelectField
              label="Authentication"
              value={values.customAuthentication}
              onChange={(value) => updateValue("customAuthentication", value)}
              options={smtpAuthenticationOptions}
              compactMode={compactMode}
            />

            <FormField
              label="Username"
              value={values.customUsername}
              onChange={(value) => updateValue("customUsername", value)}
              placeholder="smtp-user@example.nl"
              compactMode={compactMode}
              mono
            />

            <FormField
              label="Password description"
              value={values.customPassword}
              onChange={(value) => updateValue("customPassword", value)}
              placeholder="For example an app password or SMTP key"
              compactMode={compactMode}
              mono
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
      </FormSection>

      <FormSection title="Result" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Status"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={result.status === "success" ? "Complete" : "Incomplete"}
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
            label="SMTP server"
            value={result.host || "Not set"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Port"
            value={result.portDisplay || result.port || "Not set"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Security"
            value={
              result.portOptions?.length > 1
                ? result.portOptions
                    .map((opt) => `${opt.port}: ${opt.security}`)
                    .join(" · ")
                : result.security || "Not set"
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Authentication"
            value={result.authentication || "Not set"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Username"
            value={result.username || "Not set"}
          />

          {result.mxEndpoint && (
            <InfoTile
              compactMode={compactMode}
              label="MX endpoint"
              value={result.mxEndpoint}
            />
          )}
          {result.spfInclude && (
            <InfoTile
              compactMode={compactMode}
              label="SPF include"
              value={
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <ShieldCheck size={14} />
                  {result.spfInclude}
                </div>
              }
            />
          )}
          {result.mfdApplied && (
            <InfoTile
              compactMode={compactMode}
              label="Mode"
              value={
                <StatusBadge
                  compactMode={compactMode}
                  label="Printer / scanner"
                  status="warning"
                />
              }
            />
          )}
        </ResultGrid>

        <StatusMessage status={result.status} compactMode={compactMode}>
          {statusText}
        </StatusMessage>

        <div
          style={{
            marginTop: "12px",
          }}
        >
          <FormField
            label="SMTP configuration"
            value={result.plainText}
            onChange={() => {}}
            compactMode={compactMode}
            textarea
            rows={7}
            mono
            disabled
          />
        </div>

        {result.mfdConfigText && (
          <div
            style={{
              marginTop: "12px",
            }}
          >
            <FormField
              label="Printer configuration"
              value={result.mfdConfigText}
              onChange={() => {}}
              compactMode={compactMode}
              textarea
              rows={12}
              mono
              disabled
            />
          </div>
        )}

        {result.oauth2ConfigText && (
          <div
            style={{
              marginTop: "12px",
            }}
          >
            <FormField
              label="OAuth 2.0 configuration"
              value={result.oauth2ConfigText}
              onChange={() => {}}
              compactMode={compactMode}
              textarea
              rows={16}
              mono
              disabled
            />
          </div>
        )}

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={result.host}
            label="Copy SMTP server"
            copiedLabel="SMTP server copied"
            compactMode={compactMode}
            variant="primary"
          />

          {result.spfInclude && (
            <CopyButton
              value={result.spfInclude}
              label="Copy SPF"
              copiedLabel="SPF copied"
              compactMode={compactMode}
              variant="secondary"
            />
          )}

          <CopyButton
            value={result.plainText}
            label="Copy configuration"
            copiedLabel="Configuration copied"
            compactMode={compactMode}
            variant="secondary"
          />

          {result.mfdConfigText && (
            <CopyButton
              value={result.mfdConfigText}
              label="Copy printer config"
              copiedLabel="Printer config copied"
              compactMode={compactMode}
              variant="secondary"
            />
          )}

          {result.oauth2ConfigText && (
            <CopyButton
              value={result.oauth2ConfigText}
              label="Copy OAuth2 steps"
              copiedLabel="OAuth2 steps copied"
              compactMode={compactMode}
              variant="secondary"
            />
          )}
        </ActionRow>
      </FormSection>

      {result.notes.length > 0 && (
        <FormSection title="Notes" compactMode={compactMode}>
          <ResultGrid compactMode={compactMode}>
            {result.notes.map((note, index) => (
              <InfoTile
                compactMode={compactMode}
                key={`${note.label}-${index}`}
                label={note.label || `Note ${index + 1}`}
                value={note.text || note}
              />
            ))}
          </ResultGrid>
        </FormSection>
      )}
    </ToolFormLayout>
  );
}
