/**
 * ============================================================================
 * Layboka AI — V1
 * Shopify Token Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/v1.shopify-token.service.js
 *
 * Purpose:
 * - Get a valid Shopify Admin API access token
 * - Refresh expiring offline access tokens automatically
 * - Support legacy non-expiring offline tokens
 * - Save refreshed token information securely
 *
 * IMPORTANT:
 * - Never log accessToken or refreshToken.
 * - Shopify credentials come from environment variables.
 * ============================================================================
 */

'use strict';

const V1Shop = require('../models/V1Shop');


// ============================================================================
// CONFIG
// ============================================================================

const SHOPIFY_CLIENT_ID =
  process.env.SHOPIFY_API_KEY ||
  process.env.SHOPIFY_CLIENT_ID;

const SHOPIFY_CLIENT_SECRET =
  process.env.SHOPIFY_API_SECRET ||
  process.env.SHOPIFY_CLIENT_SECRET;

const REFRESH_SAFETY_WINDOW_MS = 5 * 60 * 1000;


// ============================================================================
// HELPERS
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


function isObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value));
}


// ============================================================================
// RESOLVE SHOP
// ============================================================================

async function resolveShop(shopOrId, options = {}) {
  if (!shopOrId) {
    throw new Error('Shop is required');
  }

  const selectTokens = options.selectTokens !== false;

  let shop;

  if (
    typeof shopOrId === 'object' &&
    shopOrId._id
  ) {
    shop = shopOrId;

    if (
      selectTokens &&
      !shop.accessToken
    ) {
      shop = await V1Shop.findById(shop._id)
        .select('+accessToken +refreshToken');
    }
  } else if (isObjectId(shopOrId)) {
    shop = await V1Shop.findById(shopOrId)
      .select(
        selectTokens
          ? '+accessToken +refreshToken'
          : ''
      );
  } else {
    const normalizedShop = normalizeShop(shopOrId);

    shop = await V1Shop.findOne({
      shop: normalizedShop,
    }).select(
      selectTokens
        ? '+accessToken +refreshToken'
        : ''
    );
  }

  if (!shop) {
    throw new Error('V1 shop not found');
  }

  return shop;
}


// ============================================================================
// CHECK CONFIGURATION
// ============================================================================

function isConfigured() {
  return Boolean(
    SHOPIFY_CLIENT_ID &&
    SHOPIFY_CLIENT_SECRET
  );
}


// ============================================================================
// REFRESH ACCESS TOKEN
// ============================================================================

async function refreshAccessToken(shopOrId) {
  if (!isConfigured()) {
    throw new Error(
      'Shopify OAuth credentials are not configured'
    );
  }

  const shop = await resolveShop(shopOrId, {
    selectTokens: true,
  });

  if (!shop.refreshToken) {
    throw new Error(
      'Shopify refresh token is missing'
    );
  }

  if (shop.isRefreshTokenExpired()) {
    throw new Error(
      'Shopify refresh token has expired. Reinstallation is required.'
    );
  }

  const shopDomain = normalizeShop(shop.shop);

  const response = await fetch(
    `https://${shopDomain}/admin/oauth/access_token`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        refresh_token: shop.refreshToken,
        grant_type: 'refresh_token',
      }),
    }
  );

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    await V1Shop.updateOne(
      { _id: shop._id },
      {
        $set: {
          tokenRefreshError:
            data.error_description ||
            data.error ||
            `Shopify token refresh failed (${response.status})`,
        },
      }
    );

    throw new Error(
      data.error_description ||
      data.error ||
      'Shopify access token refresh failed'
    );
  }

  if (!data.access_token) {
    throw new Error(
      'Shopify did not return a new access token'
    );
  }

  const now = new Date();

  const expiresAt = data.expires_in
    ? new Date(
        now.getTime() +
        Number(data.expires_in) * 1000
      )
    : null;

  const refreshTokenExpiresAt =
    data.refresh_token_expires_in
      ? new Date(
          now.getTime() +
          Number(data.refresh_token_expires_in) * 1000
        )
      : shop.refreshTokenExpiresAt;

  const update = {
    accessToken: data.access_token,

    accessTokenExpiresAt: expiresAt,

    refreshTokenExpiresAt,

    tokenType: 'expiring_offline',

    tokenRefreshedAt: now,

    tokenRefreshError: null,
  };

  /*
   * Shopify can rotate the refresh token.
   *
   * If Shopify returns a new one, save it.
   * Otherwise keep the existing refresh token.
   */
  if (data.refresh_token) {
    update.refreshToken = data.refresh_token;
  }

  const updatedShop =
    await V1Shop.findByIdAndUpdate(
      shop._id,
      {
        $set: update,
      },
      {
        new: true,
      }
    ).select('+accessToken +refreshToken');

  if (!updatedShop) {
    throw new Error(
      'Failed to save refreshed Shopify token'
    );
  }

  return updatedShop;
}


// ============================================================================
// GET VALID ACCESS TOKEN
// ============================================================================

async function getValidAccessToken(shopOrId) {
  const shop = await resolveShop(shopOrId, {
    selectTokens: true,
  });

  if (!shop.accessToken) {
    throw new Error(
      'Shopify access token is missing. Reinstallation is required.'
    );
  }

  /*
   * Legacy offline tokens do not expire.
   */
  if (
    shop.tokenType === 'legacy_offline' ||
    !shop.accessTokenExpiresAt
  ) {
    return {
      accessToken: shop.accessToken,
      shop,
      refreshed: false,
    };
  }

  /*
   * Refresh before the actual expiration time.
   * This prevents requests from failing while a token
   * is expiring during an API operation.
   */
  const shouldRefresh =
    shop.isAccessTokenExpired(
      new Date(),
      REFRESH_SAFETY_WINDOW_MS
    );

  if (!shouldRefresh) {
    return {
      accessToken: shop.accessToken,
      shop,
      refreshed: false,
    };
  }

  const refreshedShop =
    await refreshAccessToken(shop);

  return {
    accessToken: refreshedShop.accessToken,
    shop: refreshedShop,
    refreshed: true,
  };
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  normalizeShop,
  resolveShop,
  isConfigured,
  refreshAccessToken,
  getValidAccessToken,
};
