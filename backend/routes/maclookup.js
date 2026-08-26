const express = require("express");

const { asyncHandler } = require("../utils/asyncHandler");
const { createRateLimiter } = require("../utils/rateLimiter");
const { fetchApi } = require("../utils/externalApi");

const router = express.Router();

const maclookupLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });

// OUI-to-vendor mappings are assigned by the IEEE and essentially never
// change, so caching them server-side (shared across every technician, not
// just per-browser-session) is safe with a long TTL - and it's the single
// biggest lever against exhausting api.macvendors.com's low free-tier rate
// limit for the whole organisation.
const VENDOR_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const vendorCache = new Map();

function isValidMac(value) {
  const raw = String(value).trim();

  // Only hex digits plus the standard MAC separators are accepted - anything
  // else (stray letters, spaces, punctuation) means the input wasn't really
  // a MAC address, even if stripping non-hex characters would happen to
  // leave 12 hex characters behind.
  if (!/^[0-9a-fA-F:.-]+$/.test(raw)) {
    return false;
  }

  const cleaned = raw.replace(/[^a-fA-F0-9]/g, "");

  return cleaned.length === 12;
}

function getOuiPrefix(value) {
  return String(value)
    .replace(/[^a-fA-F0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();
}

router.get(
  "/:mac",
  maclookupLimiter,
  asyncHandler(async (req, res) => {
    const mac = String(req.params.mac || "").trim();

    if (!mac || !isValidMac(mac)) {
      return res.status(400).json({
        error: "Invalid MAC address. Use a format like 00:1A:2B:3C:4D:5E.",
        code: "mac.invalidAddress",
      });
    }

    const ouiPrefix = getOuiPrefix(mac);
    const cached = vendorCache.get(ouiPrefix);

    if (cached && Date.now() < cached.expiresAt) {
      return res.json({
        success: true,
        mac,
        vendor: cached.vendor,
        cached: true,
      });
    }

    const response = await fetchApi(
      `https://api.macvendors.com/${encodeURIComponent(mac)}`,
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Vendor not found",
        code: "mac.vendorNotFound",
      });
    }

    const vendor = await response.text();

    vendorCache.set(ouiPrefix, {
      vendor,
      expiresAt: Date.now() + VENDOR_CACHE_TTL_MS,
    });

    res.json({
      success: true,
      mac,
      vendor,
      cached: false,
    });
  }),
);

module.exports = router;
