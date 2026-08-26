export const secretPresets = [
  {
    label: "JWT Secret",
    recommendedLength: 64,
    description: "Recommended for JWT signing secrets",
  },
  {
    label: "API Key",
    recommendedLength: 32,
    description: "Suitable for API keys",
  },
  {
    label: "Session Secret",
    recommendedLength: 64,
    description: "Suitable for Express sessions",
  },
  {
    label: "Database Secret",
    recommendedLength: 48,
    description: "Suitable for application configuration",
  },
  {
    label: "Encryption Key",
    recommendedLength: 64,
    description: "Suitable for encryption keys",
  },
  {
    label: "M365 Client Secret",
    recommendedLength: 32,
    description: "Client secret for Entra ID / Azure App Registration",
  },
  {
    label: "Random String",
    recommendedLength: 24,
    description: "General-purpose random string",
  },
];

export const charsetOptions = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  special: "!@()-_:;.?~",
};

export function buildCharset({ uppercase, lowercase, numbers, special } = {}) {
  let chars = "";
  if (uppercase !== false) chars += charsetOptions.uppercase;
  if (lowercase !== false) chars += charsetOptions.lowercase;
  if (numbers !== false) chars += charsetOptions.numbers;
  if (special !== false) chars += charsetOptions.special;

  if (!chars) {
    throw new Error("No character set selected.");
  }

  return chars;
}

function randomCharsetIndex(value, max) {
  const limit = Math.floor(0x100000000 / max) * max;

  return value < limit ? value % max : null;
}

export function generateSecret(length = 64, options = {}) {
  const safeLength = Math.max(8, Math.min(256, Number(length) || 64));
  const chars = buildCharset(options);

  let result = "";

  while (result.length < safeLength) {
    const array = new Uint32Array(safeLength - result.length);

    crypto.getRandomValues(array);

    for (let i = 0; i < array.length; i += 1) {
      const index = randomCharsetIndex(array[i], chars.length);

      if (index !== null) {
        result += chars[index];
      }
    }
  }

  return (options.prefix || "") + result + (options.suffix || "");
}

export function generateSecrets(count = 5, length = 64, options = {}) {
  return Array.from({ length: count }, () => generateSecret(length, options));
}

export function getSecretStrength(length) {
  const secretLength = Number(length) || 0;

  if (secretLength < 32) {
    return {
      label: "Weak",
      status: "error",
    };
  }

  if (secretLength < 64) {
    return {
      label: "Good",
      status: "warning",
    };
  }

  return {
    label: "Excellent",
    status: "success",
  };
}

export async function runSecretTool() {
  return {
    type: "secretGenerator",
  };
}
