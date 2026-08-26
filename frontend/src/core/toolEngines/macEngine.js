import { api } from "../../services/api";
export function normalizeMacAddress(value = "") {
  const cleaned = String(value)
    .trim()
    .replace(/[^a-fA-F0-9]/g, "")
    .toUpperCase();

  if (!cleaned) {
    return "";
  }

  return cleaned.match(/.{1,2}/g)?.join(":") || "";
}

export function isValidMacAddress(value = "") {
  const raw = String(value).trim();

  if (!raw || !/^[0-9a-fA-F:.-]+$/.test(raw)) {
    return false;
  }

  const cleaned = raw.replace(/[^a-fA-F0-9]/g, "");

  return cleaned.length === 12;
}

export function getOuiPrefix(value = "") {
  const cleaned = String(value)
    .trim()
    .replace(/[^a-fA-F0-9]/g, "")
    .toUpperCase();

  if (cleaned.length < 6) {
    return "Unknown";
  }

  return cleaned
    .slice(0, 6)
    .match(/.{1,2}/g)
    .join(":");
}

function getFirstOctetValue(normalizedMac) {
  return parseInt(normalizedMac.slice(0, 2), 16);
}

export function isMulticastAddress(normalizedMac) {
  if (!normalizedMac) {
    return false;
  }

  return (getFirstOctetValue(normalizedMac) & 0x01) === 1;
}

export function isLocallyAdministeredAddress(normalizedMac) {
  if (!normalizedMac) {
    return false;
  }

  return (getFirstOctetValue(normalizedMac) & 0x02) === 2;
}

const specialMacRanges = [
  {
    prefix: "00:00:5E:00:01",
    name: "VRRP",
    description:
      "Virtual Router Redundancy Protocol (VRRP) virtual gateway address",
  },
  {
    prefix: "00:00:0C:07:AC",
    name: "HSRP",
    description:
      "Cisco Hot Standby Router Protocol (HSRP) virtual gateway address",
  },
];

export function detectSpecialMacRange(normalizedMac) {
  if (!normalizedMac) {
    return null;
  }

  return (
    specialMacRanges.find((range) => normalizedMac.startsWith(range.prefix)) ||
    null
  );
}

const knownOuiVendors = [
  { prefix: "00:50:56", vendor: "VMware, Inc.", category: "VMware VM" },
  { prefix: "00:0C:29", vendor: "VMware, Inc.", category: "VMware VM" },
  {
    prefix: "00:15:5D",
    vendor: "Microsoft Corporation",
    category: "Hyper-V VM",
  },
];

export function lookupLocalVendor(ouiPrefix) {
  return knownOuiVendors.find((entry) => entry.prefix === ouiPrefix) || null;
}

const vendorCategoryRules = [
  { pattern: /ubiquiti/i, category: "UniFi / Ubiquiti device" },
  { pattern: /aruba/i, category: "Aruba (HPE) device" },
  {
    pattern: /cisco/i,
    category: "Cisco device (switch/router/firewall/phone)",
  },
  { pattern: /hewlett[\s-]?packard|\bhpe\b|\bhp\b/i, category: "HP device" },
  { pattern: /vmware/i, category: "VMware VM" },
  { pattern: /microsoft/i, category: "Microsoft / Hyper-V device" },
  {
    pattern:
      /yealink|polycom|\bpoly\b|grandstream|\bsnom\b|\bmitel\b|\bavaya\b/i,
    category: "VoIP handset",
  },
  {
    pattern: /canon|\bbrother\b|\bepson\b|lexmark|\bxerox\b|\bricoh\b|kyocera/i,
    category: "Printer",
  },
  {
    pattern: /fortinet|palo alto|sonicwall|watchguard|\bsophos\b/i,
    category: "Firewall",
  },
  {
    pattern: /juniper|netgear|\bd-link\b|tp-link/i,
    category: "Network device",
  },
];

export function classifyVendorCategory(vendorName) {
  if (!vendorName) {
    return null;
  }

  return (
    vendorCategoryRules.find((rule) => rule.pattern.test(vendorName))
      ?.category || null
  );
}

const vendorCache = new Map();

export async function lookupMacVendor(macAddress) {
  const normalizedMac = normalizeMacAddress(macAddress);

  if (!normalizedMac) {
    throw new Error("No MAC address provided.");
  }

  if (!isValidMacAddress(normalizedMac)) {
    throw new Error("Invalid MAC address.");
  }

  const ouiPrefix = getOuiPrefix(normalizedMac);
  const multicast = isMulticastAddress(normalizedMac);
  const locallyAdministered = isLocallyAdministeredAddress(normalizedMac);
  const specialRange = detectSpecialMacRange(normalizedMac);

  const base = {
    type: "macLookup",
    valid: true,
    macAddress: normalizedMac,
    ouiPrefix,
    multicast,
    locallyAdministered,
    specialRange,
  };

  if (specialRange) {
    return {
      ...base,
      vendor: specialRange.name,
      deviceCategory: specialRange.description,
      vendorSource: "special",
      lookupError: null,
    };
  }

  if (multicast) {
    return {
      ...base,
      vendor: "Not applicable",
      deviceCategory: null,
      vendorSource: "none",
      lookupError:
        "This is a multicast/broadcast address, not a unicast network card.",
    };
  }

  if (locallyAdministered) {
    return {
      ...base,
      vendor: "Not available",
      deviceCategory: null,
      vendorSource: "none",
      lookupError:
        "This MAC address is locally administered (randomly generated or virtual) and does not appear in an IEEE OUI database.",
    };
  }

  const localMatch = lookupLocalVendor(ouiPrefix);

  const cached = vendorCache.get(ouiPrefix);

  if (cached) {
    return {
      ...base,
      ...cached,
      lookupError: null,
    };
  }

  try {
    const response = await api.lookupMac(normalizedMac);

    const resolved = {
      vendor: response.vendor,
      deviceCategory:
        localMatch?.category || classifyVendorCategory(response.vendor),
      vendorSource: "api",
    };

    vendorCache.set(ouiPrefix, resolved);

    return {
      ...base,
      ...resolved,
      lookupError: null,
    };
  } catch {
    if (localMatch) {
      const resolved = {
        vendor: localMatch.vendor,
        deviceCategory: localMatch.category,
        vendorSource: "local",
      };

      vendorCache.set(ouiPrefix, resolved);

      return {
        ...base,
        ...resolved,
        lookupError: null,
      };
    }

    return {
      ...base,
      vendor: "Not found",
      deviceCategory: null,
      vendorSource: "none",
      lookupError: "Vendor lookup failed (external service unreachable).",
    };
  }
}

export async function runMacTool(tool, inputValues) {
  const mac = inputValues.mac || inputValues.input || "";

  return lookupMacVendor(mac);
}
