import { useMemo, useState } from "react";
import { Mail, RotateCcw } from "lucide-react";

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
  buildDmarcRecord,
  dmarcAlignmentModes,
  dmarcFailureOptions,
  dmarcPolicies,
  dmarcSubdomainPolicies,
  getDmarcTagLabel,
  validateReportAddresses,
} from "../../core/toolEngines/dmarcEngine";

const emptyState = {
  domain: "",
  existingRecord: "",
  policy: "none",
  subdomainPolicy: "",
  percentage: "100",
  ruaAddresses: "",
  rufAddresses: "",
  adkim: "r",
  aspf: "r",
  failureOption: "1",
};

const percentageOptions = [
  {
    label: "100 percent",
    value: "100",
  },
  {
    label: "75 percent",
    value: "75",
  },
  {
    label: "50 percent",
    value: "50",
  },
  {
    label: "25 percent",
    value: "25",
  },
  {
    label: "10 percent",
    value: "10",
  },
];

export default function DmarcBuilderForm({ compactMode = false }) {
  const [values, setValues] = useState(emptyState);

  const result = useMemo(() => {
    return buildDmarcRecord(values);
  }, [values]);

  const ruaValidation = useMemo(
    () => validateReportAddresses(values.ruaAddresses),
    [values.ruaAddresses],
  );
  const rufValidation = useMemo(
    () => validateReportAddresses(values.rufAddresses),
    [values.rufAddresses],
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

  const applyM365Preset = () => {
    setValues({
      ...emptyState,
      policy: "none",
      subdomainPolicy: "none",
      adkim: "r",
      aspf: "r",
    });
  };

  const statusText = !result.reportingEnabled
    ? "The DMARC record has no aggregate reporting address yet. Add at least one RUA address to receive reports."
    : result.policy === "none"
      ? "DMARC is in monitoring mode. Analyse the reports after 2-4 weeks. With no false positives you can move to p=quarantine."
      : result.policy === "quarantine"
        ? "DMARC quarantines suspicious mail. After 2-4 weeks without issues you can move to p=reject."
        : "DMARC reject is active. Check the reports regularly for false positives.";

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="DMARC Builder"
        description="Build a new DMARC record or extend an existing one."
        compactMode={compactMode}
      >
        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={applyM365Preset}
            icon={<Mail size={14} />}
            variant="secondary"
            compactMode={compactMode}
          >
            M365 preset
          </ActionButton>
        </ActionRow>

        <FormField
          label="Domain name (for reporting verification)"
          value={values.domain}
          onChange={(value) => updateValue("domain", value)}
          placeholder="example.nl"
          compactMode={compactMode}
        />

        <FormField
          label="Existing DMARC record"
          value={values.existingRecord}
          onChange={(value) => updateValue("existingRecord", value)}
          placeholder="For example v=DMARC1; p=none; rua=mailto:dmarc@example.com;"
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
            label="Policy"
            value={values.policy}
            onChange={(value) => updateValue("policy", value)}
            options={dmarcPolicies}
            compactMode={compactMode}
          />

          <SelectField
            label="Subdomain policy"
            value={values.subdomainPolicy}
            onChange={(value) => updateValue("subdomainPolicy", value)}
            options={dmarcSubdomainPolicies}
            compactMode={compactMode}
          />

          <SelectField
            label="Percentage"
            value={values.percentage}
            onChange={(value) => updateValue("percentage", value)}
            options={percentageOptions}
            compactMode={compactMode}
          />
        </div>
      </FormSection>

      <FormSection
        title="Reporting"
        description="Add one or more reporting addresses. Use one address per line, or separate them with commas."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "10px",
          }}
        >
          <div>
            <FormField
              label="Aggregate reports RUA"
              value={values.ruaAddresses}
              onChange={(value) => updateValue("ruaAddresses", value)}
              placeholder={"dmarc@example.nl\nsecurity@example.nl"}
              compactMode={compactMode}
              textarea
              rows={4}
              mono
            />
            {ruaValidation.invalid.length > 0 && (
              <StatusBadge
                compactMode={compactMode}
                label={`Invalid address: ${ruaValidation.invalid.join(", ")}`}
                status="error"
              />
            )}
          </div>

          <div>
            <FormField
              label="Forensic reports RUF"
              value={values.rufAddresses}
              onChange={(value) => updateValue("rufAddresses", value)}
              placeholder={"forensic@example.nl"}
              compactMode={compactMode}
              textarea
              rows={4}
              mono
            />
            {rufValidation.invalid.length > 0 && (
              <StatusBadge
                compactMode={compactMode}
                label={`Invalid address: ${rufValidation.invalid.join(", ")}`}
                status="error"
              />
            )}
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Alignment"
        description="Decide how strictly SPF and DKIM must align with the From domain."
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
            label="DKIM alignment"
            value={values.adkim}
            onChange={(value) => updateValue("adkim", value)}
            options={dmarcAlignmentModes}
            compactMode={compactMode}
          />

          <SelectField
            label="SPF alignment"
            value={values.aspf}
            onChange={(value) => updateValue("aspf", value)}
            options={dmarcAlignmentModes}
            compactMode={compactMode}
          />

          <SelectField
            label="Failure option"
            value={values.failureOption}
            onChange={(value) => updateValue("failureOption", value)}
            options={dmarcFailureOptions}
            compactMode={compactMode}
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
                label={result.status === "success" ? "Good" : "Note"}
                status={result.status}
              />
            }
          />

          <InfoTile
            compactMode={compactMode}
            label="Policy"
            value={result.policyLabel}
          />

          <InfoTile
            compactMode={compactMode}
            label="Reporting"
            value={result.reportingEnabled ? "Set" : "Not set"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Percentage"
            value={`${result.percentage} percent`}
          />

          <InfoTile
            compactMode={compactMode}
            label="DKIM alignment"
            value={result.adkim}
          />

          <InfoTile
            compactMode={compactMode}
            label="SPF alignment"
            value={result.aspf}
          />

          <InfoTile
            compactMode={compactMode}
            label="Failure option"
            value={result.failureOption}
          />

          <InfoTile
            compactMode={compactMode}
            label="Tags"
            value={String(result.tagCount)}
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

        <StatusMessage status={result.status} compactMode={compactMode}>
          {statusText}
        </StatusMessage>

        <div
          style={{
            marginTop: "12px",
          }}
        >
          <FormField
            label="DMARC record"
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
            label="Copy DMARC"
            copiedLabel="DMARC copied"
            compactMode={compactMode}
            variant="primary"
          />
        </ActionRow>
      </FormSection>

      {result.externalReportTargets.length > 0 && (
        <FormSection
          title="External reporting verification required"
          compactMode={compactMode}
        >
          <StatusMessage status="warning" compactMode={compactMode}>
            One or more reporting addresses point to a domain other than{" "}
            {result.domain || "the policy domain"}. Without the verification
            record below at that domain, Google/Yahoo/Microsoft silently refuse
            to send reports (RFC 7489 §7.1).
          </StatusMessage>

          {result.externalReportTargets.map((target) => (
            <div key={target.reportDomain} style={{ marginTop: "12px" }}>
              <FormField
                label={`Verification record at ${target.reportDomain}`}
                value={`${target.verificationHostname} TXT "${target.verificationValue}"`}
                onChange={() => {}}
                compactMode={compactMode}
                mono
                disabled
              />
            </div>
          ))}
        </FormSection>
      )}

      <FormSection title="Tags" compactMode={compactMode}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "10px",
          }}
        >
          {Object.keys(result.tags).length ? (
            Object.entries(result.tags).map(([key, value]) => (
              <InfoTile
                compactMode={compactMode}
                key={key}
                label={getDmarcTagLabel(key)}
                value={`${key}=${value}`}
              />
            ))
          ) : (
            <InfoTile
              compactMode={compactMode}
              label="No tags"
              value="Nothing added yet"
            />
          )}
        </div>
      </FormSection>
    </ToolFormLayout>
  );
}
