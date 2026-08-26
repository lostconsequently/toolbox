const dns = require("node:dns").promises;
const net = require("node:net");

function isPrivateIpv4(address) {
  const parts = address.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return false;
  }

  const [a, b, c] = parts;

  if (a === 0) return true; // "this network" (0.0.0.0/8)
  if (a === 10) return true; // RFC1918
  if (a === 127) return true; // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT, RFC6598
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 0 && c === 0) return true; // IETF protocol assignments, 192.0.0.0/24
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking, RFC2544
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast (224-239), reserved (240-255), broadcast (255.255.255.255)

  return false;
}

// Unwraps an IPv4-mapped ("::ffff:1.2.3.4") or IPv4-compatible ("::1.2.3.4")
// IPv6 literal to its embedded IPv4 address. Node's net.isIP() happily
// accepts these as valid IPv6 addresses, and the OS network stack routes
// them to the underlying IPv4 target - so without unwrapping first, an
// address like "::ffff:169.254.169.254" sails straight past a naive
// IPv6-vs-IPv4 string check and reaches a private/metadata host anyway.
function unwrapMappedIpv4(address) {
  const match = address.match(
    /^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i,
  );

  return match ? match[1] : null;
}

function isPrivateIpv6(address) {
  const normalized = address.toLowerCase();

  if (normalized === "::1" || normalized === "::") return true;
  if (/^fe[89ab]/.test(normalized)) return true; // link-local, fe80::/10
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local, fc00::/7
  if (normalized.startsWith("ff")) return true; // multicast, ff00::/8

  return false;
}

function isPrivateIp(value) {
  const address = String(value || "").trim();

  if (net.isIPv4(address)) {
    return isPrivateIpv4(address);
  }

  if (net.isIPv6(address)) {
    const mappedIpv4 = unwrapMappedIpv4(address);

    if (mappedIpv4) {
      return isPrivateIpv4(mappedIpv4);
    }

    return isPrivateIpv6(address);
  }

  return false;
}

function isBlockedTarget(host) {
  if (!host) {
    return true;
  }

  const value = String(host).trim().toLowerCase();

  if (value === "localhost") {
    return true;
  }

  return isPrivateIp(value);
}

/**
 * Resolves a hostname and validates every returned address against the
 * blocklist, so a DNS record that points at an internal/loopback address
 * (DNS rebinding) can't slip past isBlockedTarget's string-only check.
 * Callers should connect to the returned `address`, not the original
 * hostname, so Node doesn't re-resolve (and re-open the rebinding window).
 */
async function resolveAndValidateTarget(host) {
  const hostname = String(host || "").trim();

  if (!hostname) {
    throw new Error("This address is not allowed.");
  }

  if (isBlockedTarget(hostname)) {
    throw new Error("This address is not allowed.");
  }

  if (net.isIP(hostname)) {
    return { hostname, address: hostname };
  }

  let addresses;

  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("This address could not be resolved.");
  }

  if (!addresses.length) {
    throw new Error("This address could not be resolved.");
  }

  for (const { address } of addresses) {
    if (isBlockedTarget(address)) {
      throw new Error("This address is not allowed.");
    }
  }

  return { hostname, address: addresses[0].address };
}

module.exports = {
  isPrivateIp,
  isBlockedTarget,
  resolveAndValidateTarget,
};
