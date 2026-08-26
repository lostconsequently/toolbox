export const cidrOptions = Array.from({ length: 32 }, (_, i) => `/${i + 1}`);

export function ipToInt(ip) {
  return (
    ip
      .split(".")
      .map(Number)
      .reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0
  );
}

export function intToIp(int) {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join(".");
}

export function isValidIpv4(ip) {
  const parts = String(ip).split(".");

  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    const num = Number(part);

    return Number.isInteger(num) && num >= 0 && num <= 255;
  });
}

function isRfc1918(ip) {
  const parts = String(ip).split(".").map(Number);
  if (parts.length !== 4) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

export function calculateSubnet(ip, cidr) {
  if (!isValidIpv4(ip)) {
    throw new Error("Invalid IPv4 address.");
  }

  const prefix = Number(String(cidr).replace("/", ""));

  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error("Invalid CIDR prefix. Use a value between /0 and /32.");
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;

  const ipInt = ipToInt(ip);

  const network = ipInt & mask;

  const broadcast = network | (~mask >>> 0);

  const firstHost = prefix >= 31 ? network : network + 1;

  const lastHost = prefix >= 31 ? broadcast : broadcast - 1;

  const hostCount =
    prefix === 32
      ? 1
      : prefix === 31
        ? 2
        : Math.max(0, Math.pow(2, 32 - prefix) - 2);

  return {
    ip,
    cidr: `/${prefix}`,
    subnetMask: intToIp(mask),
    wildcardMask: intToIp(~mask >>> 0),
    networkAddress: intToIp(network),
    broadcastAddress: intToIp(broadcast),
    firstHost: intToIp(firstHost),
    lastHost: intToIp(lastHost),
    hostCount,
    isRfc1918: isRfc1918(ip),
  };
}

export async function runSubnetTool(tool, inputValues) {
  return calculateSubnet(inputValues.ip, inputValues.cidr);
}
