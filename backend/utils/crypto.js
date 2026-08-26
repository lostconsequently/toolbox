const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

// AUTH_ENCRYPTION_KEY is a separate secret from ADMIN_PASSWORD/session
// tokens on purpose (the user chose "new env var" over reusing an existing
// one during Phase 2 planning) - it exists solely to protect the Entra
// client secret at rest, so rotating it never touches sessions or the local
// admin password.
function getKey() {
  const raw = process.env.AUTH_ENCRYPTION_KEY;

  if (!raw) return null;

  // 64 hex chars = 32 bytes, required for AES-256.
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) return null;

  return Buffer.from(raw, "hex");
}

function hasEncryptionKey() {
  return Boolean(getKey());
}

function encrypt(plaintext) {
  const key = getKey();

  if (!key) {
    throw new Error(
      "AUTH_ENCRYPTION_KEY is not set (or invalid) - see .env.example",
    );
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext].map((buf) => buf.toString("hex")).join(":");
}

function decrypt(encoded) {
  const key = getKey();

  if (!key) {
    throw new Error(
      "AUTH_ENCRYPTION_KEY is not set (or invalid) - see .env.example",
    );
  }

  const [ivHex, authTagHex, ciphertextHex] = encoded.split(":");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, "hex"),
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

module.exports = { encrypt, decrypt, hasEncryptionKey };
