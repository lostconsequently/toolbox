// Starter content offered by the First Startup Wizard's "New environment"
// path (routes/setup.js -> services/setupSeedService.js). One representative
// tool per subcategory is included for the "categories + tools" preset -
// metadata (label/description/icon/toolType) copied from
// frontend/src/core/toolRegistry.js so an installed tool looks identical to
// one installed normally through Tools Center.
const CATEGORY_PRESET = [
  {
    name: "Diagnostics & Analysis",
    color: "#ef4444",
    subcategories: [
      {
        name: "Data & Encoding",
        tool: {
          toolType: "encodingToolkit",
          name: "Data Encoding Toolkit",
          description:
            "Encode, decode and inspect Base64, Hex, JWTs, URLs and other text formats.",
          icon: "binary",
        },
      },
      {
        name: "Windows",
        tool: {
          toolType: "bsodAnalyzer",
          name: "BSOD Analyzer",
          description:
            "Analyse Windows minidump files: stop code, drivers and a ticket summary.",
          icon: "fileSearch",
        },
      },
    ],
  },
  {
    name: "Email & Deliverability",
    color: "#22c55e",
    subcategories: [
      {
        name: "Email Authentication",
        tool: {
          toolType: "dmarcBuilder",
          name: "DMARC Builder",
          description:
            "Build or extend a DMARC record with policy, reporting and alignment options.",
          icon: "mail",
        },
      },
      {
        name: "Mail Analysis",
        tool: {
          toolType: "mail",
          name: "Mail Analyzer",
          description: "Analyse a pasted mail header for routing, auth and delay info.",
          icon: "mail",
        },
      },
      {
        name: "Mail Flow",
        tool: {
          toolType: "messageTraceVisualizer",
          name: "Message Trace Visualizer",
          description:
            "Visualise a Microsoft 365 message trace CSV export: hop timelines and delays.",
          icon: "fileSearch",
        },
      },
    ],
  },
  {
    name: "Generators",
    color: "#14b8a6",
    subcategories: [
      {
        name: "Configuration",
        tool: {
          toolType: "smtpConfigurationBuilder",
          name: "SMTP Configuration Builder",
          description:
            "Generate SMTP settings for Microsoft 365, relay providers and custom servers.",
          icon: "mail",
        },
      },
      {
        name: "Credentials",
        tool: {
          toolType: "password",
          name: "Password Generator",
          description:
            "Generate secure passwords with configurable length and character sets.",
          icon: "keyRound",
        },
      },
      {
        name: "QR Codes",
        tool: {
          toolType: "wifiAssetQrGenerator",
          name: "Wi-Fi & Asset QR Code Generator",
          description:
            "Generate scannable QR codes for Wi-Fi networks or printable asset labels.",
          icon: "qrCode",
        },
      },
    ],
  },
  {
    name: "Identity & Active Directory",
    color: "#a855f7",
    subcategories: [
      {
        name: "Active Directory",
        tool: {
          toolType: "sidConverter",
          name: "SID Converter",
          description:
            "Analyse Windows SIDs for registry, ACL and event-log troubleshooting.",
          icon: "search",
        },
      },
      {
        name: "User Identity",
        tool: {
          toolType: "breachPasswordChecker",
          name: "Breach Password Checker",
          description:
            "Check whether a password appears in known breaches via Have I Been Pwned.",
          icon: "shieldAlert",
        },
      },
    ],
  },
  {
    name: "Network",
    color: "#3b82f6",
    subcategories: [
      {
        name: "Connectivity",
        tool: {
          toolType: "portCheck",
          name: "Port Checker",
          description: "Check whether a single TCP port is reachable on a host or IP address.",
          icon: "network",
        },
      },
      {
        name: "DNS",
        tool: {
          toolType: "dnsLookupV2",
          name: "DNS Lookup",
          description:
            "Lookup DNS records and troubleshoot name resolution for a domain or hostname.",
          icon: "dns",
        },
      },
      {
        name: "IP & Routing",
        tool: {
          toolType: "ipLookup",
          name: "IP Lookup",
          description: "Check an IP address for network, provider and location information.",
          icon: "network",
        },
      },
    ],
  },
  {
    name: "Security",
    color: "#f97316",
    subcategories: [
      {
        name: "Certificates",
        tool: {
          toolType: "certificateToolkit",
          name: "Certificate Toolkit",
          description: "Inspect PEM, CRT and CER certificates: validity, SANs, fingerprints and chain.",
          icon: "shield",
        },
      },
      {
        name: "Identity Security",
        tool: {
          toolType: "signInAnomalyAnalyzer",
          name: "Sign-in Log Anomaly Analyzer",
          description:
            "Detect impossible travel, password spray and other anomalies in Entra ID sign-in logs.",
          icon: "shieldAlert",
        },
      },
    ],
  },
];

module.exports = { CATEGORY_PRESET };
