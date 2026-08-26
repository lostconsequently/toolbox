const dns = require("node:dns").promises;
const { createResolver: createDefaultResolver } = require("./dnsResolver");

const supportedRecordTypes = [
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "TXT",
  "NS",
  "SOA",
  "CAA",
  "SRV",
  "PTR",
];

const publicResolvers = [
  { id: "google", name: "Google Public DNS", servers: ["8.8.8.8", "8.8.4.4"] },
  {
    id: "cloudflare",
    name: "Cloudflare 1.1.1.1",
    servers: ["1.1.1.1", "1.0.0.1"],
  },
  { id: "quad9", name: "Quad9", servers: ["9.9.9.9", "149.112.112.112"] },
  {
    id: "opendns",
    name: "OpenDNS",
    servers: ["208.67.222.222", "208.67.220.220"],
  },
  {
    id: "adguard",
    name: "AdGuard DNS",
    servers: ["94.140.14.14", "94.140.15.15"],
  },
];

function translateDnsError(code) {
  const errors = {
    NXDOMAIN: "Domain does not exist (NXDOMAIN)",
    SERVFAIL: "Resolver could not answer (SERVFAIL)",
    REFUSED: "Resolver refused the query (REFUSED)",
    ENOTFOUND: "Record not found (ENOTFOUND)",
    ENODATA: "No records of this type found",
    ETIMEOUT: "DNS query timeout (ETIMEOUT)",
    ECONNREFUSED: "Connection to resolver refused (ECONNREFUSED)",
    FORMERR: "Invalid DNS request (FORMERR)",
    NOTIMP: "Record type not supported by resolver (NOTIMP)",
  };

  return errors[code] || `DNS error (${code})`;
}

function formatTxtRecord(record) {
  return Array.isArray(record) ? record.join("") : String(record);
}

function formatAnswer(recordType, record) {
  if (recordType === "A" || recordType === "AAAA") {
    if (typeof record === "object" && record.address) {
      return { data: record.address, ttl: record.ttl ?? null };
    }
    return { data: String(record), ttl: null };
  }

  if (recordType === "MX") {
    return { data: `${record.priority} ${record.exchange}`, ttl: null };
  }

  if (recordType === "TXT") {
    return { data: formatTxtRecord(record), ttl: null };
  }

  if (recordType === "SRV") {
    return {
      data: `${record.priority} ${record.weight} ${record.port} ${record.name}`,
      ttl: null,
    };
  }

  if (recordType === "SOA") {
    return {
      data: [
        `nsname=${record.nsname}`,
        `hostmaster=${record.hostmaster}`,
        `serial=${record.serial}`,
        `refresh=${record.refresh}`,
        `retry=${record.retry}`,
        `expire=${record.expire}`,
        `minttl=${record.minttl}`,
      ].join(" "),
      ttl: null,
    };
  }

  if (recordType === "CAA") {
    return {
      data: Object.entries(record)
        .map(([key, value]) => `${key}=${value}`)
        .join(" "),
      ttl: null,
    };
  }

  return { data: String(record), ttl: null };
}

async function resolveRecords(resolver, name, recordType) {
  if (recordType === "A") {
    return resolver.resolve4(name, { ttl: true });
  }

  if (recordType === "AAAA") {
    return resolver.resolve6(name, { ttl: true });
  }

  if (recordType === "CNAME") {
    return resolver.resolveCname(name);
  }

  if (recordType === "MX") {
    return resolver.resolveMx(name);
  }

  if (recordType === "TXT") {
    return resolver.resolveTxt(name);
  }

  if (recordType === "NS") {
    return resolver.resolveNs(name);
  }

  if (recordType === "SOA") {
    return [await resolver.resolveSoa(name)];
  }

  if (recordType === "CAA") {
    return resolver.resolveCaa(name);
  }

  if (recordType === "SRV") {
    return resolver.resolveSrv(name);
  }

  if (recordType === "PTR") {
    return resolver.resolvePtr(name);
  }

  return resolver.resolve(name, recordType);
}

function createResolver(resolverId, customServers) {
  if (!resolverId || resolverId === "backend") {
    // The system-configured resolver isn't guaranteed to be reachable
    // (e.g. restricted/containerized environments) - fall back to the
    // same explicit public resolver every other DNS-touching route in
    // this codebase already relies on, instead of the bare `dns` module.
    return createDefaultResolver();
  }

  const servers = customServers?.length
    ? customServers
    : publicResolvers.find((entry) => entry.id === resolverId)?.servers;

  if (!servers?.length) {
    return createDefaultResolver();
  }

  const resolver = new dns.Resolver();

  resolver.setServers(servers);

  return resolver;
}

module.exports = {
  supportedRecordTypes,
  publicResolvers,
  translateDnsError,
  formatAnswer,
  resolveRecords,
  createResolver,
};
