export const smtpProviders = [
  {
    label: "Microsoft 365 SMTP Auth",
    value: "m365-auth",
    host: "smtp.office365.com",
    port: "587",
    security: "STARTTLS",
    authentication: "Yes",
    username: "Full email address",
    password: "Mailbox password, app password or OAuth",
    requiresDomain: false,
    alternativePorts: ["25"],
    supportsOAuth2: true,
    spfInclude: "include:spf.protection.outlook.com",
    notes: [
      {
        label: "Security",
        text: "SMTP AUTH must be allowed at tenant and mailbox level.",
      },
      {
        label: "Configuration",
        text: "Only use this when the device or application can authenticate.",
      },
    ],
  },
  {
    label: "Microsoft 365 Direct Send",
    value: "m365-direct",
    host: "",
    port: "25",
    security: "TLS optional",
    authentication: "No",
    username: "Not required",
    password: "Not required",
    requiresDomain: true,
    spfInclude: "include:spf.protection.outlook.com",
    notes: [
      {
        label: "Configuration",
        text: "Uses the domain's Microsoft 365 MX endpoint.",
      },
      {
        label: "Audience",
        text: "Mainly suited to delivery to internal Microsoft 365 recipients.",
      },
    ],
  },
  {
    label: "Microsoft 365 SMTP Connector",
    value: "m365-connector",
    host: "",
    port: "25",
    security: "TLS recommended",
    authentication: "No",
    username: "Not required",
    password: "Not required",
    requiresDomain: true,
    spfInclude: "include:spf.protection.outlook.com",
    notes: [
      {
        label: "Configuration",
        text: "Uses the domain's Microsoft 365 MX endpoint.",
      },
      {
        label: "Authentication",
        text: "Connector authorisation is usually based on a public IP address or certificate.",
      },
    ],
  },
  {
    label: "SMTP.com",
    value: "smtp-com",
    host: "smtp.smtp.com",
    port: "587",
    security: "STARTTLS",
    authentication: "Yes",
    username: "SMTP.com username",
    password: "SMTP.com password or API credential",
    requiresDomain: false,
    alternativePorts: ["25", "465"],
    notes: [
      {
        label: "Configuration",
        text: "Always verify host, port and credentials in the SMTP.com portal.",
      },
    ],
  },
  {
    label: "SMTP2GO",
    value: "smtp2go",
    host: "mail.smtp2go.com",
    port: "587",
    security: "STARTTLS",
    authentication: "Yes",
    username: "SMTP2GO username",
    password: "SMTP2GO password",
    requiresDomain: false,
    alternativePorts: ["25", "2525"],
    spfInclude: "include:spf.smtp2go.com",
    notes: [
      {
        label: "Configuration",
        text: "Check the account-specific SMTP settings in SMTP2GO.",
      },
    ],
  },
  {
    label: "SendGrid",
    value: "sendgrid",
    host: "smtp.sendgrid.net",
    port: "587",
    security: "STARTTLS",
    authentication: "Yes",
    username: "apikey",
    password: "SendGrid API key",
    requiresDomain: false,
    alternativePorts: ["25", "465"],
    spfInclude: "include:sendgrid.net",
    notes: [
      {
        label: "Authentication",
        text: "With SendGrid the username is often literally apikey.",
      },
      { label: "Authentication", text: "Use the API key as the password." },
    ],
  },
  {
    label: "Mailgun",
    value: "mailgun",
    host: "smtp.mailgun.org",
    port: "587",
    security: "STARTTLS",
    authentication: "Yes",
    username: "Mailgun SMTP login",
    password: "Mailgun SMTP password",
    requiresDomain: false,
    alternativePorts: ["25", "465"],
    spfInclude: "include:mailgun.org",
    notes: [
      {
        label: "Configuration",
        text: "Check the per-domain SMTP credentials in Mailgun.",
      },
    ],
  },
  {
    label: "Amazon SES",
    value: "amazon-ses",
    host: "email-smtp.eu-west-1.amazonaws.com",
    port: "587",
    security: "STARTTLS",
    authentication: "Yes",
    username: "Amazon SES SMTP username",
    password: "Amazon SES SMTP password",
    requiresDomain: false,
    requiresRegion: true,
    alternativePorts: ["25", "465"],
    notes: [
      {
        label: "Configuration",
        text: "Adjust the region to the Amazon SES region you use.",
      },
      { label: "Configuration", text: "The example region is eu-west-1." },
    ],
  },
  {
    label: "Brevo",
    value: "brevo",
    host: "smtp-relay.brevo.com",
    port: "587",
    security: "STARTTLS",
    authentication: "Yes",
    username: "Brevo SMTP login",
    password: "Brevo SMTP key",
    requiresDomain: false,
    alternativePorts: ["25", "465"],
    spfInclude: "include:spf.brevo.com",
    notes: [{ label: "Configuration", text: "Use the SMTP key from Brevo." }],
  },
  {
    label: "Mailjet",
    value: "mailjet",
    host: "in-v3.mailjet.com",
    port: "587",
    security: "STARTTLS",
    authentication: "Yes",
    username: "Mailjet API key",
    password: "Mailjet secret key",
    requiresDomain: false,
    alternativePorts: ["25", "465"],
    notes: [
      {
        label: "Configuration",
        text: "Mailjet usually uses an API key and secret key as SMTP credentials.",
      },
    ],
  },
  {
    label: "Custom SMTP",
    value: "custom",
    host: "",
    port: "587",
    security: "STARTTLS",
    authentication: "Yes",
    username: "",
    password: "",
    requiresDomain: false,
    custom: true,
    notes: [
      {
        label: "Configuration",
        text: "Use this for your own SMTP servers or non-standard provider settings.",
      },
    ],
  },
];

export const smtpSecurityOptions = [
  {
    label: "STARTTLS",
    value: "STARTTLS",
  },
  {
    label: "SSL/TLS",
    value: "SSL/TLS",
  },
  {
    label: "TLS recommended",
    value: "TLS recommended",
  },
  {
    label: "TLS optional",
    value: "TLS optional",
  },
  {
    label: "None",
    value: "None",
  },
];

export const smtpAuthenticationOptions = [
  {
    label: "Yes",
    value: "Yes",
  },
  {
    label: "No",
    value: "No",
  },
];

export const smtpAuthMethods = [
  {
    label: "Basic auth (username + password)",
    value: "basic",
  },
  {
    label: "OAuth 2.0 (Azure app registration)",
    value: "oauth2",
  },
];

export const mfdBrands = [
  { label: "HP (Jetdirect / FutureSmart)", value: "hp" },
  { label: "Canon (imageRUNNER)", value: "canon" },
  { label: "Ricoh (Smart Device Connector)", value: "ricoh" },
  { label: "Brother (Web Connect / BRAdmin)", value: "brother" },
  { label: "Epson (WorkForce / Web Config)", value: "epson" },
];

function buildHpConfig(config) {
  return [
    "HP printer configuration (via EWS):",
    "1. Open EWS (printer IP in browser)",
    "2. Go to Networking > Advanced > Email Server / SMTP",
    `3. SMTP Server: ${config.host}`,
    `4. Port: ${config.port}`,
    `5. Encryption: ${config.security === "STARTTLS" ? "STARTTLS (if supported)" : config.security}`,
    `6. Authentication: ${config.authentication === "Yes" ? "Enable" : "Disable"}`,
    config.authentication === "Yes" ? `7. Username: ${config.username}` : "",
    config.authentication === "Yes" ? `8. Password: [enter password]` : "",
    config.authentication === "Yes"
      ? "9. Use an 'App password' instead of the mailbox password"
      : "",
    "10. Test the configuration with 'Send Test Email'",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCanonConfig(config) {
  return [
    "Canon imageRUNNER configuration (via EWS / Remote UI):",
    "1. Open Remote UI (printer IP in browser)",
    "2. Go to Settings/Registration > Network > TCP/IP Settings",
    "3. Go to E-Mail/I-Fax Settings > SMTP Server",
    `4. SMTP Server Address: ${config.host}`,
    `5. Port Number: ${config.port}`,
    `6. Enable STARTTLS: ${config.security === "STARTTLS" ? "Yes" : "No"}`,
    `7. Use SSL: ${config.security === "SSL/TLS" ? "Yes" : "No"}`,
    `8. Authentication: ${config.authentication === "Yes" ? "SMTP Authentication (LOGIN/PLAIN)" : "Off"}`,
    config.authentication === "Yes"
      ? `9. User Name (SMTP): ${config.username}`
      : "",
    config.authentication === "Yes" ? "10. Password: [enter password]" : "",
    "11. Set 'Use Separate Authentication for SMTP' if required",
    '12. Enter the "From" address under Email Address',
  ]
    .filter(Boolean)
    .join("\n");
}

function buildRicohConfig(config) {
  return [
    "Ricoh configuration (via Smart Device Connector / WIM):",
    "1. Open WIM (printer IP in browser)",
    "2. Go to Configuration > Device Settings > Email",
    "3. Go to SMTP Server",
    `4. SMTP Server Name: ${config.host}`,
    `5. Port Number: ${config.port}`,
    `6. STARTTLS: ${config.security === "STARTTLS" ? "Yes" : "No"}`,
    `7. Authentication: ${config.authentication === "Yes" ? "SMTP Auth" : "Off"}`,
    config.authentication === "Yes"
      ? `8. Auth User Name: ${config.username}`
      : "",
    config.authentication === "Yes" ? "9. Auth Password: [enter password]" : "",
    '10. Enter "Administrator Email" as the sender',
    "11. Set up Scan to Email through the Address Book",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildBrotherConfig(config) {
  return [
    "Brother configuration (via Web Connect / BRAdmin):",
    "1. Open Web Based Management (printer IP in browser)",
    "2. Go to Network > Protocol > Mail / SMTP",
    `3. SMTP Server Address: ${config.host}`,
    `4. Port: ${config.port}`,
    `5. TLS/SSL: ${config.security === "STARTTLS" ? "STARTTLS" : config.security === "SSL/TLS" ? "SSL" : "Off"}`,
    `6. SMTP Authentication: ${config.authentication === "Yes" ? "SMTP-AUTH" : "No"}`,
    config.authentication === "Yes"
      ? `7. SMTP User Name: ${config.username}`
      : "",
    config.authentication === "Yes" ? "8. SMTP Password: [enter password]" : "",
    '9. Enter the "Sender Address" (the printer\'s email address)',
    "Not all Brother models support STARTTLS; test whether optional TLS works",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildEpsonConfig(config) {
  return [
    "Epson configuration (via Web Config):",
    "1. Open Web Config (printer IP in browser)",
    "2. Go to Network > Email Server",
    `3. SMTP Server: ${config.host}`,
    `4. Port: ${config.port}`,
    `5. SSL/TLS: ${config.security === "STARTTLS" ? "STARTTLS" : config.security === "SSL/TLS" ? "SSL" : "Off"}`,
    `6. Authentication: ${config.authentication === "Yes" ? "On (SMTP Authentication)" : "Off"}`,
    config.authentication === "Yes" ? `7. User Name: ${config.username}` : "",
    config.authentication === "Yes" ? "8. Password: [enter password]" : "",
    "9. Fill in 'Sender E-mail Address'",
    "Epson printers often have a separate 'Reply-to Address' field",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildMfdConfigText(config, brand) {
  switch (brand) {
    case "hp":
      return buildHpConfig(config);
    case "canon":
      return buildCanonConfig(config);
    case "ricoh":
      return buildRicohConfig(config);
    case "brother":
      return buildBrotherConfig(config);
    case "epson":
      return buildEpsonConfig(config);
    default:
      return "";
  }
}

function buildM365OAuth2Config(config) {
  return [
    "Azure app registration for Microsoft 365 SMTP OAuth 2.0:",
    "",
    "Step 1: Create an app registration",
    "1. Go to https://entra.microsoft.com > Applications > App registrations",
    "2. Click 'New registration'",
    '3. Name: e.g. "SMTP Client - {device name}"',
    "4. Supported account types: Accounts in this organizational directory only",
    "5. Redirect URI: leave empty (not needed for client credentials)",
    "6. Click 'Register'",
    "",
    "Step 2: API permissions",
    "7. Go to 'API permissions' > 'Add a permission'",
    "8. Choose 'APIs my organization uses' > search for 'Office 365 Exchange Online'",
    "9. Choose 'Application permissions'",
    "10. Search for 'SMTP.Send' and tick it",
    "11. Click 'Add permissions'",
    "12. Click 'Grant admin consent for {tenant}'",
    "",
    "Step 3: Create a client secret",
    "13. Go to 'Certificates & secrets' > 'Client secrets'",
    "14. Click 'New client secret'",
    "15. Description: e.g. 'SMTP secret'",
    "16. Expiry: choose 12 or 24 months",
    "17. Click 'Add' and copy the value (shown only once!)",
    "",
    "Step 4: SMTP configuration",
    "18. Note the 'Application (client) ID' from the overview",
    "19. Note the 'Directory (tenant) ID'",
    `20. SMTP Host: ${config.host}`,
    `21. Port: ${config.port}`,
    "22. Username = Application ID",
    "23. Password = Client Secret",
    "24. Add 'Scope': https://outlook.office365.com/.default",
    "",
    "Note:",
    "- OAuth 2.0 only works with mailboxes that have SMTP AUTH enabled",
    "- The app registration must exist for at least 24 hours to work reliably",
    "- Note the client secret when creating it; it cannot be viewed again",
  ].join("\n");
}

export function normalizeDomain(value = "") {
  return String(value).trim().toLowerCase();
}

export function normalizeRegion(value = "") {
  return String(value).trim().toLowerCase() || "eu-west-1";
}

export function buildMicrosoft365MxEndpoint(domain = "") {
  const normalizedDomain = normalizeDomain(domain);

  if (!normalizedDomain) {
    return "";
  }

  return `${normalizedDomain.replace(/\./g, "-")}.mail.protection.outlook.com`;
}

export function getSmtpProvider(value) {
  return (
    smtpProviders.find((provider) => provider.value === value) ||
    smtpProviders[0]
  );
}

function supportsUnauthenticatedMfd(providerConfig) {
  return Boolean(providerConfig.requiresDomain || providerConfig.custom);
}

function securityLabelForPort(port, providerSecurity) {
  if (port === "465") {
    return "SSL/TLS (implicit TLS - not STARTTLS)";
  }

  if (port === "25") {
    return `${providerSecurity} (note: port 25 is meant for MTA relay and is often blocked by ISPs/cloud providers)`;
  }

  return providerSecurity;
}

export function buildPortOptions(
  selectedProvider,
  primaryPort,
  primarySecurity,
) {
  const alternativePorts = selectedProvider.alternativePorts || [];

  return [primaryPort, ...alternativePorts].map((port) => ({
    port,
    security: securityLabelForPort(port, primarySecurity),
  }));
}

const PORT_PATTERN = /^\d{1,5}$/;

export function isValidPort(value) {
  const trimmed = String(value).trim();

  if (!PORT_PATTERN.test(trimmed)) {
    return false;
  }

  const port = Number(trimmed);

  return port >= 1 && port <= 65535;
}

const HOSTNAME_PATTERN =
  /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,63}$/i;

export function isValidHostname(value) {
  return HOSTNAME_PATTERN.test(String(value).trim());
}

export function buildSmtpConfiguration({
  provider = "m365-auth",
  domain = "",
  region = "eu-west-1",
  customHost = "",
  customPort = "587",
  customSecurity = "STARTTLS",
  customAuthentication = "Yes",
  customUsername = "",
  customPassword = "",
  mfdMode = false,
  mfdBrand = "",
  authMethod = "basic",
} = {}) {
  const selectedProvider = getSmtpProvider(provider);
  const normalizedDomain = normalizeDomain(domain);
  const normalizedRegion = normalizeRegion(region);

  const mxEndpoint = selectedProvider.requiresDomain
    ? buildMicrosoft365MxEndpoint(normalizedDomain)
    : "";

  const host = selectedProvider.custom
    ? String(customHost).trim()
    : selectedProvider.requiresDomain
      ? mxEndpoint
      : selectedProvider.requiresRegion
        ? `email-smtp.${normalizedRegion}.amazonaws.com`
        : selectedProvider.host;

  let port = selectedProvider.custom
    ? String(customPort || "587").trim()
    : selectedProvider.port;

  let security = selectedProvider.custom
    ? customSecurity
    : selectedProvider.security;

  let authentication = selectedProvider.custom
    ? customAuthentication
    : selectedProvider.authentication;

  const username = selectedProvider.custom
    ? customUsername
    : selectedProvider.username;

  const password = selectedProvider.custom
    ? customPassword || "Fill in yourself"
    : selectedProvider.password;

  let notes = [...(selectedProvider.notes || [])];

  const supportsOAuth2 = selectedProvider.supportsOAuth2 || false;

  let oauth2ConfigText = "";

  const oauth2Port = port;

  if (authMethod === "oauth2" && supportsOAuth2) {
    authentication = "Yes";
    notes = notes.filter((n) => n.label !== "OAuth2");
    notes.push({
      label: "OAuth2",
      text: "OAuth 2.0 with the client credentials grant. Use the Application ID as the username and the Client Secret as the password. Add the scope https://outlook.office365.com/.default.",
    });
    oauth2ConfigText = buildM365OAuth2Config({ host, port: oauth2Port });
  }

  const mfdSupported = supportsUnauthenticatedMfd(selectedProvider);
  const mfdApplied = mfdMode && mfdSupported;

  if (mfdMode && !mfdSupported) {
    notes = notes.filter((n) => n.label !== "MFD");
    notes.push({
      label: "MFD",
      text: `Printer/scanner mode was not applied: ${selectedProvider.label} does not accept unauthenticated port 25 relay. For this device use port 587/465 with the normal credentials above, or choose Microsoft 365 Direct Send/Connector, or your own SMTP server.`,
    });
  }

  if (mfdApplied) {
    port = "25";
    security = "TLS optional";
    authentication = "No";
    notes = notes.filter((n) => n.label !== "MFD");
    notes.push({
      label: "MFD",
      text: "Printer/scanner mode: port 25 without authentication. Make sure the IP is allowed in the connector or firewall.",
    });
  }

  const mfdConfigText =
    mfdApplied && mfdBrand
      ? buildMfdConfigText(
          { host, port, security, authentication, username },
          mfdBrand,
        )
      : "";

  const spfInclude = selectedProvider.spfInclude || "";

  const portOptions = mfdApplied
    ? [{ port, security }]
    : buildPortOptions(selectedProvider, port, security);

  const portDisplay =
    portOptions.length > 1
      ? `${port} (alternative: ${portOptions
          .slice(1)
          .map((opt) => opt.port)
          .join(", ")})`
      : port;

  let hostWarning = null;
  let portWarning = null;

  if (selectedProvider.custom) {
    if (host && !isValidHostname(host)) {
      hostWarning =
        "The hostname looks invalid. Check for spaces, a missing domain extension or other typos.";
    }

    if (customPort && !isValidPort(customPort)) {
      portWarning = "The port must be a number between 1 and 65535.";
    }
  }

  const result = {
    type: "smtpConfigurationBuilder",
    provider: selectedProvider.label,
    host,
    port,
    portDisplay,
    portOptions,
    security,
    authentication,
    username,
    password,
    domain: normalizedDomain,
    mxEndpoint,
    spfInclude,
    notes,
    mfdMode,
    mfdApplied,
    mfdBrand,
    mfdConfigText,
    authMethod,
    supportsOAuth2,
    oauth2ConfigText,
    hostWarning,
    portWarning,
  };

  return {
    ...result,
    status:
      hostWarning || portWarning ? "warning" : host ? "success" : "warning",
    plainText: buildPlainText(result),
  };
}

export async function runSmtpConfigurationTool(tool, inputValues) {
  return buildSmtpConfiguration(inputValues);
}

function buildPlainText(result) {
  const lines = [
    `Provider: ${result.provider}`,
    `SMTP server: ${result.host || "-"}`,
    `Port: ${result.portDisplay || result.port || "-"}`,
    `Security: ${result.security || "-"}`,
    `Authentication: ${result.authentication || "-"}`,
    `Username: ${result.username || "-"}`,
    `Password: ${result.password || "-"}`,
  ];

  if (result.authMethod === "oauth2") {
    lines.push(`Auth method: OAuth 2.0 (client credentials)`);
  }

  if (result.mxEndpoint) {
    lines.push(`MX endpoint: ${result.mxEndpoint}`);
  }

  if (result.spfInclude) {
    lines.push(`SPF: ${result.spfInclude}`);
  }

  return lines.join("\n");
}
