// Talks to Microsoft Entra ID (Azure AD) via OpenID Connect. openid-client
// v6 is ESM-only while this backend is CommonJS, so it's loaded with a
// dynamic import() and cached - every exported function here awaits
// loadClientModule() first.
let clientModulePromise = null;

function loadClientModule() {
  if (!clientModulePromise) {
    clientModulePromise = import("openid-client");
  }

  return clientModulePromise;
}

// Discovery (fetching the tenant's /.well-known/openid-configuration) is a
// network round trip - cache the resulting Configuration keyed by the exact
// tenant/client/secret triple that produced it, and only rebuild when an
// admin actually changes one of those in the Authentication tab.
let cachedConfig = null;
let cachedKey = null;

async function getOidcConfig({ tenantId, clientId, clientSecret }) {
  const key = `${tenantId}:${clientId}:${clientSecret}`;

  if (cachedConfig && cachedKey === key) {
    return cachedConfig;
  }

  const client = await loadClientModule();
  const issuer = new URL(`https://login.microsoftonline.com/${tenantId}/v2.0`);

  const config = await client.discovery(issuer, clientId, clientSecret);

  cachedConfig = config;
  cachedKey = key;

  return config;
}

// Called whenever the stored Entra settings change, so a stale Configuration
// (built from a since-replaced client secret, say) is never reused.
function invalidateOidcConfigCache() {
  cachedConfig = null;
  cachedKey = null;
}

async function buildAuthorizationUrl({
  tenantId,
  clientId,
  clientSecret,
  redirectUri,
}) {
  const client = await loadClientModule();
  const config = await getOidcConfig({ tenantId, clientId, clientSecret });

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();
  const nonce = client.randomNonce();

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  return { url: url.href, codeVerifier, state, nonce };
}

// Exchanges the authorization code for tokens and returns the profile
// fields Toolbox actually needs. `groups` is only populated if the Entra
// app registration is set to emit a `groups` claim directly in the ID token
// (Azure Portal: App registration -> Token configuration -> Add groups
// claim) - this deliberately avoids a separate Microsoft Graph API call
// (and the extra consent scope that would require) to keep the app
// registration to the OIDC basics.
async function handleCallback({
  tenantId,
  clientId,
  clientSecret,
  currentUrl,
  codeVerifier,
  state,
  nonce,
}) {
  const client = await loadClientModule();
  const config = await getOidcConfig({ tenantId, clientId, clientSecret });

  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState: state,
    expectedNonce: nonce,
  });

  const claims = tokens.claims();

  if (!claims) {
    throw new Error("Entra ID did not return an ID token");
  }

  const email = String(
    claims.email || claims.preferred_username || "",
  ).toLowerCase();

  if (!email) {
    throw new Error("Entra ID account has no email or UPN claim");
  }

  return {
    externalId: claims.oid || claims.sub,
    email,
    displayName: claims.name || email,
    groups: Array.isArray(claims.groups) ? claims.groups : [],
  };
}

// Union semantics: allowed by email OR by group membership. Either list
// being empty simply never matches on its own - the route layer separately
// requires at least one of the two lists to be non-empty before entra/hybrid
// mode can even be saved, so this never silently defaults to "allow anyone".
function isAllowed({ email, groups }, { allowedUsers, allowedGroups }) {
  const emailAllowed = (allowedUsers || []).some(
    (allowed) => allowed.toLowerCase() === email,
  );

  const groupAllowed = (allowedGroups || []).some((allowed) =>
    groups.includes(allowed),
  );

  return emailAllowed || groupAllowed;
}

module.exports = {
  getOidcConfig,
  invalidateOidcConfigCache,
  buildAuthorizationUrl,
  handleCallback,
  isAllowed,
};
