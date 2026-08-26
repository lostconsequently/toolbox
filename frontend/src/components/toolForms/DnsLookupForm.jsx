import { useState } from "react";
import { CheckSquare, Plus, RotateCcw, Search, Square, X } from "lucide-react";

import FormSection from "./shared/FormSection";
import FormField from "./shared/FormField";
import SelectField from "./shared/SelectField";
import CheckboxOption from "./shared/CheckboxOption";
import ActionButton from "./shared/ActionButton";
import ToolFormLayout from "./shared/ToolFormLayout";
import ResultGrid from "./shared/ResultGrid";
import InfoTile from "./shared/InfoTile";
import StatusBadge from "./shared/StatusBadge";
import StatusMessage from "./shared/StatusMessage";
import ActionRow from "./shared/ActionRow";
import CopyButton from "./shared/CopyButton";

import {
  dnsLookupDefaultTypes,
  dnsLookupM365Preset,
  dnsLookupRecordTypes,
  dnsLookupResolvers,
  isValidCustomRecordType,
  lookupDnsRecords,
  normalizeDnsLookupName,
} from "../../core/toolEngines/dnsLookupEngine";

export default function DnsLookupForm({ compactMode = false }) {
  const [name, setName] = useState("");
  const [selectedTypes, setSelectedTypes] = useState(dnsLookupDefaultTypes);
  const [customTypes, setCustomTypes] = useState([]);
  const [customTypeInput, setCustomTypeInput] = useState("");
  const [resolverId, setResolverId] = useState("backend");
  const [expectedValues, setExpectedValues] = useState({});
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(
    "Enter a domain or hostname and select record types.",
  );

  const normalizedName = normalizeDnsLookupName(name);

  const allTypes = [...selectedTypes, ...customTypes];

  const toggleType = (type, checked) => {
    setSelectedTypes((previous) =>
      checked ? [...previous, type] : previous.filter((item) => item !== type),
    );
  };

  const addCustomType = () => {
    const type = customTypeInput.trim().toUpperCase();

    if (!isValidCustomRecordType(type)) {
      setStatus("Invalid record type. Use letters only, max 10 characters.");
      return;
    }

    if (allTypes.includes(type)) {
      setCustomTypeInput("");
      return;
    }

    setCustomTypes((previous) => [...previous, type]);
    setCustomTypeInput("");
  };

  const removeCustomType = (type) => {
    setCustomTypes((previous) => previous.filter((item) => item !== type));
    setExpectedValues((previous) => {
      const next = { ...previous };
      delete next[type];
      return next;
    });
  };

  const setExpectedValue = (type, value) => {
    setExpectedValues((previous) => ({ ...previous, [type]: value }));
  };

  const runLookup = async () => {
    if (!normalizedName) {
      setResult(null);
      setStatus("Enter a domain or hostname.");
      return;
    }

    if (!allTypes.length) {
      setResult(null);
      setStatus("Select at least one record type.");
      return;
    }

    try {
      setStatus("Fetching DNS records.");

      const lookupResult = await lookupDnsRecords(
        normalizedName,
        allTypes,
        expectedValues,
        resolverId,
      );

      setResult(lookupResult);
      setStatus(
        `${lookupResult.foundCount}/${lookupResult.checkedCount} record types found.`,
      );
    } catch (error) {
      setResult(null);
      setStatus(error?.message || "DNS lookup failed.");
    }
  };

  const reset = () => {
    setName("");
    setSelectedTypes(dnsLookupDefaultTypes);
    setCustomTypes([]);
    setCustomTypeInput("");
    setResolverId("backend");
    setExpectedValues({});
    setResult(null);
    setStatus("Enter a domain or hostname and select record types.");
  };

  const selectAll = () => {
    setSelectedTypes(dnsLookupRecordTypes.map((type) => type.value));
  };

  const selectNone = () => {
    setSelectedTypes([]);
  };

  const applyM365Preset = () => {
    setSelectedTypes(dnsLookupM365Preset);
  };

  const allJson = result ? JSON.stringify(result, null, 2) : "";

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="DNS Lookup"
        description="Check several DNS record types at once for a domain or hostname."
        compactMode={compactMode}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 220px",
            gap: "10px",
          }}
        >
          <FormField
            label="Domain or hostname"
            value={name}
            onChange={setName}
            placeholder="For example example.com"
            compactMode={compactMode}
            mono
          />

          <SelectField
            label="Resolver"
            value={resolverId}
            onChange={setResolverId}
            options={dnsLookupResolvers}
            compactMode={compactMode}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
            gap: compactMode ? "6px" : "8px",
            marginTop: "10px",
          }}
        >
          {dnsLookupRecordTypes.map((type) => (
            <CheckboxOption
              key={type.value}
              label={type.label}
              checked={selectedTypes.includes(type.value)}
              onChange={(checked) => toggleType(type.value, checked)}
              compactMode={compactMode}
            />
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "10px",
            alignItems: "end",
            marginTop: "10px",
          }}
        >
          <FormField
            label="Add a custom record type"
            value={customTypeInput}
            onChange={setCustomTypeInput}
            placeholder="For example DS or NAPTR"
            compactMode={compactMode}
            mono
          />

          <ActionButton
            onClick={addCustomType}
            icon={<Plus size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title="Add record type"
          >
            Add
          </ActionButton>
        </div>

        {customTypes.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "8px",
            }}
          >
            {customTypes.map((type) => (
              <span
                key={type}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 8px",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  fontSize: "12px",
                  color: "var(--text)",
                }}
              >
                {type}
                <button
                  type="button"
                  onClick={() => removeCustomType(type)}
                  title={`Delete ${type}`}
                  style={{
                    display: "inline-flex",
                    background: "none",
                    border: "none",
                    color: "var(--subtle)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={selectAll}
            icon={<CheckSquare size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title="Select all record types"
          >
            Select all
          </ActionButton>

          <ActionButton
            onClick={selectNone}
            icon={<Square size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title="Clear selection"
          >
            Clear selection
          </ActionButton>

          <ActionButton
            onClick={applyM365Preset}
            variant="secondary"
            compactMode={compactMode}
            title="Select MX, TXT and CNAME for a Microsoft 365 check"
          >
            M365 preset
          </ActionButton>
        </ActionRow>

        {allTypes.length > 0 && (
          <FormSection
            title="Expected values (optional)"
            description="Enter an expected value per record type to compare against."
            compactMode={compactMode}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "10px",
              }}
            >
              {allTypes.map((type) => (
                <FormField
                  key={type}
                  label={type}
                  value={expectedValues[type] || ""}
                  onChange={(value) => setExpectedValue(type, value)}
                  placeholder="Optional"
                  compactMode={compactMode}
                  mono
                />
              ))}
            </div>
          </FormSection>
        )}

        <ActionRow compactMode={compactMode}>
          <ActionButton
            onClick={runLookup}
            icon={<Search size={14} />}
            variant="primary"
            compactMode={compactMode}
            title="Check DNS records"
          >
            Check
          </ActionButton>

          <ActionButton
            onClick={reset}
            icon={<RotateCcw size={14} />}
            variant="secondary"
            compactMode={compactMode}
            title="Clear form"
          >
            Clear
          </ActionButton>
        </ActionRow>

        <StatusMessage status="neutral" compactMode={compactMode}>
          {status}
        </StatusMessage>
      </FormSection>

      {result && (
        <FormSection title="Summary" compactMode={compactMode}>
          <ResultGrid compactMode={compactMode}>
            <InfoTile
              compactMode={compactMode}
              label="Domain"
              value={result.name}
            />

            <InfoTile
              compactMode={compactMode}
              label="Checked"
              value={`${result.checkedCount} record types`}
            />

            <InfoTile
              compactMode={compactMode}
              label="Found"
              value={`${result.foundCount} record types`}
            />

            <InfoTile
              compactMode={compactMode}
              label="Missing"
              value={`${result.missingCount} record types`}
            />

            <InfoTile
              compactMode={compactMode}
              label="Status"
              value={
                <StatusBadge
                  compactMode={compactMode}
                  label={
                    result.status === "success"
                      ? "Complete"
                      : result.status === "warning"
                        ? "Note"
                        : "Not found"
                  }
                  status={result.status}
                />
              }
            />
          </ResultGrid>

          <ActionRow compactMode={compactMode}>
            <CopyButton
              value={allJson}
              label="Copy all (JSON)"
              copiedLabel="Copied"
              compactMode={compactMode}
              variant="primary"
            />
          </ActionRow>
        </FormSection>
      )}

      {result?.results.map((record) => (
        <FormSection
          key={record.type}
          title={record.type}
          compactMode={compactMode}
        >
          <ResultGrid compactMode={compactMode}>
            <InfoTile
              compactMode={compactMode}
              label="Status"
              value={
                <StatusBadge
                  compactMode={compactMode}
                  label={
                    record.status === "found"
                      ? "Found"
                      : record.status === "timeout"
                        ? "Timeout"
                        : "Not found"
                  }
                  status={
                    record.status === "found"
                      ? "success"
                      : record.status === "timeout"
                        ? "warning"
                        : "error"
                  }
                />
              }
            />

            <InfoTile
              compactMode={compactMode}
              label="Count"
              value={String(record.count)}
            />

            <InfoTile
              compactMode={compactMode}
              label="TTL"
              value={record.ttl !== null ? `${record.ttl}s` : "Not found"}
            />

            {record.matchesExpected !== null &&
              record.matchesExpected !== undefined && (
                <InfoTile
                  compactMode={compactMode}
                  label="Expected value"
                  value={
                    <StatusBadge
                      compactMode={compactMode}
                      label={record.matchesExpected ? "Match" : "Mismatch"}
                      status={record.matchesExpected ? "success" : "warning"}
                    />
                  }
                />
              )}

            <InfoTile
              compactMode={compactMode}
              label="Values"
              value={
                record.values.length ? record.values.join("\n") : "No records"
              }
            />
          </ResultGrid>

          <ActionRow compactMode={compactMode}>
            <CopyButton
              value={record.values.join("\n")}
              label={`Copy ${record.type}`}
              copiedLabel="Copied"
              compactMode={compactMode}
              variant="secondary"
            />
          </ActionRow>
        </FormSection>
      ))}
    </ToolFormLayout>
  );
}
