import { useMemo, useState } from "react";

import FormSection from "./shared/FormSection";
import FormField from "./shared/FormField";
import SelectField from "./shared/SelectField";
import ToolFormLayout from "./shared/ToolFormLayout";
import ResultGrid from "./shared/ResultGrid";
import InfoTile from "./shared/InfoTile";
import StatusBadge from "./shared/StatusBadge";
import StatusMessage from "./shared/StatusMessage";
import ActionRow from "./shared/ActionRow";

import {
  calculateSubnet,
  cidrOptions,
} from "../../core/toolEngines/subnetEngine";

const options = cidrOptions.map((item) => ({
  label: item,
  value: item,
}));

export default function SubnetCalculatorForm({ compactMode = false }) {
  const [ip, setIp] = useState("192.168.1.10");

  const [cidr, setCidr] = useState("/24");

  const calcResult = useMemo(() => {
    try {
      return calculateSubnet(ip, cidr);
    } catch {
      return null;
    }
  }, [ip, cidr]);

  return (
    <ToolFormLayout compactMode={compactMode}>
      <FormSection
        title="Subnet Calculator"
        description="Calculate subnet information for IPv4 networks."
        compactMode={compactMode}
      >
        <FormField
          label="IP address"
          value={ip}
          onChange={setIp}
          compactMode={compactMode}
          mono
        />

        <SelectField
          label="CIDR"
          value={cidr}
          onChange={setCidr}
          options={options}
          compactMode={compactMode}
        />
      </FormSection>

      <FormSection title="Result" compactMode={compactMode}>
        <ResultGrid compactMode={compactMode}>
          <InfoTile
            compactMode={compactMode}
            label="Subnet Mask"
            value={calcResult?.subnetMask || "-"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Wildcard Mask"
            value={calcResult?.wildcardMask || "-"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Network"
            value={calcResult?.networkAddress || "-"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Broadcast"
            value={calcResult?.broadcastAddress || "-"}
          />

          <InfoTile
            compactMode={compactMode}
            label="First host"
            value={calcResult?.firstHost || "-"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Last host"
            value={calcResult?.lastHost || "-"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Hosts"
            value={calcResult?.hostCount ?? "-"}
          />

          <InfoTile
            compactMode={compactMode}
            label="Type"
            value={
              <StatusBadge
                compactMode={compactMode}
                label={calcResult?.isRfc1918 ? "Private (RFC1918)" : "Public"}
                status={calcResult?.isRfc1918 ? "success" : "warning"}
              />
            }
          />
        </ResultGrid>

        <ActionRow compactMode={compactMode}>
          <StatusMessage
            status={calcResult ? "success" : "error"}
            compactMode={compactMode}
          >
            {calcResult ? "Calculation complete." : "Invalid IP address."}
          </StatusMessage>
        </ActionRow>
      </FormSection>
    </ToolFormLayout>
  );
}
