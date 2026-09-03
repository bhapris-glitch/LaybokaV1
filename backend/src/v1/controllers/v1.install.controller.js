/**
 * ============================================================================
 * Layboka AI - V1
 * Installation Controller
 * ============================================================================
 *
 * File:
 * backend/src/v1/controllers/v1.install.controller.js
 *
 * Purpose:
 * - Start Shopify installation
 * - Validate Shopify callback
 * - Exchange OAuth code for access token
 * - Create/update V1Shop
 * - Start the 5-day trial
 * - Start initial product synchronization
 * - Redirect merchant to V1 success page
 *
 * IMPORTANT:
 * - This controller is V1-specific.
 * - Existing Shopify installation code is not modified.
 * - Trial cannot be reset by reinstalling.
 * ============================================================================
 */

'use strict';

const crypto = require('crypto');

const V1Shop = require('../models/V1Shop');

const {
  startTrial
} = require('../services/v1.trial.service');

const {
  syncProducts
} = require('../services/v1.product.service');


// ============================================================================
// CONFIG
// ============================================================================

const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_API_VERSION || '2026-07';

const SHOPIFY_CLIENT_ID =
  process.env.SHOPIFY_API_KEY ||
  process.env.SHOPIFY_CLIENT_ID;

const SHOPIFY_CLIENT_SECRET =
  process.env.SHOPIFY_API_SECRET ||
  process.env.SHOPIFY_CLIENT_SECRET;

const SHOPIFY_SCOPES =
  process.env.SHOPIFY_SCOPES ||
  'read_products,read_orders';

const APP_URL =
  process.env.APP_URL ||
  process.env.BACKEND_URL ||
  'http://localhost:3000';

const V1_SUCCESS_URL =
  process.env.V1_SUCCESS_URL ||
  `${APP_URL}/v1/success.html`;


// ============================================================================
// START INSTALLATION
// ============================================================================

/**
 * GET /v1/install
 *
 * Example:
 * /v1/install?shop=example.myshopify.com
 */
async function startInstallation(req, res) {
  try {
    const shop = normalizeShopDomain(req.query.shop);

    validateShopDomain(shop);

    ensureShopifyConfig();

    // ------------------------------------------------------------------------
    // Generate CSRF state
    // ------------------------------------------------------------------------

    const state = crypto.randomBytes(32).toString('hex');

    /*
     * State must survive the redirect to Shopify.
     *
     * For a production deployment using multiple backend instances,
     * replace this cookie-only storage with a shared session/Redis store.
     */
    res.cookie('layboka_v1_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/'
    });

    // ------------------------------------------------------------------------
    // Shopify OAuth URL
    // ------------------------------------------------------------------------

    const redirectUri =
      getOAuthCallbackUrl();

    const params = new URLSearchParams({
      client_id: SHOPIFY_CLIENT_ID,
      scope: SHOPIFY_SCOPES,
      redirect_uri: redirectUri,
      state
    });

    const authorizationUrl =
      `https://${shop}/admin/oauth/authorize?${params.toString()}`;

    return res.redirect(authorizationUrl);

  } catch (error) {
    console.error(
      '[V1 INSTALL] Start installation failed:',
      error
    );

    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}


// ============================================================================
// OAUTH CALLBACK
// ============================================================================

/**
 * GET /v1/install/callback
 *
 * Shopify redirects the merchant here after authorization.
 */
async function handleCallback(req, res) {
  try {
    const {
      shop: rawShop,
      code,
      state,
      hmac
    } = req.query;

    const shop =
      normalizeShopDomain(rawShop);

    validateShopDomain(shop);

    if (!code) {
      throw new Error(
        'Missing Shopify authorization code'
      );
    }

    if (!state) {
      throw new Error(
        'Missing OAuth state'
      );
    }

    // ------------------------------------------------------------------------
    // Validate OAuth state
    // ------------------------------------------------------------------------

    const savedState =
      req.cookies?.layboka_v1_oauth_state;

    if (
      !savedState ||
      !safeCompare(savedState, state)
    ) {
      throw new Error(
        'Invalid OAuth state'
      );
    }

    // Clear state immediately.
    res.clearCookie(
      'layboka_v1_oauth_state',
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      }
    );

    // ------------------------------------------------------------------------
    // Validate Shopify HMAC
    // ------------------------------------------------------------------------

    if (!hmac) {
      throw new Error(
        'Missing Shopify HMAC'
      );
    }

    const validHmac =
      verifyShopifyHmac(
        req.query,
        hmac
      );

    if (!validHmac) {
      throw new Error(
        'Invalid Shopify HMAC'
      );
    }

    // ------------------------------------------------------------------------
    // Exchange authorization code
    // ------------------------------------------------------------------------

    const tokenData =
      await exchangeAuthorizationCode({
        shop,
        code
      });

    if (!tokenData.access_token) {
      throw new Error(
        'Shopify did not return an access token'
      );
    }

    // ------------------------------------------------------------------------
    // Get shop information
    // ------------------------------------------------------------------------

    const shopInfo =
      await fetchShopInformation({
        shop,
        accessToken: tokenData.access_token
      });

    // ------------------------------------------------------------------------
    // Create/update V1 shop
    // ------------------------------------------------------------------------

    const v1Shop =
      await createOrUpdateShop({
        shop,
        accessToken: tokenData.access_token,
        tokenData,
        shopInfo
      });

    // ------------------------------------------------------------------------
    // Start trial ONLY when appropriate.
    //
    // startTrial() itself protects against resetting an existing trial.
    // ------------------------------------------------------------------------

    await startTrial(v1Shop);

    // ------------------------------------------------------------------------
    // Initial product sync
    // ------------------------------------------------------------------------

    /*
     * Do not block the merchant's browser waiting for thousands of products.
     *
     * The synchronization runs in the background.
     */
    syncProducts(v1Shop)
      .catch(error => {
        console.error(
          `[V1 PRODUCT SYNC] ${shop}:`,
          error
        );
      });

    // ------------------------------------------------------------------------
    // Redirect merchant
    // ------------------------------------------------------------------------

    const redirect =
      new URL(V1_SUCCESS_URL);

    redirect.searchParams.set(
      'shop',
      shop
    );

    redirect.searchParams.set(
      'shopId',
      String(v1Shop._id)
    );

    return res.redirect(
      redirect.toString()
    );

  } catch (error) {
    console.error(
      '[V1 INSTALL] OAuth callback failed:',
      error
    );

    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}


// ============================================================================
// CREATE / UPDATE SHOP
// ============================================================================

async function createOrUpdateShop({
  shop,
  accessToken,
  tokenData,
  shopInfo
}) {
  const existingShop =
    await V1Shop
      .findOne({ shop })
      .select('+accessToken');

  if (!existingShop) {

    const newShop =
      await V1Shop.create({
        shop,

        shopifyShopId:
          shopInfo.id
            ? String(shopInfo.id)
            : undefined,

        accessToken,

        shopName:
          shopInfo.name || shop,

        email:
          shopInfo.email || null,

        subscriptionStatus:
          'trial',

        aiEnabled:
          true,

        productSyncStatus:
          'pending',

        widgetInstalled:
          false,

        lastActiveAt:
          new Date()
      });

    /*
     * Store expiring token metadata if the schema is later extended
     * for refresh-token support.
     *
     * Do NOT expose tokens to the frontend.
     */
    return newShop;
  }

  // --------------------------------------------------------------------------
  // Existing merchant
  // --------------------------------------------------------------------------

  existingShop.accessToken =
    accessToken;

  if (shopInfo.id) {
    existingShop.shopifyShopId =
      String(shopInfo.id);
  }

  if (shopInfo.name) {
    existingShop.shopName =
      shopInfo.name;
  }

  if (shopInfo.email) {
    existingShop.email =
      shopInfo.email;
  }

  existingShop.lastActiveAt =
    new Date();

  /*
   * IMPORTANT:
   *
   * Never do:
   *
   * existingShop.trialStartedAt = new Date();
   * existingShop.trialEndsAt = ...
   *
   * here.
   *
   * Reinstallation must NOT restart the free trial.
   */

  if (
    existingShop.subscriptionStatus === 'expired'
  ) {
    existingShop.aiEnabled = false;
  }

  await existingShop.save();

  return existingShop;
}


// ============================================================================
// SHOPIFY TOKEN EXCHANGE
// ============================================================================

async function exchangeAuthorizationCode({
  shop,
  code
}) {
  const endpoint =
    `https://${shop}/admin/oauth/access_token`;

  /*
   * Shopify requires expiring=1 for new public apps.
   *
   * This gives an expiring offline access token and refresh token.
   */
  const body =
    new URLSearchParams({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      code,
      expiring: '1'
    });

  const response =
    await fetch(endpoint, {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded'
      },

      body: body.toString()
    });

  const data =
    await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data?.errors ||
      data?.error ||
      `Shopify token exchange failed (${response.status})`
    );
  }

  return data;
}


// ============================================================================
// SHOP INFORMATION
// ============================================================================

async function fetchShopInformation({
  shop,
  accessToken
}) {
  const url =
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`;

  const response =
    await fetch(url, {
      method: 'GET',

      headers: {
        'X-Shopify-Access-Token':
          accessToken,

        'Content-Type':
          'application/json'
      }
    });

  const data =
    await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data?.errors ||
      `Unable to fetch Shopify shop information (${response.status})`
    );
  }

  return data.shop || {};
}


// ============================================================================
// SHOPIFY HMAC VALIDATION
// ============================================================================

function verifyShopifyHmac(
  query,
  receivedHmac
) {
  if (!SHOPIFY_CLIENT_SECRET) {
    return false;
  }

  const message =
    Object.keys(query)
      .filter(key => {
        return (
          key !== 'hmac' &&
          key !== 'signature'
        );
      })
      .sort()
      .map(key => {
        return `${key}=${Array.isArray(query[key])
          ? query[key].join(',')
          : query[key]}`;
      })
      .join('&');

  const generatedHmac =
    crypto
      .createHmac(
        'sha256',
        SHOPIFY_CLIENT_SECRET
      )
      .update(message)
      .digest('hex');

  return safeCompare(
    generatedHmac,
    receivedHmac
  );
}


// ============================================================================
// CONSTANT-TIME COMPARISON
// ============================================================================

function safeCompare(
  a,
  b
) {
  if (
    typeof a !== 'string' ||
    typeof b !== 'string'
  ) {
    return false;
  }

  const aBuffer =
    Buffer.from(a, 'utf8');

  const bBuffer =
    Buffer.from(b, 'utf8');

  if (
    aBuffer.length !==
    bBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    aBuffer,
    bBuffer
  );
}


// ============================================================================
// SHOP DOMAIN VALIDATION
// ============================================================================

function normalizeShopDomain(
  shop
) {
  if (
    typeof shop !== 'string'
  ) {
    return '';
  }

  return shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0];
}


function validateShopDomain(
  shop
) {
  if (!shop) {
    throw new Error(
      'Shop domain is required'
    );
  }

  if (
    !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(
      shop
    )
  ) {
    throw new Error(
      'Invalid Shopify shop domain'
    );
  }
}


// ============================================================================
// CONFIG VALIDATION
// ============================================================================

function ensureShopifyConfig() {
  if (!SHOPIFY_CLIENT_ID) {
    throw new Error(
      'SHOPIFY_CLIENT_ID / SHOPIFY_API_KEY is not configured'
    );
  }

  if (!SHOPIFY_CLIENT_SECRET) {
    throw new Error(
      'SHOPIFY_CLIENT_SECRET / SHOPIFY_API_SECRET is not configured'
    );
  }
}


// ============================================================================
// CALLBACK URL
// ============================================================================

function getOAuthCallbackUrl() {
  return (
    process.env.V1_SHOPIFY_CALLBACK_URL ||
    `${APP_URL}/v1/install/callback`
  );
}


// ============================================================================
// JSON RESPONSE
// ============================================================================

async function parseJsonResponse(
  response
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      errors: text
    };
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  startInstallation,
  handleCallback,

  // Exported for testing.
  normalizeShopDomain,
  validateShopDomain,
  verifyShopifyHmac,
  exchangeAuthorizationCode,
  fetchShopInformation
};
