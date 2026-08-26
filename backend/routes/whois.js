const express = require("express");

const router = express.Router();

const { isBlockedTarget } = require("../utils/networkSecurity");
const { asyncHandler } = require("../utils/asyncHandler");
const { createRateLimiter } = require("../utils/rateLimiter");
const { fetchApiJson, ExternalApiError } = require("../utils/externalApi");

const whoisLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });

function extractRegistrar(entities) {
  const registrarEntity = entities?.find((entity) =>
    entity.roles?.includes("registrar"),
  );

  if (!registrarEntity) {
    return { name: null, ianaId: null };
  }

  const vcardEntries = registrarEntity.vcardArray?.[1];
  const fnEntry = Array.isArray(vcardEntries)
    ? vcardEntries.find((entry) => entry[0] === "fn")
    : null;

  const ianaEntry = registrarEntity.publicIds?.find(
    (publicId) => publicId.type === "IANA Registrar ID",
  );

  return {
    name: fnEntry?.[3] || null,
    ianaId: ianaEntry?.identifier || null,
  };
}

router.get(
  "/:domain",
  whoisLimiter,
  asyncHandler(async (req, res) => {
    const domain = String(req.params.domain || "").trim();

    if (!domain) {
      return res.status(400).json({
        error: "No domain provided",
        code: "whois.noDomain",
      });
    }

    if (isBlockedTarget(domain)) {
      return res.status(403).json({
        error: "This address is not allowed",
        code: "net.addressNotAllowed",
      });
    }

    let data;

    try {
      data = await fetchApiJson(
        `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      );
    } catch (error) {
      if (error instanceof ExternalApiError) {
        return res.status(error.status || 502).json({
          error: "RDAP lookup failed",
          code: "whois.lookupFailed",
        });
      }

      throw error;
    }

    const registrationEvent = data.events?.find(
      (event) => event.eventAction === "registration",
    );

    const expirationEvent = data.events?.find(
      (event) => event.eventAction === "expiration",
    );

    const lastChangedEvent = data.events?.find(
      (event) => event.eventAction === "last changed",
    );

    const registrar = extractRegistrar(data.entities);

    res.json({
      success: true,
      domain: data.ldhName,
      handle: data.handle,
      status: data.status || [],
      registered: registrationEvent?.eventDate || null,
      expires: expirationEvent?.eventDate || null,
      updated: lastChangedEvent?.eventDate || null,
      nameservers: data.nameservers?.map((ns) => ns.ldhName) || [],
      registrar: registrar.name,
      registrarIanaId: registrar.ianaId,
      dnssec: Boolean(data.secureDNS?.delegationSigned),
    });
  }),
);

module.exports = router;
