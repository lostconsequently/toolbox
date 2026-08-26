const fs = require("fs");

// Raster only, no SVG - an uploaded SVG can carry <script>/event-handler
// XSS and this app has no sanitizer for it, so the safer default is to not
// accept the format at all (the built-in default logo stays SVG; only
// admin-uploaded replacements are raster). Content is identified by magic
// bytes, never by the client-supplied extension/Content-Type, the same
// reasoning backup.js uses for .db uploads.
const SIGNATURES = [
  {
    ext: "png",
    mime: "image/png",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { ext: "jpg", mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
];

function detectImageType(filePath) {
  let fd;

  try {
    fd = fs.openSync(filePath, "r");

    const buffer = Buffer.alloc(16);
    const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);

    for (const signature of SIGNATURES) {
      if (
        bytesRead >= signature.bytes.length &&
        signature.bytes.every((byte, index) => buffer[index] === byte)
      ) {
        return { ext: signature.ext, mime: signature.mime };
      }
    }

    // WEBP: "RIFF" (bytes 0-3), then a 4-byte size, then "WEBP" (bytes 8-11).
    if (
      bytesRead >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
      return { ext: "webp", mime: "image/webp" };
    }

    return null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore
      }
    }
  }
}

module.exports = { detectImageType };
