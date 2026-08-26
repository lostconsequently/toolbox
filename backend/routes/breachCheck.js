const express = require("express");

const router = express.Router();

const { asyncHandler } = require("../utils/asyncHandler");
const { fetchApiText, ExternalApiError } = require("../utils/externalApi");
const { createRateLimiter } = require("../utils/rateLimiter");

const breachCheckLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
});

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const PREFIX_PATTERN = /^[0-9a-fA-F]{5}$/;

function parseRangeResponse(text) {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [suffix, countText] = line.split(":");
      const count = Number(countText);

      return {
        suffix: (suffix || "").trim().toUpperCase(),
        count: Number.isFinite(count) ? count : 0,
      };
    })
    .filter((entry) => entry.suffix);
}

// Implements the HIBP k-anonymity model: the client hashes the password
// itself (SHA-1, client-side) and sends only the 5-character hash prefix.
// This route fetches every suffix in that "bucket" and returns the whole
// list - the client matches its own full suffix locally. The plaintext
// password, and even its full hash, never reach this backend.
router.post(
  "/",
  breachCheckLimiter,
  asyncHandler(async (req, res) => {
    const prefix = String(req.body?.prefix || "")
      .trim()
      .toUpperCase();

    if (!PREFIX_PATTERN.test(prefix)) {
      return res.status(400).json({
        error: "Invalid hash prefix",
        code: "breach.invalidPrefix",
      });
    }

    let entries;

    try {
      const rangeText = await fetchApiText(`${HIBP_RANGE_URL}${prefix}`, {
        headers: {
          "Add-Padding": "true",
          "User-Agent": "Toolbox-BreachChecker",
        },
      });

      entries = parseRangeResponse(rangeText);
    } catch (error) {
      if (error instanceof ExternalApiError) {
        return res.status(502).json({
          error: "Have I Been Pwned is unreachable. Try again later.",
          code: "breach.unreachable",
        });
      }

      throw error;
    }

    res.json({
      success: true,
      prefix,
      entries,
    });
  }),
);

module.exports = router;
