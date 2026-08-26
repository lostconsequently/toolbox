const knownSids = {
  "S-1-0-0": {
    name: "Nobody",
    type: "Well-known SID",
    description: "Not a security principal",
  },
  "S-1-1-0": {
    name: "Everyone",
    type: "Well-known SID",
    description: "Every user, including guests",
  },
  "S-1-2-0": {
    name: "Local",
    type: "Well-known SID",
    description: "Users who sign in locally",
  },
  "S-1-3-0": {
    name: "Creator Owner",
    type: "Well-known SID",
    description: "Owner of an object",
  },
  "S-1-3-1": {
    name: "Creator Group",
    type: "Well-known SID",
    description: "Primary group of the owner",
  },
  "S-1-5-18": {
    name: "Local System",
    type: "Service account",
    description: "Windows Local System account",
  },
  "S-1-5-19": {
    name: "Local Service",
    type: "Service account",
    description: "Windows Local Service account",
  },
  "S-1-5-20": {
    name: "Network Service",
    type: "Service account",
    description: "Windows Network Service account",
  },
  "S-1-5-32-544": {
    name: "Administrators",
    type: "Builtin group",
    description: "Local Administrators group",
  },
  "S-1-5-32-545": {
    name: "Users",
    type: "Builtin group",
    description: "Local Users group",
  },
  "S-1-5-32-546": {
    name: "Guests",
    type: "Builtin group",
    description: "Local Guests group",
  },
  "S-1-5-32-547": {
    name: "Power Users",
    type: "Builtin group",
    description: "Legacy local Power Users group",
  },
  "S-1-5-32-548": {
    name: "Account Operators",
    type: "Builtin group",
    description: "Account Operators group",
  },
  "S-1-5-32-549": {
    name: "Server Operators",
    type: "Builtin group",
    description: "Server Operators group",
  },
  "S-1-5-32-550": {
    name: "Print Operators",
    type: "Builtin group",
    description: "Print Operators group",
  },
  "S-1-5-32-551": {
    name: "Backup Operators",
    type: "Builtin group",
    description: "Backup Operators group",
  },
  "S-1-5-32-552": {
    name: "Replicator",
    type: "Builtin group",
    description: "Replicator group",
  },
  "S-1-5-32-555": {
    name: "Remote Desktop Users",
    type: "Builtin group",
    description: "Users allowed to sign in through Remote Desktop",
  },
  "S-1-5-32-556": {
    name: "Network Configuration Operators",
    type: "Builtin group",
    description: "Group for network configuration management",
  },
  "S-1-5-32-558": {
    name: "Performance Monitor Users",
    type: "Builtin group",
    description: "Group for performance monitoring",
  },
  "S-1-5-32-559": {
    name: "Performance Log Users",
    type: "Builtin group",
    description: "Group for performance logging",
  },
  "S-1-5-32-562": {
    name: "Distributed COM Users",
    type: "Builtin group",
    description: "Group for DCOM access",
  },
  "S-1-5-32-569": {
    name: "Cryptographic Operators",
    type: "Builtin group",
    description: "Group for cryptographic operations",
  },
  "S-1-5-32-575": {
    name: "Remote Management Users",
    type: "Builtin group",
    description: "Group for remote management (WinRM)",
  },
  "S-1-5-32-576": {
    name: "Hyper-V Administrators",
    type: "Builtin group",
    description: "Virtual machine administrators",
  },
  "S-1-5-32-578": {
    name: "Hyper-V Workers",
    type: "Builtin group",
    description: "Hyper-V worker processes",
  },
  "S-1-5-32-580": {
    name: "Remote Desktop Services",
    type: "Builtin group",
    description: "Remote Desktop Services group",
  },
  "S-1-5-83-0": {
    name: "NT VIRTUAL MACHINE\\Virtual Machines",
    type: "Service SID",
    description: "Hyper-V virtual machines (guest VM access to host)",
  },
  "S-1-5-90-0": {
    name: "Window Manager\\Window Manager Group",
    type: "Service SID",
    description: "Desktop Window Manager group",
  },
};

const knownRidDescriptions = {
  500: {
    name: "Administrator",
    description: "Default built-in administrator account",
  },
  501: {
    name: "Guest",
    description: "Default built-in guest account",
  },
  502: {
    name: "KRBTGT",
    description: "Kerberos service account in Active Directory",
  },
  512: {
    name: "Domain Admins",
    description: "Domain Admins group",
  },
  513: {
    name: "Domain Users",
    description: "Domain Users group",
  },
  514: {
    name: "Domain Guests",
    description: "Domain Guests group",
  },
  515: {
    name: "Domain Computers",
    description: "Domain Computers group",
  },
  516: {
    name: "Domain Controllers",
    description: "Domain Controllers group",
  },
  517: {
    name: "Cert Publishers",
    description: "Cert Publishers group",
  },
  518: {
    name: "Schema Admins",
    description: "Schema Admins group",
  },
  519: {
    name: "Enterprise Admins",
    description: "Enterprise Admins group",
  },
  520: {
    name: "Group Policy Creator Owners",
    description: "Group for GPO management",
  },
  521: {
    name: "Read-only Domain Controllers",
    description: "RODC group",
  },
  522: {
    name: "Cloneable Domain Controllers",
    description: "Cloneable Domain Controllers group",
  },
  525: {
    name: "Protected Users",
    description: "Protected Users group (Credential Guard)",
  },
  526: {
    name: "Key Admins",
    description: "Key Admins group (AD forest recovery)",
  },
  527: {
    name: "Enterprise Key Admins",
    description: "Enterprise Key Admins group",
  },
  553: {
    name: "RAS and IAS Servers",
    description: "Remote Access and IAS Servers group",
  },
  571: {
    name: "Allowed RODC Password Replication Group",
    description: "Group for RODC password replication",
  },
};

export function normalizeSid(value = "") {
  return String(value).trim().toUpperCase();
}

const MAX_SUB_AUTHORITY = 4294967295;
const MAX_IDENTIFIER_AUTHORITY = 281474976710655;

export function isValidSid(value = "") {
  const sid = normalizeSid(value);
  const parts = sid.split("-");

  if (parts.length < 4) {
    return false;
  }

  if (parts[0] !== "S") {
    return false;
  }

  const numericParts = parts.slice(1);

  if (!numericParts.every((part) => /^\d+$/.test(part))) {
    return false;
  }

  const identifierAuthority = Number(parts[2]);

  if (identifierAuthority > MAX_IDENTIFIER_AUTHORITY) {
    return false;
  }

  const subAuthorities = parts.slice(3);

  return subAuthorities.every((part) => Number(part) <= MAX_SUB_AUTHORITY);
}

function toHexByte(n) {
  return n.toString(16).padStart(2, "0");
}

function toDwordLe(n) {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint32(0, Number(n), true);
  let hex = "";
  for (let i = 0; i < 4; i++) {
    hex += toHexByte(view.getUint8(i));
  }
  return hex;
}

function fromDwordLe(hex) {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  for (let i = 0; i < 4; i++) {
    view.setUint8(i, parseInt(hex.substr(i * 2, 2), 16));
  }
  return view.getUint32(0, true);
}

export function sidToHex(value = "") {
  const sid = normalizeSid(value);
  if (!isValidSid(sid)) return "";

  const parts = sid.split("-");
  const revision = parseInt(parts[1], 10);
  const subCount = parts.length - 3;
  const authParts = parts.slice(2, 3);

  let authBytes;
  if (authParts.length === 1) {
    let authVal = BigInt(authParts[0]);
    const buf = new ArrayBuffer(6);
    const view = new DataView(buf);
    for (let i = 5; i >= 0; i--) {
      view.setUint8(i, Number(authVal & 0xffn));
      authVal >>= 8n;
    }
    authBytes = "";
    for (let i = 0; i < 6; i++) {
      authBytes += toHexByte(view.getUint8(i));
    }
  }

  let hex = toHexByte(revision) + toHexByte(subCount) + authBytes;

  const subAuthorities = parts.slice(3);
  for (const sa of subAuthorities) {
    hex += toDwordLe(sa);
  }

  return hex.toUpperCase();
}

export function hexToSid(value = "") {
  const hex = String(value).trim().replace(/\s/g, "").toUpperCase();
  if (hex.length < 16 || !/^[0-9A-F]+$/.test(hex)) return "";

  const revision = parseInt(hex.substr(0, 2), 16);
  const subCount = parseInt(hex.substr(2, 2), 16);

  const expectedLength = 16 + subCount * 8;

  if (hex.length !== expectedLength) {
    return "";
  }

  const authHex = hex.substr(4, 12);
  let authority = 0n;
  for (let i = 0; i < 6; i++) {
    authority =
      (authority << 8n) + BigInt(parseInt(authHex.substr(i * 2, 2), 16));
  }

  const parts = ["S", String(revision), String(authority)];

  for (let i = 0; i < subCount; i++) {
    const offset = 16 + i * 8;
    const subHex = hex.substr(offset, 8);

    parts.push(String(fromDwordLe(subHex)));
  }

  return parts.join("-");
}

const sddlMap = {
  "S-1-0-0": "NO",
  "S-1-1-0": "WD",
  "S-1-3-0": "CO",
  "S-1-3-1": "CG",
  "S-1-5-7": "AN",
  "S-1-5-11": "AU",
  "S-1-5-18": "SY",
  "S-1-5-19": "LS",
  "S-1-5-20": "NS",
  "S-1-5-32-544": "BA",
  "S-1-5-32-545": "BU",
  "S-1-5-32-546": "BG",
  "S-1-5-32-547": "PU",
  "S-1-5-32-548": "AO",
  "S-1-5-32-549": "SO",
  "S-1-5-32-550": "PO",
  "S-1-5-32-551": "BO",
  "S-1-5-32-552": "RE",
  "S-1-5-32-555": "RD",
  "S-1-5-32-556": "NO",
  "S-1-5-32-558": "MU",
  "S-1-5-32-559": "LU",
  "S-1-5-32-562": "DU",
  "S-1-5-32-569": "CO",
  "S-1-5-32-575": "RM",
  "S-1-5-32-576": "HV",
};

function getSddl(sid) {
  return sddlMap[sid] || "";
}

function getSidHistoryInfo(sid, parts) {
  const isAccountSid =
    parts.length >= 8 &&
    parts[0] === "S" &&
    parts[1] === "1" &&
    parts[2] === "5" &&
    parts[3] === "21";

  if (!isAccountSid) return "";

  return "During domain migrations (ADMT, cross-forest) this SID can appear as a sIDHistory value. sIDHistory preserves access to resources in the old domain.";
}

function getSidCategory(parts) {
  const base = parts.slice(0, 3).join("-");

  if (base === "S-1-5") {
    return "NT Authority";
  }

  if (base === "S-1-1") {
    return "World Authority";
  }

  if (base === "S-1-0") {
    return "Null Authority";
  }

  return "Unknown";
}

function getProfileHint(sid, rid) {
  const parts = sid.split("-");

  const isAccountSid =
    parts.length >= 8 &&
    parts[0] === "S" &&
    parts[1] === "1" &&
    parts[2] === "5" &&
    parts[3] === "21";

  if (!isAccountSid) {
    return "Not applicable";
  }

  const numericRid = Number(rid);

  if (numericRid >= 1000) {
    return "Most likely a local or domain user. Check on the machine under HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList\\SID\\ProfileImagePath.";
  }

  return "Most likely a built-in or default domain account.";
}

export function analyzeSid(value = "") {
  const sid = normalizeSid(value);

  if (!sid) {
    throw new Error("No SID provided.");
  }

  if (!isValidSid(sid)) {
    throw new Error("Invalid SID notation.");
  }

  const parts = sid.split("-");
  const revision = parts[1];
  const identifierAuthority = parts[2];
  const subAuthorities = parts.slice(3);
  const rid = subAuthorities[subAuthorities.length - 1] || "Unknown";

  const knownSid = knownSids[sid];
  const knownRid = knownRidDescriptions[rid];

  const isAccountSid =
    parts.length >= 8 &&
    parts[0] === "S" &&
    parts[1] === "1" &&
    parts[2] === "5" &&
    parts[3] === "21";

  const domainIdentifier = isAccountSid
    ? parts.slice(0, parts.length - 1).join("-")
    : "Not applicable";

  const sidHistoryInfo = getSidHistoryInfo(sid, parts);
  const sddl = getSddl(sid);
  const hex = sidToHex(sid);
  const hexRid = toDwordLe(rid);

  return {
    type: "sidAnalysis",
    sid,
    valid: true,
    known: Boolean(knownSid),
    name: knownSid?.name || knownRid?.name || "Unknown",
    category:
      knownSid?.type || (isAccountSid ? "Account SID" : getSidCategory(parts)),
    description:
      knownSid?.description ||
      knownRid?.description ||
      "No built-in description found",
    revision,
    identifierAuthority,
    subAuthorities,
    rid,
    domainIdentifier,
    profileHint: getProfileHint(sid, rid),
    hex,
    hexRid,
    sddl,
    sidHistoryInfo,
  };
}

export async function runSidTool(tool, inputValues) {
  const sid = inputValues.sid || inputValues.input || "";

  return analyzeSid(sid);
}
