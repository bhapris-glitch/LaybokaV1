/**
 * ============================================================================
 * Layboka AI — V1
 * Shopify OAuth Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/oauth.service.js
 *
 * Purpose:
 * - Generate Shopify OAuth authorization URL
 * - Validate OAuth state
 * - Exchange authorization code for token
 * - Fetch Shopify shop information
 * - Support Shopify expiring offline tokens
 *
 * ============================================================================
 */

'use strict';

const crypto = require('crypto');


// ============================================================================
// CONFIG
// ============================================================================

const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_API_VERSION ||
  '2026-07';

const SHOPIFY_CLIENT_ID =
  process.env.SHOPIFY_API_KEY ||
  process.env.SHOPIFY_CLIENT_ID;

const SHOPIFY_CLIENT_SECRET =
  process.env.SHOPIFY_API_SECRET ||
  process.env.SHOPIFY_CLIENT_SECRET;

const SHOPIFY_SCOPES =
  process.env.SHOPIFY_SCOPES ||
  'read_products,read_orders';


// ============================================================================
// HELPERS
// ============================================================================

function normalizeShop(shop) {

  if (!shop || typeof shop !== 'string') {
    throw new Error(
      'Shop domain is required'
    );
  }

  let value =
    shop
      .trim()
      .toLowerCase();

  value =
    value.replace(
      /^https?:\/\//,
      ''
    );

  value =
    value.split('/')[0];

  if (
    !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(
      value
    )
  ) {
    throw new Error(
      'Invalid Shopify shop domain'
    );
  }

  return value;
}


function isConfigured() {

  return Boolean(
    SHOPIFY_CLIENT_ID &&
    SHOPIFY_CLIENT_SECRET
  );
}


function createOAuthState() {

  return crypto
    .randomBytes(32)
    .toString('hex');
}


function timingSafeEqualHex(
  valueA,
  valueB
) {

  if (
    !valueA ||
    !valueB ||
    typeof valueA !== 'string' ||
    typeof valueB !== 'string'
  ) {
    return false;
  }

  const a =
    Buffer.from(
      valueA,
      'utf8'
    );

  const b =
    Buffer.from(
      valueB,
      'utf8'
    );

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    a,
    b
  );
}


// ============================================================================
// OAUTH URL
// ============================================================================

function buildAuthorizationUrl({
  shop,
  state,
  redirectUri,
}) {

  if (!isConfigured()) {
    throw new Error(
      'Shopify OAuth is not configured'
    );
  }

  const normalizedShop =
    normalizeShop(shop);

  if (!state) {
    throw new Error(
      'OAuth state is required'
    );
  }

  if (!redirectUri) {
    throw new Error(
      'OAuth redirect URI is required'
    );
  }

  const params =
    new URLSearchParams();

  params.set(
    'client_id',
    SHOPIFY_CLIENT_ID
  );

  params.set(
    'scope',
    SHOPIFY_SCOPES
  );

  params.set(
    'redirect_uri',
    redirectUri
  );

  params.set(
    'state',
    state
  );

  return (
    `https://${normalizedShop}/admin/oauth/authorize?${params.toString()}`
  );
}


// ============================================================================
// STATE VALIDATION
// ============================================================================

function validateState(
  receivedState,
  expectedState
) {

  if (
    !receivedState ||
    !expectedState
  ) {
    return false;
  }

  return timingSafeEqualHex(
    receivedState,
    expectedState
  );
}


// ============================================================================
// HMAC VALIDATION
// ============================================================================

function verifyOAuthHmac(query) {

  if (
    !query ||
    typeof query !== 'object'
  ) {
    return false;
  }

  const receivedHmac =
    query.hmac;

  if (!receivedHmac) {
    return false;
  }

  const params =
    Object.keys(query)
      .filter(
        (key) =>
          key !== 'hmac' &&
          key !== 'signature'
      )
      .sort()
      .map(
        (key) =>
          `${key}=${Array.isArray(query[key])
            ? query[key].join(',')
            : query[key]}`
      )
      .join('&');

  const generatedHmac =
    crypto
      .createHmac(
        'sha256',
        SHOPIFY_CLIENT_SECRET
      )
      .update(params)
      .digest('hex');

  return timingSafeEqualHex(
    generatedHmac,
    receivedHmac
  );
}


// ============================================================================
// CODE EXCHANGE
// ============================================================================

async function exchangeCodeForToken({
  shop,
  code,
}) {

  if (!isConfigured()) {
    throw new Error(
      'Shopify OAuth is not configured'
    );
  }

  const normalizedShop =
    normalizeShop(shop);

  if (!code) {
    throw new Error(
      'OAuth code is required'
    );
  }

  const response =
    await fetch(
      `https://${normalizedShop}/admin/oauth/access_token`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Accept:
            'application/json',
        },

        body: JSON.stringify({
          client_id:
            SHOPIFY_CLIENT_ID,

          client_secret:
            SHOPIFY_CLIENT_SECRET,

          code,

          expiring: true,
        }),
      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data?.errors
        ? JSON.stringify(data.errors)
        : `Shopify OAuth failed with status ${response.status}`
    );
  }


  if (!data.access_token) {
    throw new Error(
      'Shopify did not return an access token'
    );
  }


  return {
    accessToken:
      data.access_token,

    refreshToken:
      data.refresh_token || null,

    expiresIn:
      Number(data.expires_in) || null,

    refreshTokenExpiresIn:
      Number(
        data.refresh_token_expires_in
      ) || null,

    tokenType:
      data.refresh_token
        ? 'expiring_offline'
        : 'legacy_offline',
  };
}


// ============================================================================
// SHOP INFO
// ============================================================================

async function getShopInfo({
  shop,
  accessToken,
}) {

  const normalizedShop =
    normalizeShop(shop);

  if (!accessToken) {
    throw new Error(
      'Shopify access token is required'
    );
  }

  const response =
    await fetch(
      `https://${normalizedShop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
      {
        method: 'GET',

        headers: {
          Accept:
            'application/json',

          'X-Shopify-Access-Token':
            accessToken,
        },
      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data?.errors
        ? JSON.stringify(data.errors)
        : `Shopify shop request failed with status ${response.status}`
    );
  }


  if (!data.shop) {
    throw new Error(
      'Shopify shop information missing'
    );
  }


  return data.shop;
}


// ============================================================================
// FULL OAUTH FLOW
// ============================================================================

async function completeOAuth({
  shop,
  code,
}) {

  const token =
    await exchangeCodeForToken({
      shop,
      code,
    });

  const shopInfo =
    await getShopInfo({
      shop,
      accessToken:
        token.accessToken,
    });

  return {
    shop:
      normalizeShop(shop),

    shopInfo,

    ...token,
  };
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  SHOPIFY_API_VERSION,
  SHOPIFY_SCOPES,

  normalizeShop,
  isConfigured,

  createOAuthState,
  buildAuthorizationUrl,

  validateState,
  verifyOAuthHmac,

  exchangeCodeForToken,
  getShopInfo,
  completeOAuth,
};
