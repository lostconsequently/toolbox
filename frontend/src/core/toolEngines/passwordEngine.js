function getSecureRandomIndex(max) {
  const values = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;

  let value;

  do {
    crypto.getRandomValues(values);
    value = values[0];
  } while (value >= limit);

  return value % max;
}

function calculateStrength(entropy) {
  if (entropy >= 80) {
    return "Strong";
  }

  if (entropy >= 60) {
    return "Average";
  }

  return "Weak";
}

function countEnabledCategories(options) {
  return [
    options.includeLowercase,
    options.includeUppercase,
    options.includeNumbers,
    options.includeSpecial,
  ].filter(Boolean).length;
}

function checkAdCompatible(options) {
  return options.length >= 8 && countEnabledCategories(options) >= 3;
}

export function generatePassword(options = {}) {
  const length = Number(options.length) || 16;

  const includeLowercase = options.includeLowercase !== false;

  const includeUppercase = options.includeUppercase !== false;

  const includeNumbers = options.includeNumbers !== false;

  const includeSpecial = options.includeSpecial !== false;

  const excludeAmbiguous = options.excludeAmbiguous === true;

  let lowercase = "abcdefghijklmnopqrstuvwxyz";
  let uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let numbers = "0123456789";
  let special = "!@#$%^&()-_=+[]{}";

  if (excludeAmbiguous) {
    lowercase = lowercase.replace(/[lo]/g, "");
    uppercase = uppercase.replace(/[IO]/g, "");
    numbers = numbers.replace(/[01]/g, "");
  }

  let charset = "";

  if (includeLowercase) {
    charset += lowercase;
  }

  if (includeUppercase) {
    charset += uppercase;
  }

  if (includeNumbers) {
    charset += numbers;
  }

  if (includeSpecial) {
    charset += special;
  }

  if (!charset.length) {
    throw new Error("No character set selected.");
  }

  if (length < 8) {
    throw new Error("Use at least 8 characters.");
  }

  if (length > 128) {
    throw new Error("Use at most 128 characters.");
  }

  let password = "";

  for (let index = 0; index < length; index++) {
    const randomIndex = getSecureRandomIndex(charset.length);

    password += charset[randomIndex];
  }

  const entropy = Math.round(Math.log2(charset.length) * length);

  const strength = calculateStrength(entropy);

  const adCompatible = checkAdCompatible({
    length,
    includeLowercase,
    includeUppercase,
    includeNumbers,
    includeSpecial,
  });

  return {
    type: "passwordGenerator",
    password,
    length,
    entropy,
    strength,
    adCompatible,
    options: {
      includeLowercase,
      includeUppercase,
      includeNumbers,
      includeSpecial,
      excludeAmbiguous,
    },
  };
}

export function generatePasswords(count, options = {}) {
  return Array.from(
    { length: count },
    () => generatePassword(options).password,
  );
}

const STRENGTH_POOL_SIZES = {
  lower: 26,
  upper: 26,
  digit: 10,
  special: 32,
};

export function analyzePasswordStrength(password = "") {
  const length = password.length;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  let poolSize = 0;

  if (hasLower) poolSize += STRENGTH_POOL_SIZES.lower;
  if (hasUpper) poolSize += STRENGTH_POOL_SIZES.upper;
  if (hasDigit) poolSize += STRENGTH_POOL_SIZES.digit;
  if (hasSpecial) poolSize += STRENGTH_POOL_SIZES.special;

  const entropy =
    poolSize > 0 && length > 0 ? Math.round(Math.log2(poolSize) * length) : 0;

  const strength = calculateStrength(entropy);

  const categoriesUsed = [hasLower, hasUpper, hasDigit, hasSpecial].filter(
    Boolean,
  ).length;

  const adCompatible = checkAdCompatible({
    length,
    includeLowercase: hasLower,
    includeUppercase: hasUpper,
    includeNumbers: hasDigit,
    includeSpecial: hasSpecial,
  });

  return {
    length,
    entropy,
    strength,
    adCompatible,
    categoriesUsed,
  };
}

export async function runPasswordTool(tool, inputValues) {
  return generatePassword(inputValues);
}
