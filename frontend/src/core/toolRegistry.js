import { runLinkTool } from "./toolEngines/linkEngine";
import { runDnsTool } from "./toolEngines/dnsEngine";
import { runMailTool } from "./toolEngines/mailEngine";
import { runMacTool } from "./toolEngines/macEngine";
import { runPasswordTool } from "./toolEngines/passwordEngine";
import PasswordGeneratorForm from "../components/toolForms/PasswordGeneratorForm";
import BreachPasswordCheckerForm from "../components/toolForms/BreachPasswordCheckerForm";
import DkimBuilderForm from "../components/toolForms/DkimBuilderForm";
import EncodingToolForm from "../components/toolForms/EncodingToolForm";
import MacLookupForm from "../components/toolForms/MacLookupForm";
import IpLookupForm from "../components/toolForms/IpLookupForm";
import { runIpTool } from "./toolEngines/ipEngine";
import PortCheckForm from "../components/toolForms/PortCheckForm";
import { runPortTool } from "./toolEngines/portEngine";
import WhoisLookupForm from "../components/toolForms/WhoisLookupForm";
import SslCheckerForm from "../components/toolForms/SslCheckerForm";
import SidConverterForm from "../components/toolForms/SidConverterForm";
import SpfBuilderForm from "../components/toolForms/SpfBuilderForm";
import SpfFlattenForm from "../components/toolForms/SpfFlattenForm";
import ReputationCheckForm from "../components/toolForms/ReputationCheckForm";
import SecretGeneratorForm from "../components/toolForms/SecretGeneratorForm";
import SubnetCalculatorForm from "../components/toolForms/SubnetCalculatorForm";
import DmarcBuilderForm from "../components/toolForms/DmarcBuilderForm";
import DmarcReportParserForm from "../components/toolForms/DmarcReportParserForm";
import ReverseDnsForm from "../components/toolForms/ReverseDnsForm";
import BsodAnalyzerForm from "../components/toolForms/BsodAnalyzerForm";
import SmtpConfigurationBuilderForm from "../components/toolForms/SmtpConfigurationBuilderForm";
import DnsPropagationViewerForm from "../components/toolForms/DnsPropagationViewerForm";
import DnsLookupForm from "../components/toolForms/DnsLookupForm";
import CertificateToolkitForm from "../components/toolForms/CertificateToolkitForm";
import MailHeaderAnalyzerForm from "../components/toolForms/MailHeaderAnalyzerForm";
import PingToolForm from "../components/toolForms/PingToolForm";
import TraceRouteForm from "../components/toolForms/TraceRouteForm";
import MessageTraceVisualizerForm from "../components/toolForms/MessageTraceVisualizerForm";
import SignInAnomalyAnalyzerForm from "../components/toolForms/SignInAnomalyAnalyzerForm";
import WifiAssetQrGeneratorForm from "../components/toolForms/WifiAssetQrGeneratorForm";
import CodeCompareForm from "../components/toolForms/CodeCompareForm";

import { runDnsPropagationTool } from "./toolEngines/dnsPropagationEngine";
import { runDnsLookupTool } from "./toolEngines/dnsLookupEngine";
import { runSmtpConfigurationTool } from "./toolEngines/smtpConfigurationEngine";
import { runBsodTool } from "./toolEngines/bsodEngine";
import { runReverseDnsTool } from "./toolEngines/reverseDnsEngine";
import { runDmarcTool } from "./toolEngines/dmarcEngine";
import { runDmarcReportTool } from "./toolEngines/dmarcReportEngine";
import { runSubnetTool } from "./toolEngines/subnetEngine";
import { runSecretTool } from "./toolEngines/secretEngine";
import { runReputationTool } from "./toolEngines/reputationEngine";
import { runBreachTool } from "./toolEngines/breachEngine";
import { runDkimBuilderTool } from "./toolEngines/dkimEngine";
import { runEncodingTool } from "./toolEngines/encodingEngine";
import { runSpfTool } from "./toolEngines/spfEngine";
import { runSpfFlattenTool } from "./toolEngines/spfFlattenEngine";
import { runSidTool } from "./toolEngines/sidEngine";
import { runSslTool } from "./toolEngines/sslEngine";
import { runCertificateToolkitTool } from "./toolEngines/certificateToolkitEngine";
import { runWhoisTool } from "./toolEngines/whoisEngine";
import { runPingTool } from "./toolEngines/pingEngine";
import { runTracerouteTool } from "./toolEngines/tracerouteEngine";
import { runMessageTraceTool } from "./toolEngines/messageTraceEngine";
import { runSignInAnomalyTool } from "./toolEngines/signInAnomalyEngine";
import { runQrCodeTool } from "./toolEngines/qrCodeEngine";
import { runCodeCompareTool } from "./toolEngines/codeCompareEngine";

function defineToolType({
  label,
  icon,
  engine,
  form = null,
  showConfigInput = false,
  showInputTemplate = false,
  configTitle,
  configLabel,
  configPlaceholder,
  helpTitle,
  helpText,
  modalMaxWidth,
  shortDescription,
  marketplaceCategory,
  version = "1.0",
  addedAt,
  defaultCategoryHint,
}) {
  return {
    label,
    icon,
    engine,
    form,
    showConfigInput,
    showInputTemplate,
    configTitle: configTitle ?? `${label} configuration`,
    configLabel: configLabel ?? `${label} config`,
    configPlaceholder: configPlaceholder ?? `${label} uses its own form.`,
    helpTitle: helpTitle ?? label,
    helpText,
    shortDescription: shortDescription ?? helpText ?? label,
    marketplaceCategory: marketplaceCategory ?? "utilities",
    version,
    addedAt,
    defaultCategoryHint,
    ...(modalMaxWidth ? { modalMaxWidth } : {}),
  };
}

export const toolRegistry = {
  link: defineToolType({
    label: "Link",
    icon: "link",
    engine: runLinkTool,
    showConfigInput: true,
    showInputTemplate: true,
    configTitle: "URL Template",
    configLabel: "Target URL",
    configPlaceholder:
      "Use {input} for the user input. For example: https://mxtoolbox.com/SuperTool.aspx?action=spf%3a{input}&run=toolpage",
    helpTitle: "Link Tool",
    helpText:
      "Use this type to open external websites or online tools. The value the user enters can be placed into the URL with {input}.",
    shortDescription:
      "Open an external website or online tool, with the user's input inserted into the URL.",
    marketplaceCategory: "utilities",
    addedAt: "2026-07-05",
    defaultCategoryHint: "Utilities",
  }),

  secretGenerator: defineToolType({
    label: "Secret Generator",
    icon: "keyRound",
    engine: runSecretTool,
    form: SecretGeneratorForm,
    helpText:
      "Use this type to generate cryptographic secrets for JWT tokens, API keys, sessions and applications.",
    shortDescription:
      "Generate cryptographic secrets for JWT tokens, API keys, sessions and applications.",
    marketplaceCategory: "security",
    addedAt: "2026-07-15",
    defaultCategoryHint: "Security",
  }),

  reverseDns: defineToolType({
    label: "Reverse DNS Lookup",
    icon: "search",
    engine: runReverseDnsTool,
    form: ReverseDnsForm,
    configTitle: "Reverse DNS configuration",
    configLabel: "Reverse DNS config",
    helpText: "Look up PTR records for IPv4 addresses.",
    shortDescription: "Look up PTR records for IPv4 addresses.",
    marketplaceCategory: "network",
    addedAt: "2026-07-15",
    defaultCategoryHint: "Networking",
  }),

  reputationCheck: defineToolType({
    label: "Reputation Check",
    icon: "shield",
    engine: runReputationTool,
    form: ReputationCheckForm,
    helpText:
      "Use this type to check IP addresses, domains and hostnames for reputation, blacklist status, Whois, SSL and provider information.",
    shortDescription:
      "Check IPs, domains and hostnames for reputation, blacklist status and provider info.",
    marketplaceCategory: "security",
    addedAt: "2026-07-14",
    defaultCategoryHint: "Security",
  }),

  dmarcBuilder: defineToolType({
    label: "DMARC Builder",
    icon: "mail",
    engine: runDmarcTool,
    form: DmarcBuilderForm,
    helpText:
      "Use this type to build a new DMARC record, or extend an existing one with policy, reporting addresses, alignment and failure options.",
    shortDescription:
      "Build or extend a DMARC record with policy, reporting and alignment options.",
    marketplaceCategory: "mail",
    addedAt: "2026-07-15",
    defaultCategoryHint: "Mail",
  }),

  dmarcReportParser: defineToolType({
    label: "DMARC Report Parser",
    icon: "fileSearch",
    engine: runDmarcReportTool,
    form: DmarcReportParserForm,
    helpText:
      "Parse DMARC aggregate (RUA) XML reports. Upload the XML file from your mailbox to see which IPs send mail for your domain and whether they pass DMARC authentication.",
    shortDescription:
      "Parse DMARC aggregate (RUA) XML reports to see who's sending mail for your domain.",
    marketplaceCategory: "mail",
    addedAt: "2026-07-22",
    defaultCategoryHint: "Mail",
  }),

  sidConverter: defineToolType({
    label: "SID Converter",
    icon: "search",
    engine: runSidTool,
    form: SidConverterForm,
    helpText:
      "Use this type to analyse Windows SIDs. Useful for HKEY_USERS, ProfileList, ACLs, registry permissions and event logs.",
    shortDescription:
      "Analyse Windows SIDs for registry, ACL and event-log troubleshooting.",
    marketplaceCategory: "security",
    addedAt: "2026-07-14",
    defaultCategoryHint: "Security",
  }),

  whoisLookup: defineToolType({
    label: "Whois Lookup",
    icon: "search",
    engine: runWhoisTool,
    form: WhoisLookupForm,
    helpText:
      "Use this type to fetch RDAP Whois information for a domain, such as registrar, status, expiry date and nameservers.",
    shortDescription:
      "Fetch RDAP Whois info for a domain: registrar, status, expiry and nameservers.",
    marketplaceCategory: "network",
    addedAt: "2026-07-14",
    defaultCategoryHint: "Networking",
  }),

  smtpConfigurationBuilder: defineToolType({
    label: "SMTP Configuration Builder",
    icon: "mail",
    engine: runSmtpConfigurationTool,
    form: SmtpConfigurationBuilderForm,
    helpText:
      "Generate SMTP settings for Microsoft 365, SMTP relay providers and custom SMTP servers.",
    shortDescription:
      "Generate SMTP settings for Microsoft 365, relay providers and custom servers.",
    marketplaceCategory: "mail",
    addedAt: "2026-07-17",
    defaultCategoryHint: "Mail",
  }),

  sslChecker: defineToolType({
    label: "SSL Checker",
    icon: "shield",
    engine: runSslTool,
    form: SslCheckerForm,
    helpText:
      "Use this type to check SSL certificates of websites. The tool shows the issuer, common name, validity, expiry date, SAN records and certificate status.",
    shortDescription:
      "Check a website's SSL certificate: issuer, validity, expiry and SAN records.",
    marketplaceCategory: "certificates",
    addedAt: "2026-07-14",
    defaultCategoryHint: "Certificates",
  }),

  bsodAnalyzer: defineToolType({
    label: "BSOD Analyzer",
    icon: "fileSearch",
    engine: runBsodTool,
    form: BsodAnalyzerForm,
    helpText:
      "Use this type to analyse Windows minidump files and show the stop code, drivers, crash information and a ticket summary.",
    shortDescription:
      "Analyse Windows minidump files: stop code, drivers and a ticket summary.",
    marketplaceCategory: "diagnostics",
    addedAt: "2026-07-16",
    defaultCategoryHint: "Diagnostics",
  }),

  dnsPropagationViewer: defineToolType({
    label: "DNS Propagation Viewer",
    icon: "dns",
    engine: runDnsPropagationTool,
    form: DnsPropagationViewerForm,
    helpText:
      "Use this type to check DNS records through public resolvers and reveal differences between them.",
    shortDescription:
      "Check DNS records through public resolvers and reveal differences between them.",
    marketplaceCategory: "network",
    addedAt: "2026-07-17",
    defaultCategoryHint: "Networking",
  }),

  dnsLookupV2: defineToolType({
    label: "DNS Lookup",
    icon: "dns",
    engine: runDnsLookupTool,
    form: DnsLookupForm,
    helpText:
      "Check several DNS record types at once for a domain or hostname, with status, TTL and values per type.",
    shortDescription:
      "Lookup DNS records and troubleshoot name resolution for a domain or hostname.",
    marketplaceCategory: "network",
    addedAt: "2026-07-24",
    defaultCategoryHint: "Networking",
  }),

  portCheck: defineToolType({
    label: "Port Checker",
    icon: "network",
    engine: runPortTool,
    form: PortCheckForm,
    helpText:
      "Use this type to check whether a single TCP port is reachable on a host or IP address.",
    shortDescription:
      "Check whether a single TCP port is reachable on a host or IP address.",
    marketplaceCategory: "network",
    addedAt: "2026-07-14",
    defaultCategoryHint: "Networking",
  }),

  subnetCalculator: defineToolType({
    label: "Subnet Calculator",
    icon: "network",
    engine: runSubnetTool,
    form: SubnetCalculatorForm,
    helpText:
      "Calculate subnet mask, network address, broadcast address, host range and host count from an IPv4 address and CIDR.",
    shortDescription:
      "Calculate subnet mask, network/broadcast address and host range from an IPv4/CIDR.",
    marketplaceCategory: "network",
    addedAt: "2026-07-15",
    defaultCategoryHint: "Networking",
  }),

  spfBuilder: defineToolType({
    label: "SPF Builder",
    icon: "mail",
    engine: runSpfTool,
    form: SpfBuilderForm,
    helpText:
      "Use this type to build a new SPF record, or extend an existing one with includes, IP addresses, A records, MX records and a fail policy.",
    shortDescription:
      "Build or extend an SPF record with includes, IPs, A/MX records and a fail policy.",
    marketplaceCategory: "mail",
    addedAt: "2026-07-14",
    defaultCategoryHint: "Mail",
  }),

  spfFlatten: defineToolType({
    label: "SPF Flatten",
    icon: "file",
    engine: runSpfFlattenTool,
    form: SpfFlattenForm,
    helpText:
      "Analyse an existing SPF record, follow includes recursively and generate a flattened version with every IP range that results from includes, A records and MX records. Note: an SPF record may contain at most 10 DNS lookups; flattening reduces that count.",
    shortDescription:
      "Flatten an SPF record's includes into a single list of IP ranges to cut DNS lookups.",
    marketplaceCategory: "mail",
    addedAt: "2026-07-22",
    defaultCategoryHint: "Mail",
  }),

  certificateToolkit: defineToolType({
    label: "Certificate Toolkit",
    icon: "shield",
    engine: runCertificateToolkitTool,
    form: CertificateToolkitForm,
    helpText:
      "Inspect PEM, CRT and CER certificates and show validity, SANs, fingerprints and chain information.",
    shortDescription:
      "Inspect PEM, CRT and CER certificates: validity, SANs, fingerprints and chain.",
    marketplaceCategory: "certificates",
    addedAt: "2026-07-19",
    defaultCategoryHint: "Certificates",
  }),

  mail: defineToolType({
    label: "Mail Analyzer",
    icon: "mail",
    engine: runMailTool,
    form: MailHeaderAnalyzerForm,
    modalMaxWidth: "1100px",
    configTitle: "Mail configuration",
    configLabel: "Mail config",
    helpText:
      "Use this type to analyse full mail headers. The user pastes a mail header into a text field.",
    shortDescription:
      "Analyse a pasted mail header for routing, auth and delay info.",
    marketplaceCategory: "mail",
    addedAt: "2026-07-23",
    defaultCategoryHint: "Mail",
  }),

  ipLookup: defineToolType({
    label: "IP Lookup",
    icon: "network",
    engine: runIpTool,
    form: IpLookupForm,
    helpText:
      "Use this type to check IP addresses and fetch network, provider and location information.",
    shortDescription:
      "Check an IP address for network, provider and location information.",
    marketplaceCategory: "network",
    addedAt: "2026-07-14",
    defaultCategoryHint: "Networking",
  }),

  pingTool: defineToolType({
    label: "Ping Tool",
    icon: "network",
    engine: runPingTool,
    form: PingToolForm,
    helpText:
      "Ping a hostname or IP address with live, Windows-style output. Useful for internet, VPN, printer and firewall troubleshooting, Microsoft 365 connectivity, DNS problems and general network diagnostics.",
    shortDescription:
      "Ping a hostname or IP address with live, Windows-style output.",
    marketplaceCategory: "diagnostics",
    addedAt: "2026-07-26",
    defaultCategoryHint: "Diagnostics",
  }),

  tracerouteTool: defineToolType({
    label: "Traceroute",
    icon: "network",
    engine: runTracerouteTool,
    form: TraceRouteForm,
    helpText:
      "Trace the network path to a hostname or IP address, hop by hop, with live output. Useful for seeing where a connection slows down or stalls (VPN, firewall, ISP routing).",
    shortDescription:
      "Trace the network path to a host hop by hop, live, to spot where it stalls.",
    marketplaceCategory: "diagnostics",
    addedAt: "2026-07-26",
    defaultCategoryHint: "Diagnostics",
  }),

  mac: defineToolType({
    label: "MAC Lookup",
    icon: "server",
    engine: runMacTool,
    form: MacLookupForm,
    configTitle: "MAC configuration",
    configLabel: "MAC config",
    helpText:
      "Use this type to find the manufacturer and OUI prefix behind a MAC address.",
    shortDescription:
      "Find the manufacturer and OUI prefix behind a MAC address.",
    marketplaceCategory: "network",
    addedAt: "2026-07-13",
    defaultCategoryHint: "Networking",
  }),

  password: defineToolType({
    label: "Password Generator",
    icon: "keyRound",
    engine: runPasswordTool,
    form: PasswordGeneratorForm,
    configTitle: "Password configuration",
    configLabel: "Password config",
    helpText:
      "Use this type to generate secure passwords. This tool uses its own form with options and needs no input template.",
    shortDescription:
      "Generate secure passwords with configurable length and character sets.",
    marketplaceCategory: "security",
    addedAt: "2026-07-10",
    defaultCategoryHint: "Security",
  }),

  breachPasswordChecker: defineToolType({
    label: "Breach Password Checker",
    icon: "shieldAlert",
    engine: runBreachTool,
    form: BreachPasswordCheckerForm,
    helpText:
      "Check whether a password appears in known breaches through the Have I Been Pwned k-anonymity API. Useful for new users, administrator and service accounts, Microsoft 365 accounts, customer onboarding and security audits.",
    shortDescription:
      "Check whether a password appears in known breaches via Have I Been Pwned.",
    marketplaceCategory: "security",
    addedAt: "2026-07-25",
    defaultCategoryHint: "Security",
  }),

  messageTraceVisualizer: defineToolType({
    label: "Message Trace Visualizer",
    icon: "fileSearch",
    engine: runMessageTraceTool,
    form: MessageTraceVisualizerForm,
    modalMaxWidth: "1100px",
    helpText:
      "Upload a Microsoft 365 message trace CSV export (a summary from Get-MessageTrace, or the per-message hop export from Get-MessageTraceDetail / 'View message trace details' → Export). Visualises hop timelines, delays between steps and the slowest step per message, or a summary overview with statistics for a bulk export.",
    shortDescription:
      "Visualise a Microsoft 365 message trace CSV export: hop timelines and delays.",
    marketplaceCategory: "mail",
    addedAt: "2026-07-29",
    defaultCategoryHint: "Mail",
  }),

  signInAnomalyAnalyzer: defineToolType({
    label: "Sign-in Log Anomaly Analyzer",
    icon: "shieldAlert",
    engine: runSignInAnomalyTool,
    form: SignInAnomalyAnalyzerForm,
    modalMaxWidth: "1200px",
    helpText:
      "Paste or upload Microsoft Entra ID sign-in logs (JSON, CSV or a table pasted from the portal). Detects impossible travel, password spray, brute force, legacy authentication, unusual countries, new devices and more, with a risk score, a management and technical summary and an event timeline. Fully local processing, no external APIs.",
    shortDescription:
      "Detect impossible travel, password spray and other anomalies in Entra ID sign-in logs.",
    marketplaceCategory: "security",
    addedAt: "2026-07-29",
    defaultCategoryHint: "Security",
  }),

  wifiAssetQrGenerator: defineToolType({
    label: "Wi-Fi & Asset QR Code Generator",
    icon: "qrCode",
    engine: runQrCodeTool,
    form: WifiAssetQrGeneratorForm,
    modalMaxWidth: "900px",
    helpText:
      "Generate QR codes for Wi-Fi networks (standard WIFI: format, scannable to connect straight away) or for asset labels (linking to a documentation URL or showing a readable summary). Download as PNG, copy the raw QR data, or print one or more labels on a single page. Fully local processing, no external APIs.",
    shortDescription:
      "Generate scannable QR codes for Wi-Fi networks or printable asset labels.",
    marketplaceCategory: "utilities",
    addedAt: "2026-07-29",
    defaultCategoryHint: "Utilities",
  }),

  dkimBuilder: defineToolType({
    label: "DKIM Builder",
    icon: "mail",
    engine: runDkimBuilderTool,
    form: DkimBuilderForm,
    helpText:
      "Generate DKIM DNS records for Microsoft 365 and other mail providers (Google Workspace, SendGrid, Mailgun, Amazon SES, SMTP2GO, Brevo, Mailjet), or assemble your own custom DKIM record.",
    shortDescription:
      "Generate DKIM DNS records for Microsoft 365 and other major mail providers.",
    marketplaceCategory: "mail",
    addedAt: "2026-07-25",
    defaultCategoryHint: "Mail",
  }),

  encodingToolkit: defineToolType({
    label: "Data Encoding Toolkit",
    icon: "binary",
    engine: runEncodingTool,
    form: EncodingToolForm,
    helpText:
      "Encode, decode and inspect text: Base64, Base32, URL encoding, Hex, HTML/XML entities and JSON escaping, plus JWT decoding, a Unicode/UTF-8 inspector and a URL query parser. Useful for JWT troubleshooting, API/Graph debugging, Entra ID and webhook troubleshooting, mail header analysis and PowerShell scripting.",
    shortDescription:
      "Encode, decode and inspect Base64, Hex, JWTs, URLs and other text formats.",
    marketplaceCategory: "dataEncoding",
    addedAt: "2026-07-25",
    defaultCategoryHint: "Data & Encoding",
  }),

  codeCompare: defineToolType({
    label: "Code Compare",
    icon: "fileDiff",
    engine: runCodeCompareTool,
    form: CodeCompareForm,
    modalMaxWidth: "1200px",
    helpText:
      "Compare two pieces of text or code side by side, or inline. Highlights added, removed and changed lines, with options to ignore whitespace, letter casing or empty lines. Runs entirely in the browser - nothing is sent to the server.",
    shortDescription:
      "Compare two pieces of text or code side by side and see every difference.",
    marketplaceCategory: "dataEncoding",
    addedAt: "2026-08-16",
    defaultCategoryHint: "Data & Encoding",
  }),
};
