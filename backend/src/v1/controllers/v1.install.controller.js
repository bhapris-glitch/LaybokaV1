/**
 * ============================================================================
 * Layboka AI — V1
 * Shopify Installation Controller
 * ============================================================================
 *
 * File:
 * backend/src/v1/controllers/v1.install.controller.js
 *
 * Purpose:
 * - Start Shopify OAuth
 * - Validate OAuth callback
 * - Exchange authorization code for token
 * - Save expiring offline access/refresh tokens
 * - Start the 5-day trial
 * - Register V1 webhooks
 * - Start initial product synchronization
 *
 * ============================================================================
 */

'use strict';

const crypto = require('crypto');

const V1Shop = require('../models/V1Shop');

const {
  startTrial,
} = require('../services/v1.trial.service');

const {
  syncProducts,
} = require('../services/v1.product.service');

const {
  registerAllWebhooks,
} = require('../services/v1.webhook.service');


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
  process.env.BACKEND_URL;

const SUCCESS_URL =
  process.env.V1_SUCCESS_URL ||
  `${APP_URL}/v1/success`;

const OAUTH_STATE_COOKIE =
  'layboka_v1_oauth_state';

const OAUTH_STATE_MAX_AGE =
  10 * 60 * 1000;


// ============================================================================
// SHOP NORMALIZATION
// ============================================================================

function normalizeShop(shop) {
  if (!shop) return null;

  return String(shop)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0];
}


// ============================================================================
// SHOP DOMAIN VALIDATION
// ============================================================================

function isValidShopDomain(shop) {
  if (!shop) return false;

  /*
   * V1 only accepts Shopify-managed stores.
   *
   * Custom domains are not used as the OAuth shop parameter.
   */
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i
    .test(shop);
}


// ============================================================================
// RANDOM OAUTH STATE
// ============================================================================

function generateState() {
  return crypto.randomBytes(32).toString('hex');
}


// ============================================================================
// HMAC VALIDATION
// ============================================================================

function verifyShopifyHmac(query) {
  if (!query?.hmac) {
    return false;
  }

  const receivedHmac =
    String(query.hmac);

  const message =
    Object.keys(query)
      .filter(
        key =>
          key !== 'hmac' &&
          key !== 'signature'
      )
      .sort()
      .map(
        key =>
          `${key}=${Array.isArray(query[key])
            ? query[key].join(',')
            : query[key]}`
      )
      .join('&');

  const digest =
    crypto
      .createHmac(
        'sha256',
        SHOPIFY_CLIENT_SECRET
      )
      .update(message)
      .digest('hex');

  if (
    receivedHmac.length !==
    digest.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(receivedHmac, 'utf8'),
    Buffer.from(digest, 'utf8')
  );
}


// ============================================================================
// OAUTH STATE VALIDATION
// ============================================================================

function verifyOAuthState(
  req,
  state
) {
  const storedState =
    req.cookies?.[
      OAUTH_STATE_COOKIE
    ];

  if (
    !storedState ||
    !state
  ) {
    return false;
  }

  if (
    storedState.length !==
    state.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(
      storedState,
      'utf8'
    ),
    Buffer.from(
      state,
      'utf8'
    )
  );
}


// ============================================================================
// START INSTALLATION
// ============================================================================

async function startInstallation(
  req,
  res
) {
  try {
    if (
      !SHOPIFY_CLIENT_ID ||
      !SHOPIFY_CLIENT_SECRET
    ) {
      return res.status(500).json({
        success: false,
        error:
          'Shopify OAuth is not configured',
      });
    }

    const shop =
      normalizeShop(
        req.query.shop
      );

    if (
      !isValidShopDomain(shop)
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Enter a valid Shopify myshopify.com store domain',
      });
    }

    const state =
      generateState();

    /*
     * Secure, short-lived OAuth state cookie.
     */
    res.cookie(
      OAUTH_STATE_COOKIE,
      state,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite: 'lax',
        maxAge:
          OAUTH_STATE_MAX_AGE,
      }
    );

    const redirectUri =
      `${APP_URL}/v1/install/callback`;

    const params =
      new URLSearchParams({
        client_id:
          SHOPIFY_CLIENT_ID,

        scope:
          SHOPIFY_SCOPES,

        redirect_uri:
          redirectUri,

        state,
      });

    const authorizationUrl =
      `https://${shop}/admin/oauth/authorize?${params.toString()}`;

    return res.redirect(
      authorizationUrl
    );
  } catch (error) {
    console.error(
      'V1 Shopify installation error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        'Unable to start Shopify installation',
    });
  }
}


// ============================================================================
// SHOPIFY TOKEN EXCHANGE
// ============================================================================

async function exchangeCodeForToken(
  shop,
  code
) {
  const response =
    await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          client_id:
            SHOPIFY_CLIENT_ID,

          client_secret:
            SHOPIFY_CLIENT_SECRET,

          code,

          /*
           * Request an expiring offline
           * access token.
           */
          expiring: true,
        }),
      }
    );

  let data = {};

  try {
    data =
      await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error_description ||
      data.error ||
      'Shopify token exchange failed'
    );
  }

  if (!data.access_token) {
    throw new Error(
      'Shopify did not return an access token'
    );
  }

  return data;
}


// ============================================================================
// GET SHOP INFORMATION
// ============================================================================

async function getShopInfo(
  shop,
  accessToken
) {
  const response =
    await fetch(
      `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
      {
        method: 'GET',

        headers: {
          'X-Shopify-Access-Token':
            accessToken,

          Accept:
            'application/json',
        },
      }
    );

  let data = {};

  try {
    data =
      await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.errors ||
      'Unable to retrieve Shopify shop information'
    );
  }

  return data.shop || {};
}


// ============================================================================
// CREATE / UPDATE V1 SHOP
// ============================================================================

async function createOrUpdateShop(
  shop,
  tokenData,
  shopInfo
) {
  const now =
    new Date();

  const expiresAt =
    tokenData.expires_in
      ? new Date(
          now.getTime() +
          Number(tokenData.expires_in) *
            1000
        )
      : null;

  const refreshTokenExpiresAt =
    tokenData.refresh_token_expires_in
      ? new Date(
          now.getTime() +
          Number(
            tokenData.refresh_token_expires_in
          ) *
            1000
        )
      : null;

  /*
   * Find the shop first so we can distinguish
   * a new installation from a returning merchant.
   */
  let existingShop =
    await V1Shop.findOne({
      shop,
    }).select(
      '+accessToken +refreshToken'
    );

  if (!existingShop) {
    existingShop =
      await V1Shop.findOne({
        shopifyShopId:
          shopInfo.id
            ? String(shopInfo.id)
            : undefined,
      }).select(
        '+accessToken +refreshToken'
      );
  }

  const update = {
    shop,

    accessToken:
      tokenData.access_token,

    refreshToken:
      tokenData.refresh_token ||
      existingShop?.refreshToken,

    accessTokenExpiresAt:
      expiresAt,

    refreshTokenExpiresAt:
      refreshTokenExpiresAt ||
      existingShop?.refreshTokenExpiresAt,

    tokenType:
      tokenData.expires_in
        ? 'expiring_offline'
        : 'legacy_offline',

    tokenRefreshedAt:
      now,

    tokenRefreshError:
      null,

    shopifyShopId:
      shopInfo.id
        ? String(shopInfo.id)
        : existingShop?.shopifyShopId,

    shopName:
      shopInfo.name ||
      existingShop?.shopName ||
      shop,

    email:
      shopInfo.email ||
      shopInfo.customer_email ||
      existingShop?.email ||
      null,
  };

  /*
   * Never reset trial dates here.
   *
   * This is critical: reinstalling/reconnecting
   * must NOT give the merchant another 5-day trial.
   */
  if (!existingShop) {
    update.trialStartedAt = now;
  }

  const savedShop =
    await V1Shop.findOneAndUpdate(
      { shop },

      {
        $set: update,

        $setOnInsert: {
          aiEnabled: true,
          subscriptionStatus:
            'trial',
          productSyncStatus:
            'pending',
        },
      },

      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

  return {
    shop: savedShop,
    isNewInstallation:
      !existingShop,
  };
}


// ============================================================================
// HANDLE OAUTH CALLBACK
// ============================================================================

async function handleCallback(
  req,
  res
) {
  try {
    const {
      shop: rawShop,
      code,
      state,
    } = req.query;

    const shop =
      normalizeShop(rawShop);

    if (
      !isValidShopDomain(shop)
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid Shopify shop',
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error:
          'Shopify authorization code is missing',
      });
    }

    /*
     * Validate OAuth state before doing
     * anything with the authorization code.
     */
    if (
      !verifyOAuthState(
        req,
        state
      )
    ) {
      return res.status(403).json({
        success: false,
        error:
          'Invalid OAuth state',
      });
    }

    /*
     * Validate Shopify HMAC.
     */
    if (
      !verifyShopifyHmac(
        req.query
      )
    ) {
      return res.status(403).json({
        success: false,
        error:
          'Invalid Shopify HMAC',
      });
    }

    /*
     * Clear one-time OAuth state.
     */
    res.clearCookie(
      OAUTH_STATE_COOKIE
    );

    /*
     * Exchange authorization code
     * for expiring offline credentials.
     */
    const tokenData =
      await exchangeCodeForToken(
        shop,
        code
      );

    /*
     * Get basic merchant/store information.
     */
    const shopInfo =
      await getShopInfo(
        shop,
        tokenData.access_token
      );

    /*
     * Save merchant + credentials.
     */
    const {
      shop: v1Shop,
      isNewInstallation,
    } =
      await createOrUpdateShop(
        shop,
        tokenData,
        shopInfo
      );

    /*
     * Start the trial only when appropriate.
     * The trial service itself prevents resetting
     * an existing trial.
     */
    await startTrial(
      v1Shop
    );

    /*
     * Register webhooks before background sync.
     *
     * Registration failures should not destroy
     * a successful OAuth installation.
     */
    let webhookResult = null;

    try {
      webhookResult =
        await registerAllWebhooks(
          v1Shop
        );
    } catch (error) {
      console.error(
        `V1 webhook registration failed for ${shop}:`,
        error.message
      );
    }

    /*
     * Product sync is intentionally started in
     * the background so the merchant does not
     * wait for a large catalog to finish syncing.
     */
    setImmediate(
      async () => {
        try {
          await syncProducts(
            v1Shop
          );
        } catch (error) {
          console.error(
            `V1 product sync failed for ${shop}:`,
            error.message
          );
        }
      }
    );

    /*
     * Redirect merchant to the V1 success page.
     */
    const successParams =
      new URLSearchParams({
        shop,
        installed: '1',
      });

    if (isNewInstallation) {
      successParams.set(
        'new',
        '1'
      );
    }

    if (
      webhookResult?.success
    ) {
      successParams.set(
        'webhooks',
        '1'
      );
    }

    return res.redirect(
      `${SUCCESS_URL}?${successParams.toString()}`
    );
  } catch (error) {
    console.error(
      'V1 Shopify OAuth callback error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        'Shopify installation failed',
    });
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  startInstallation,
  handleCallback,

  normalizeShop,
  isValidShopDomain,
  verifyShopifyHmac,

  exchangeCodeForToken,
  getShopInfo,
  createOrUpdateShop,
};
