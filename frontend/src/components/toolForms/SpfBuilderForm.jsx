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
  buildSpfRecord,
  getMechanismType,
  m365SpfSubIncludes,
  spfPolicies,
  spfPresets,
  validateIp4Entries,
  validateIp6Entries,
} from "../../core/toolEngines/spfEngine";

const emptyState = {
  existingRecord: "",
  includeDomains: "",
  ip4Addresses: "",
  ip6Addresses: "",
  aDomains: "",
  mxDomains: "",
  existsDomains: "",
  redirectDomain: "",
  preset: "",
  policy: "-all",
};

const presetOptions = [
  {
    label: "No preset",
    value: "",
  },
  ...spfPresets,
];

export default function SpfBuilderForm({ compactMode = false }) {
  const [values, setValues] = useState(emptyState);

  const result = useMemo(() => {
    return buildSpfRecord(values);
  }, [values]);

  const ip4Validation = useMemo(
    () => validateIp4Entries(values.ip4Addresses),
    [values.ip4Addresses],
  );
  const ip6Validation = useMemo(
    () => validateIp6Entries(values.ip6Addresses),
    [values.ip6Addresses],
  );

  const updateValue = (key, value) => {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  };

  const reset = () => {
    setValues(emptyState);
  };

  const statusText =
    (result.lookupStatus === "error"
      ? "The SPF record uses 10 or more DNS lookups. This can cause problems."
      : result.lookupStatus === "warning"
        ? "The SPF record is close to the DNS lookup limit."
        : "The SPF record looks normal.") +
    " This is a lower bound: only visible top-level mechanisms are counted; nested lookups inside an include (e.g. Microsoft 365, Google Workspace) are not.";

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="SPF Builder"
        description="Build a new SPF record or extend an existing one."
        compactMode={compactMode}
      >
        <FormField
          label="Existing SPF record"
          value={values.existingRecord}
          onChange={(value) => updateValue("existingRecord", value)}
          placeholder="For example v=spf1 include:spf.protection.outlook.com -all"
          compactMode={compactMode}
          textarea
          rows={4}
          mono
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "10px",
            marginTop: "12px",
          }}
        >
          <SelectField
            label="Preset"
            value={values.preset}
            onChange={(value) => updateValue("preset", value)}
            options={presetOptions}
            compactMode={compactMode}
          />

          <SelectField
            label="Policy"
            value={values.policy}
            onChange={(value) => updateValue("policy", value)}
            options={spfPolicies}
            compactMode={compactMode}
          />
        </div>
      </FormSection>

      <FormSection
        title="Add"
        description="Add an include, IP or domain to the SPF record."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "10px",
          }}
        >
          <FormField
            label="Include domains"
            value={values.includeDomains}
            onChange={(value) => updateValue("includeDomains", value)}
            placeholder={"sendgrid.net\nservers.mcsv.net"}
            compactMode={compactMode}
            textarea
            rows={4}
            mono
          />

          <div>
            <FormField
              label="IPv4 addresses"
              value={values.ip4Addresses}
              onChange={(value) => updateValue("ip4Addresses", value)}
              placeholder={"203.0.113.10\n198.51.100.25"}
              compactMode={compactMode}
              textarea
              rows={4}
              mono
            />
            {ip4Validation.invalid.length > 0 && (
              <StatusBadge
                compactMode={compactMode}
                label={`Invalid address: ${ip4Validation.invalid.join(", ")}`}
                status="error"
              />
            )}
          </div>

          <div>
            <FormField
              label="IPv6 addresses"
              value={values.ip6Addresses}
              onChange={(value) => updateValue("ip6Addresses", value)}
              placeholder={"2001:db8::1\n2001:db8::2"}
              compactMode={compactMode}
              textarea
              rows={4}
              mono
            />
            {ip6Validation.invalid.length > 0 && (
              <StatusBadge
                compactMode={compactMode}
                label={`Invalid address: ${ip6Validation.invalid.join(", ")}`}
                status="error"
              />
            )}
          </div>

          <FormField
            label="A record domains"
            value={values.aDomains}
            onChange={(value) => updateValue("aDomains", value)}
            placeholder={"mail.example.nl\nsmtp.example.nl"}
            compactMode={compactMode}
            textarea
            rows={4}
            mono
          />

          <FormField
            label="MX domains"
            value={values.mxDomains}
            onChange={(value) => updateValue("mxDomains", value)}
            placeholder={"example.nl\nmail.example.nl"}
            compactMode={compactMode}
            textarea
            rows={4}
            mono
          />

          <FormField
            label="Exists domains"
            value={values.existsDomains}
            onChange={(value) => updateValue("existsDomains", value)}
            placeholder={"%{i}._spf.mailspf.net"}
            compactMode={compactMode}
            textarea
            rows={4}
            mono
          />

          <FormField
            label="Redirect domain"
            value={values.redirectDomain}
            onChange={(value) => updateValue("redirectDomain", value)}
            placeholder={"example.nl"}
            compactMode={compactMode}
            textarea
            rows={2}
            mono
          />
        </div>

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
                label={
                  result.lookupStatus === "error"
                    ? "Too many lookups"
                    : result.lookupStatus === "warning"
                      ? "Note"
                      : "Good"
                }
                status={result.lookupStatus}
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="DNS lookups (lower bound)"
            value={`${result.lookupCount}/10`}
          />

          <InfoTile
            compactMode={compactMode}
            label="Policy"
            value={result.policy}
          />

          <InfoTile
            compactMode={compactMode}
            label="Mechanisms"
            value={String(result.mechanisms.length)}
          />

          <InfoTile
            compactMode={compactMode}
            label="DNS length"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={`${result.dnsLength} chars`}
                status={result.lengthStatus}
              />
            }
          />
        </ResultGrid>

        <StatusMessage status={result.lookupStatus} compactMode={compactMode}>
          {statusText}
        </StatusMessage>

        <div
          style={{
            marginTop: "12px",
          }}
        >
          <FormField
            label="SPF record"
            value={result.record}
            onChange={() => {}}
            compactMode={compactMode}
            textarea
            rows={3}
            mono
            disabled
          />
        </div>

        <ActionRow compactMode={compactMode}>
          <CopyButton
            value={result.record}
            label="Copy SPF"
            copiedLabel="SPF copied"
            compactMode={compactMode}
            variant="primary"
          />

          {result.dnsLength > 255 && (
            <CopyButton
              value={result.chunkedRecord}
              label="Copy split (publish-ready)"
              copiedLabel="Split record copied"
              compactMode={compactMode}
              variant="secondary"
            />
          )}
        </ActionRow>
      </FormSection>

      {result.hasRedirect && (
        <FormSection title="Redirect" compactMode={compactMode}>
          <StatusMessage status="neutral" compactMode={compactMode}>
            The SPF record contains a redirect mechanism, so the policy (all)
            was left out: RFC 7208 evaluates mechanisms left to right and "all"
            always matches, so an explicit all policy next to a redirect would
            stop that redirect ever being reached. The redirect's target domain
            determines the final policy.
          </StatusMessage>
        </FormSection>
      )}

      {result.hasM365Include && (
        <FormSection title="Microsoft 365 SPF detail" compactMode={compactMode}>
          <StatusMessage status="neutral" compactMode={compactMode}>
            include:spf.protection.outlook.com pulls in nested includes that
            count towards the 10-lookup limit:
          </StatusMessage>
          <ResultGrid compactMode={compactMode}>
            {m365SpfSubIncludes.map((domain) => (
              <InfoTile
                compactMode={compactMode}
                key={domain}
                label="Sub-include"
                value={domain}
              />
            ))}
          </ResultGrid>
        </FormSection>
      )}

      <FormSection title="Mechanisms" compactMode={compactMode}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "10px",
          }}
        >
          {result.mechanisms.length ? (
            result.mechanisms.map((mechanism) => (
              <InfoTile
                compactMode={compactMode}
                key={mechanism}
                label={getMechanismType(mechanism)}
                value={mechanism}
              />
            ))
          ) : (
            <InfoTile
              compactMode={compactMode}
              label="No mechanisms"
              value="Nothing added yet"
            />
          )}
        </div>
      </FormSection>
    </ToolFormLayout>
  );
}
