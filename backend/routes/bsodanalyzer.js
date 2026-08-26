const express = require("express");

const { createRateLimiter } = require("../utils/rateLimiter");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

// Real minidumps are typically 256KB-2MB; a full kernel dump is much larger
// than anything this text/heuristic-based analyzer is designed to handle
// usefully. 20MB comfortably covers minidumps with headroom, without
// inviting multi-hundred-MB uploads that make the redundant full-buffer
// string operations below expensive.
const maxFileSize = "20mb";

function splitInterestingLines(lines = []) {
  return {
    errors: lines.filter((line) => line.includes("[ERROR]")),

    infos: lines.filter((line) => line.includes("[INFO]")),

    other: lines.filter(
      (line) => !line.includes("[ERROR]") && !line.includes("[INFO]"),
    ),
  };
}

const knownStopCodes = [
  {
    code: "IRQL_NOT_LESS_OR_EQUAL",
    hex: "0x0000000A",
    category: "Driver or memory",
    advice:
      "Check recent driver updates, network drivers, storage drivers and RAM.",
  },
  {
    code: "DRIVER_IRQL_NOT_LESS_OR_EQUAL",
    hex: "0x000000D1",
    category: "Driver",
    advice: "Check the named driver and update or roll it back.",
  },
  {
    code: "PAGE_FAULT_IN_NONPAGED_AREA",
    hex: "0x00000050",
    category: "Memory or driver",
    advice: "Check RAM, drivers, antivirus and recently installed software.",
  },
  {
    code: "SYSTEM_THREAD_EXCEPTION_NOT_HANDLED",
    hex: "0x0000007E",
    category: "Driver",
    advice: "Focus on drivers named around the crash.",
  },
  {
    code: "KMODE_EXCEPTION_NOT_HANDLED",
    hex: "0x0000001E",
    category: "Driver or kernel-mode fault",
    advice: "Check drivers, firmware and recently changed software.",
  },
  {
    code: "DRIVER_POWER_STATE_FAILURE",
    hex: "0x0000009F",
    category: "Power management or driver",
    advice: "Check chipset, network, storage and power management drivers.",
  },
  {
    code: "CRITICAL_PROCESS_DIED",
    hex: "0x000000EF",
    category: "Windows system process",
    advice: "Check system files, storage health and recent updates.",
  },
  {
    code: "UNEXPECTED_STORE_EXCEPTION",
    hex: "0x0000012B",
    category: "Storage",
    advice: "Check the SSD, storage controller, firmware and SMART data.",
  },
  {
    code: "MEMORY_MANAGEMENT",
    hex: "0x0000001A",
    category: "Memory",
    advice: "Run a memory test and check drivers that use memory.",
  },
  {
    code: "DPC_WATCHDOG_VIOLATION",
    hex: "0x00000133",
    category: "Storage or driver",
    advice: "Check storage drivers, SSD firmware and chipset drivers.",
  },
  {
    code: "WHEA_UNCORRECTABLE_ERROR",
    hex: "0x00000124",
    category: "Hardware",
    advice:
      "Check the CPU, RAM, power supply, overclock settings and hardware health.",
  },
  {
    code: "SYSTEM_SERVICE_EXCEPTION",
    hex: "0x0000003B",
    category: "Driver or system call",
    advice:
      "Check recent driver and Windows updates, especially graphics and security drivers.",
  },
  {
    code: "BAD_POOL_HEADER",
    hex: "0x00000019",
    category: "Memory or driver",
    advice:
      "Often caused by a driver corrupting kernel pool memory. Check recently changed drivers.",
  },
  {
    code: "BAD_POOL_CALLER",
    hex: "0x000000C2",
    category: "Driver",
    advice:
      "Check recently installed or updated drivers that access memory incorrectly.",
  },
  {
    code: "KERNEL_SECURITY_CHECK_FAILURE",
    hex: "0x00000139",
    category: "Kernel protection or driver",
    advice:
      "Check drivers and possible memory corruption; may also indicate a hardware fault.",
  },
  {
    code: "KERNEL_DATA_INPAGE_ERROR",
    hex: "0x0000007A",
    category: "Storage or memory",
    advice: "Check disk health (SMART), cables/SSD firmware and RAM.",
  },
  {
    code: "NTFS_FILE_SYSTEM",
    hex: "0x00000024",
    category: "File system or storage",
    advice: "Run chkdsk and check disk health.",
  },
  {
    code: "INACCESSIBLE_BOOT_DEVICE",
    hex: "0x0000007B",
    category: "Storage or driver",
    advice:
      "Check storage controller drivers and BIOS/UEFI SATA/NVMe settings; often occurs after a storage driver change.",
  },
  {
    code: "VIDEO_TDR_FAILURE",
    hex: "0x00000116",
    category: "Video driver",
    advice:
      "Check and update the video driver; may also indicate GPU overheating.",
  },
  {
    code: "CLOCK_WATCHDOG_TIMEOUT",
    hex: "0x00000101",
    category: "CPU or hardware",
    advice:
      "Check CPU cooling, BIOS/UEFI firmware updates and overclock settings.",
  },
  {
    code: "ATTEMPTED_WRITE_TO_READONLY_MEMORY",
    hex: "0x000000BE",
    category: "Driver",
    advice: "Check recently changed drivers that write to read-only memory.",
  },
  {
    code: "PFN_LIST_CORRUPT",
    hex: "0x0000004E",
    category: "Memory",
    advice: "Run a memory test; often indicates faulty RAM.",
  },
];

const bsodLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

const knownDrivers = {
  "nvlddmkm.sys": {
    vendor: "NVIDIA",
    description: "NVIDIA video driver",
    category: "Video driver",
  },
  "amdkmdag.sys": {
    vendor: "AMD",
    description: "AMD video driver",
    category: "Video driver",
  },
  "atikmdag.sys": {
    vendor: "AMD",
    description: "AMD ATI video driver",
    category: "Video driver",
  },
  "igdkmd64.sys": {
    vendor: "Intel",
    description: "Intel graphics driver",
    category: "Video driver",
  },
  "rtwlane.sys": {
    vendor: "Realtek",
    description: "Realtek wireless driver",
    category: "Network driver",
  },
  "rt640x64.sys": {
    vendor: "Realtek",
    description: "Realtek network driver",
    category: "Network driver",
  },
  "e1d68x64.sys": {
    vendor: "Intel",
    description: "Intel network driver",
    category: "Network driver",
  },
  "netwtw10.sys": {
    vendor: "Intel",
    description: "Intel wireless driver",
    category: "Network driver",
  },
  "ndis.sys": {
    vendor: "Microsoft",
    description: "Windows network stack",
    category: "Network stack",
  },
  "tcpip.sys": {
    vendor: "Microsoft",
    description: "Windows TCP/IP stack",
    category: "Network stack",
  },
  "iastor.sys": {
    vendor: "Intel",
    description: "Intel storage driver",
    category: "Storage driver",
  },
  "iastora.sys": {
    vendor: "Intel",
    description: "Intel Rapid Storage driver",
    category: "Storage driver",
  },
  "storport.sys": {
    vendor: "Microsoft",
    description: "Windows storage port driver",
    category: "Storage stack",
  },
  "stornvme.sys": {
    vendor: "Microsoft",
    description: "Windows NVMe storage driver",
    category: "Storage stack",
  },
  "acpi.sys": {
    vendor: "Microsoft",
    description: "Windows ACPI driver",
    category: "Power management",
  },
  "ntoskrnl.exe": {
    vendor: "Microsoft",
    description: "Windows kernel",
    category: "Kernel",
  },
  "hal.dll": {
    vendor: "Microsoft",
    description: "Hardware Abstraction Layer",
    category: "Kernel",
  },

  "fortifilter.sys": {
    vendor: "Fortinet",
    description: "Fortinet endpoint driver",
    category: "Security",
  },

  "fortips.sys": {
    vendor: "Fortinet",
    description: "Fortinet IPS driver",
    category: "Security",
  },

  "sentrybay.sys": {
    vendor: "ThreatLocker",
    description: "ThreatLocker driver",
    category: "Application Control",
  },

  "crowdstrike.sys": {
    vendor: "CrowdStrike",
    description: "CrowdStrike security driver",
    category: "Security",
  },

  "sysmon.sys": {
    vendor: "Microsoft",
    description: "Sysmon driver",
    category: "Monitoring",
  },

  "vmxnet3.sys": {
    vendor: "VMware",
    description: "VMware network driver",
    category: "Virtualization",
  },

  "vmmemctl.sys": {
    vendor: "VMware",
    description: "VMware memory control driver",
    category: "Virtualization",
  },

  "hvix64.exe": {
    vendor: "Microsoft",
    description: "Hyper-V Hypervisor",
    category: "Virtualization",
  },

  "e1iexpress.sys": {
    vendor: "Intel",
    description: "Intel ProSet Network Driver",
    category: "Network Driver",
  },

  "b57nd60a.sys": {
    vendor: "Broadcom",
    description: "Broadcom Network Driver",
    category: "Network Driver",
  },

  "kdstub.dll": {
    vendor: "Microsoft",
    description: "Kernel Debugger Stub",
    category: "Kernel Debugging",
  },

  "wlansvc.dll": {
    vendor: "Microsoft",
    description: "WLAN AutoConfig Service",
    category: "Wireless",
  },

  "networkicon.dll": {
    vendor: "Microsoft",
    description: "Windows Network Icon",
    category: "Network",
  },

  "networkmobilesettings.dll": {
    vendor: "Microsoft",
    description: "Windows Mobile Network Settings",
    category: "Network",
  },

  "cloudrestorelauncher.dll": {
    vendor: "Microsoft",
    description: "Windows Cloud Restore",
    category: "Recovery",
  },

  "vmbus.sys": {
    vendor: "Microsoft",
    description: "Hyper-V VMBus driver",
    category: "Virtualization",
  },

  "storvsc.sys": {
    vendor: "Microsoft",
    description: "Hyper-V storage VSC driver",
    category: "Virtualization",
  },

  "netvsc.sys": {
    vendor: "Microsoft",
    description: "Hyper-V network VSC driver",
    category: "Virtualization",
  },

  "clussvc.exe": {
    vendor: "Microsoft",
    description: "Windows Failover Clustering service",
    category: "Server role",
  },

  "csvfs.sys": {
    vendor: "Microsoft",
    description: "Cluster Shared Volume file system driver",
    category: "Server role",
  },
};

const knownModules = {
  npu_kmd: {
    vendor: "Intel",
    description: "NPU kernel mode driver",
    category: "NPU / VPU driver",
  },

  dxgkrnl: {
    vendor: "Microsoft",
    description: "DirectX graphics kernel",
    category: "Graphics stack",
  },

  nt: {
    vendor: "Microsoft",
    description: "Windows kernel module",
    category: "Kernel",
  },
};

const systemDrivers = [
  "ntoskrnl.exe",
  "hal.dll",
  "ndis.sys",
  "tcpip.sys",
  "storport.sys",
  "stornvme.sys",
  "fltmgr.sys",
  "watchdog.sys",
  "acpi.sys",
  "disk.sys",
  "partmgr.sys",
  "volmgr.sys",
  "volsnap.sys",
  "mountmgr.sys",
  "classpnp.sys",
];

function readUInt32(buffer, offset) {
  if (buffer.length < offset + 4) {
    return null;
  }

  return buffer.readUInt32LE(offset);
}

function getDumpHeader(buffer) {
  const signature = buffer.subarray(0, 4).toString("ascii");

  const version = readUInt32(buffer, 4);
  const streamCount = readUInt32(buffer, 8);
  const streamDirectoryRva = readUInt32(buffer, 12);
  // MINIDUMP_HEADER: Signature(0) Version(4) NumberOfStreams(8)
  // StreamDirectoryRva(12) CheckSum(16) TimeDateStamp(20) Flags(24, 8 bytes).
  // TimeDateStamp was previously read at offset 24, which is actually inside
  // Flags, not the timestamp.
  const timeDateStamp = readUInt32(buffer, 20);

  let crashTime = "Not found";

  if (timeDateStamp) {
    const date = new Date(timeDateStamp * 1000);

    if (!Number.isNaN(date.getTime())) {
      // The server has no idea which language the caller reads, so the crash
      // time goes out as unambiguous UTC rather than a guessed locale format.
      crashTime = date
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, " UTC");
    }
  }

  return {
    signature,
    isMinidump: signature === "MDMP" || signature === "PAGE",
    dumpType:
      signature === "MDMP"
        ? "Windows Minidump"
        : signature === "PAGE"
          ? "PAGE Dump"
          : "Unknown",

    version,
    streamCount,
    streamDirectoryRva,
    crashTime,
  };
}

// MINIDUMP_STREAM_TYPE values relevant here (from Microsoft's minidumpapiset.h).
const MINIDUMP_STREAM_TYPE = {
  EXCEPTION: 6,
};

const MINIDUMP_DIRECTORY_ENTRY_SIZE = 12; // StreamType(4) + DataSize(4) + Rva(4)
const MAX_DIRECTORY_ENTRIES_SCANNED = 200; // guard against a corrupt stream count

function findStreamLocation(buffer, header, streamType) {
  if (!header.streamDirectoryRva || !header.streamCount) {
    return null;
  }

  const entryCount = Math.min(
    header.streamCount,
    MAX_DIRECTORY_ENTRIES_SCANNED,
  );

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset =
      header.streamDirectoryRva + index * MINIDUMP_DIRECTORY_ENTRY_SIZE;

    const type = readUInt32(buffer, entryOffset);

    if (type === null) {
      break;
    }

    if (type === streamType) {
      const dataSize = readUInt32(buffer, entryOffset + 4);
      const rva = readUInt32(buffer, entryOffset + 8);

      if (rva === null) {
        return null;
      }

      return { dataSize, rva };
    }
  }

  return null;
}

function readUInt64LE(buffer, offset) {
  if (buffer.length < offset + 8) {
    return null;
  }

  try {
    return buffer.readBigUInt64LE(offset);
  } catch {
    return null;
  }
}

function formatHex32(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return `0x${(value >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function formatHex64(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return `0x${value.toString(16).toUpperCase().padStart(16, "0")}`;
}

// Kernel crash dumps store the bugcheck code and its 4 parameters in the
// MINIDUMP_EXCEPTION_STREAM's MINIDUMP_EXCEPTION record:
//   ThreadId(0,4) __alignment(4,4)
//   ExceptionCode(8,4) ExceptionFlags(12,4) ExceptionRecord(16,8)
//   ExceptionAddress(24,8) NumberParameters(32,4) __unusedAlignment(36,4)
//   ExceptionInformation[0..3](40, 8 each)
// This is the same mechanism Windows uses for the bugcheck code/parameters
// regardless of which BSOD occurred, so this is far more reliable than the
// text substring scan used as a fallback below.
function parseBugcheckFromExceptionStream(buffer, header) {
  const location = findStreamLocation(
    buffer,
    header,
    MINIDUMP_STREAM_TYPE.EXCEPTION,
  );

  if (!location) {
    return null;
  }

  const { rva } = location;

  if (buffer.length < rva + 72) {
    return null;
  }

  const bugcheckCode = readUInt32(buffer, rva + 8);

  if (bugcheckCode === null || bugcheckCode === 0) {
    return null;
  }

  const numberParameters = readUInt32(buffer, rva + 32);

  const parametersRaw = [0, 1, 2, 3].map((index) =>
    readUInt64LE(buffer, rva + 40 + index * 8),
  );

  return {
    bugcheckCode,
    bugcheckCodeHex: formatHex32(bugcheckCode),
    numberParameters,
    parameters: parametersRaw.map((value) => formatHex64(value)),
    parametersRaw,
  };
}

function matchStopCodeByHex(hex) {
  if (!hex) {
    return null;
  }

  const normalized = normalizeStopCodeQuery(hex);

  return (
    knownStopCodes.find(
      (item) => item.hex && normalizeStopCodeQuery(item.hex) === normalized,
    ) || null
  );
}

// WHEA_ERROR_SOURCE_TYPE, from Microsoft's public WHEA headers. Used as bug
// check parameter 1 for WHEA_UNCORRECTABLE_ERROR (0x124). This only tells us
// which hardware error *source* reported the problem, not the specific
// component (a full CPU-vs-RAM split would need parsing the nested
// WHEA_ERROR_RECORD the source points to, which is out of scope here).
const WHEA_ERROR_SOURCE_TYPES = {
  0: { label: "Machine Check Exception (MCE)", area: "CPU or memory" },
  1: { label: "Corrected Machine Check (CMC)", area: "CPU or memory" },
  2: { label: "Corrected Platform Error (CPE)", area: "Platform or chipset" },
  3: { label: "Non-Maskable Interrupt (NMI)", area: "Hardware (NMI)" },
  4: {
    label: "PCI Express Error",
    area: "PCI Express device (GPU, storage or network card)",
  },
  5: { label: "Generic Hardware Error", area: "Hardware (general)" },
  6: { label: "INIT", area: "Hardware" },
  7: { label: "BOOT", area: "Hardware" },
  8: { label: "SCI", area: "Hardware" },
  12: { label: "Generic Hardware Error v2", area: "Hardware (general)" },
};

const WHEA_UNCORRECTABLE_ERROR_CODE = 0x124;

function getWheaDetail(bugcheckCode, parametersRaw) {
  if (bugcheckCode !== WHEA_UNCORRECTABLE_ERROR_CODE) {
    return null;
  }

  const sourceTypeValue = parametersRaw?.[0];

  if (sourceTypeValue === null || sourceTypeValue === undefined) {
    return null;
  }

  const sourceTypeNumber = Number(sourceTypeValue);
  const known = WHEA_ERROR_SOURCE_TYPES[sourceTypeNumber];

  return {
    errorSourceType: sourceTypeNumber,
    label: known?.label || `Unknown error source (${sourceTypeNumber})`,
    area: known?.area || "Unknown (check parameter 1 manually)",
    recognized: Boolean(known),
  };
}

function isNameChar(char) {
  if (!char) {
    return false;
  }

  const code = char.charCodeAt(0);

  if (code >= 48 && code <= 57) {
    return true;
  }

  if (code >= 65 && code <= 90) {
    return true;
  }

  if (code >= 97 && code <= 122) {
    return true;
  }

  return char === "." || char === "_" || char === "-";
}

function extractNameAround(text, index) {
  let start = index;

  while (start > 0 && isNameChar(text[start - 1])) {
    start -= 1;
  }

  let end = index;

  while (end < text.length && isNameChar(text[end])) {
    end += 1;
  }

  return text.slice(start, end).toLowerCase();
}

function findNamesByExtension(text, extension) {
  const results = new Set();
  let index = 0;

  while (index < text.length) {
    const found = text.indexOf(extension, index);

    if (found === -1) {
      break;
    }

    const name = extractNameAround(text, found + extension.length);

    if (name && name.includes(extension)) {
      results.add(name);
    }

    index = found + extension.length;
  }

  return Array.from(results);
}

function findStopCodes(text) {
  const lowerText = text.toLowerCase();

  return knownStopCodes.filter(
    (item) =>
      lowerText.includes(item.code.toLowerCase()) ||
      (item.hex && lowerText.includes(item.hex.toLowerCase())),
  );
}

function normalizeStopCodeQuery(value = "") {
  return String(value).trim().toLowerCase().replace(/^0x0*/, "0x");
}

function lookupStopCode(query) {
  const normalized = normalizeStopCodeQuery(query);

  if (!normalized) {
    return null;
  }

  return (
    knownStopCodes.find((item) => {
      const codeMatch = item.code.toLowerCase() === normalized;

      const hexMatch =
        item.hex && normalizeStopCodeQuery(item.hex) === normalized;

      return codeMatch || hexMatch;
    }) ||
    knownStopCodes.find((item) => {
      const codeMatch = item.code.toLowerCase().includes(normalized);

      const hexMatch =
        item.hex && normalizeStopCodeQuery(item.hex).includes(normalized);

      return codeMatch || hexMatch;
    }) ||
    null
  );
}

function extractModuleNameFromLine(line) {
  const bangIndex = line.indexOf("!");

  if (bangIndex === -1) {
    return "";
  }

  let start = bangIndex - 1;

  while (start >= 0 && isNameChar(line[start])) {
    start -= 1;
  }

  return line
    .slice(start + 1, bangIndex)
    .trim()
    .toLowerCase();
}

function extractModuleSignals(lines) {
  const counts = new Map();
  const samples = new Map();

  lines.forEach((line) => {
    const moduleName = extractModuleNameFromLine(line);

    if (!moduleName) {
      return;
    }

    counts.set(moduleName, (counts.get(moduleName) || 0) + 1);

    if (!samples.has(moduleName)) {
      samples.set(moduleName, []);
    }

    const moduleSamples = samples.get(moduleName);

    if (moduleSamples.length < 3) {
      moduleSamples.push(line.trim());
    }
  });

  return Array.from(counts.entries())
    .map(([name, count]) => {
      const known = knownModules[name];

      return {
        name,
        count,
        vendor: known?.vendor || "Unknown",
        description: known?.description || "Unknown",
        category: known?.category || "Unknown",
        known: Boolean(known),
        samples: samples.get(name) || [],
      };
    })
    .sort((a, b) => b.count - a.count);
}

function extractInterestingLines(lines) {
  const terms = [
    "error",
    "bugcheck",
    "exception",
    "watchdog",
    "firmware",
    "driver build",
    "unsupported",
    "crash",
  ];

  const results = [];

  lines.forEach((line) => {
    const lowerLine = line.toLowerCase();

    const matched = terms.some((term) => lowerLine.includes(term));

    if (!matched) {
      return;
    }

    const cleanLine = line
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanLine) {
      return;
    }

    if (results.length < 20) {
      results.push(cleanLine.slice(0, 500));
    }
  });

  return results;
}

function extractFirmwareReferences(lines) {
  const results = [];

  lines.forEach((line) => {
    const lowerLine = line.toLowerCase();

    if (!lowerLine.includes("firmware")) {
      return;
    }

    const cleanLine = line
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanLine) {
      return;
    }

    if (results.length < 10) {
      results.push(cleanLine.slice(0, 500));
    }
  });

  return results;
}

function chooseLikelyModule(moduleSignals) {
  const knownThirdParty = moduleSignals.find(
    (module) => module.known && module.vendor !== "Microsoft",
  );

  if (knownThirdParty) {
    return knownThirdParty;
  }

  const unknownModule = moduleSignals.find(
    (module) => module.vendor !== "Microsoft",
  );

  if (unknownModule) {
    return unknownModule;
  }

  return null;
}

function enrichDrivers(driverNames) {
  return driverNames.map((name) => {
    const known = knownDrivers[name];

    return {
      name,
      vendor: known?.vendor || "Unknown",
      description: known?.description || "Unknown",
      category: known?.category || "Unknown",
      known: Boolean(known),
      systemDriver: systemDrivers.includes(name),
    };
  });
}

function chooseLikelyDriver(drivers) {
  const sysDrivers = drivers.filter((driver) => driver.name.endsWith(".sys"));

  const thirdPartyKnown = sysDrivers.find(
    (driver) =>
      driver.known && !driver.systemDriver && driver.vendor !== "Microsoft",
  );

  if (thirdPartyKnown) {
    return thirdPartyKnown;
  }

  const thirdPartyUnknown = sysDrivers.find(
    (driver) => !driver.systemDriver && driver.vendor !== "Microsoft",
  );

  if (thirdPartyUnknown) {
    return thirdPartyUnknown;
  }

  return null;
}

function getLikelyCause(stopCode, driver, moduleSignal, wheaDetail) {
  if (wheaDetail) {
    return `WHEA hardware error reported by: ${wheaDetail.label}. Likely area: ${wheaDetail.area}.`;
  }

  if (driver && driver.known) {
    return `${driver.description} named in the dump. Check this driver first.`;
  }

  if (moduleSignal && moduleSignal.known) {
    return `${moduleSignal.description} appears multiple times in the dump. Check the driver, firmware and updates for this component.`;
  }

  if (moduleSignal) {
    return `Module ${moduleSignal.name} appears multiple times in the dump. Check whether it belongs to recently changed hardware, firmware or drivers.`;
  }

  if (stopCode) {
    return stopCode.advice;
  }

  if (driver) {
    return `Unknown driver found: ${driver.name}. Check whether it belongs to recently changed hardware or software.`;
  }

  return "No clear cause found. Use the raw analysis and Windows event logs for more context.";
}

function buildTicketSummary(result) {
  const lines = [
    "BSOD analysis",
    "",
    `File: ${result.fileName}`,
    `Crash time: ${result.header.crashTime}`,
    `Stop code: ${result.stopCode || "Not found"} (${result.stopCodeSource === "stream" ? "from crash data" : result.stopCodeSource === "text-scan" ? "text scan" : "unknown"})`,
    `Category: ${result.category || "Not found"}`,
    ...(result.bugcheck
      ? [
          `Bugcheck code: ${result.bugcheck.code}`,
          `Bugcheck parameters: ${result.bugcheck.parameters.filter(Boolean).join(", ") || "Not found"}`,
        ]
      : []),
    ...(result.whea
      ? [
          `WHEA error source: ${result.whea.label}`,
          `WHEA area: ${result.whea.area}`,
        ]
      : []),
    `Likely driver: ${result.likelyDriver?.name || "Not found"}`,
    `Driver description: ${result.likelyDriver?.description || "Not found"}`,
    `Driver vendor: ${result.likelyDriver?.vendor || "Not found"}`,
    `Module candidate: ${result.likelyModule?.name || "Not found"}`,
    `Module description: ${result.likelyModule?.description || "Not found"}`,
    `Module vendor: ${result.likelyModule?.vendor || "Not found"}`,
    "",
    `Advies: ${result.likelyCause}`,
  ];

  return lines.join("\n");
}

const MINI_DUMP_SIZE_THRESHOLD_BYTES = 5 * 1024 * 1024;

function analyzeDump(buffer, fileName) {
  const header = getDumpHeader(buffer);
  const text = buffer.toString("latin1");

  const dumpSizeBytes = buffer.length;
  const isSmallDump = dumpSizeBytes < MINI_DUMP_SIZE_THRESHOLD_BYTES;

  const sysDrivers = findNamesByExtension(text, ".sys");
  const exeFiles = findNamesByExtension(text, ".exe");
  const dllFiles = findNamesByExtension(text, ".dll");

  const drivers = enrichDrivers(
    sysDrivers.concat(exeFiles).concat(dllFiles).slice(0, 80),
  );

  const bugcheck = parseBugcheckFromExceptionStream(buffer, header);

  const streamStopCodeMatch = bugcheck
    ? matchStopCodeByHex(bugcheck.bugcheckCodeHex)
    : null;

  const stopMatches = findStopCodes(text);

  // Prefer the bugcheck code read from the Exception stream (real crash
  // data) over the text substring scan (a heuristic guess), since the
  // stream data is authoritative when present.
  const primaryStopCode = streamStopCodeMatch || stopMatches[0] || null;

  const stopCodeSource = streamStopCodeMatch
    ? "stream"
    : stopMatches[0]
      ? "text-scan"
      : null;

  const wheaDetail = bugcheck
    ? getWheaDetail(bugcheck.bugcheckCode, bugcheck.parametersRaw)
    : null;

  const textLines = text.split("\n");

  const moduleSignals = extractModuleSignals(textLines);

  const errorLines = extractInterestingLines(textLines);

  const categorizedLines = splitInterestingLines(errorLines);

  const firmwareReferences = extractFirmwareReferences(textLines);

  const likelyDriver = chooseLikelyDriver(drivers);

  const likelyModule = chooseLikelyModule(moduleSignals);

  const likelyCause = getLikelyCause(
    primaryStopCode,
    likelyDriver,
    likelyModule,
    wheaDetail,
  );

  const result = {
    fileName,
    header,

    dumpSizeBytes,
    isSmallDump,

    stopCode: primaryStopCode?.code || "",
    category: primaryStopCode?.category || "",
    stopCodeSource,

    bugcheck: bugcheck
      ? {
          code: bugcheck.bugcheckCodeHex,
          parameters: bugcheck.parameters,
        }
      : null,

    whea: wheaDetail,

    likelyDriver,
    likelyModule,
    likelyCause,

    drivers,
    moduleSignals,
    errorLines,
    firmwareReferences,

    driverCount: drivers.length,

    knownDriverCount: drivers.filter((driver) => driver.known).length,

    thirdPartyDrivers: drivers.filter((driver) => driver.vendor !== "Microsoft")
      .length,

    microsoftDrivers: drivers.filter((driver) => driver.vendor === "Microsoft")
      .length,

    debug: {
      signature: header.signature,
      version: header.version,
      streamCount: header.streamCount,
      streamDirectoryRva: header.streamDirectoryRva,
    },

    stopCodeMatches: stopMatches,
  };

  return {
    ...result,
    ticketSummary: buildTicketSummary(result),
  };
}

router.post(
  "/",
  bsodLimiter,
  express.raw({
    type: "application/octet-stream",
    limit: maxFileSize,
  }),
  asyncHandler(async (req, res) => {
    let fileName;

    try {
      fileName = decodeURIComponent(
        req.headers["x-file-name"] || "minidump.dmp",
      );
    } catch {
      return res.status(400).json({
        error: "Invalid filename header",
        code: "bsod.invalidFilename",
      });
    }

    if (!fileName.toLowerCase().endsWith(".dmp")) {
      return res.status(400).json({
        error: "Only .dmp files are supported",
        code: "bsod.unsupportedFile",
      });
    }

    if (!req.body || !req.body.length) {
      return res.status(400).json({
        error: "No dump file received",
        code: "bsod.noDump",
      });
    }

    const analysis = analyzeDump(req.body, fileName);

    res.json({
      success: true,
      analysis,
    });
  }),
);

router.get(
  "/lookup",
  bsodLimiter,
  asyncHandler(async (req, res) => {
    const query = String(req.query.code || "").trim();

    if (!query) {
      return res.status(400).json({
        error: "No stop code provided",
        code: "bsod.noStopCode",
      });
    }

    const match = lookupStopCode(query);

    res.json({
      success: true,
      found: Boolean(match),
      stopCode: match,
    });
  }),
);

module.exports = router;
