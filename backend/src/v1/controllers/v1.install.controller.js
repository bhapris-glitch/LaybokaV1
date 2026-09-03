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
 * - Start Shopify OAuth installation
 * - Validate OAuth callback
 * - Exchange OAuth code
 * - Create/update V1 merchant
 * - Start trial
 * - Register webhooks
 * - Start product synchronization
 *
 * ============================================================================
 */

'use strict';

const crypto = require('crypto');

const {
  createOAuthState,
  buildAuthorizationUrl,
  validateState,
  verifyOAuthHmac,
  completeOAuth,
  normalizeShop,
} = require('../services/oauth.service');

const {
  installShop,
} = require('../services/install.service');


// ============================================================================
// CONFIG
// ============================================================================

const APP_URL =
  (
    process.env.APP_URL ||
    process.env.BACKEND_URL ||
    ''
  ).replace(/\/+$/, '');

const SUCCESS_URL =
  process.env.V1_SUCCESS_URL ||
  `${APP_URL}/v1/success`;

const OAUTH_STATE_COOKIE =
  'layboka_v1_oauth_state';

const OAUTH_STATE_MAX_AGE =
  10 * 60 * 1000;


// ============================================================================
// HELPERS
// ============================================================================

function isValidShop(shop) {

  try {

    normalizeShop(shop);

    return true;

  } catch {

    return false;
  }
}


function setOAuthStateCookie(
  res,
  state
) {

  res.cookie(
    OAUTH_STATE_COOKIE,
    state,
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        'production',

      sameSite:
        'lax',

      maxAge:
        OAUTH_STATE_MAX_AGE,

      path:
        '/',
    }
  );
}


function clearOAuthStateCookie(
  res
) {

  res.clearCookie(
    OAUTH_STATE_COOKIE,
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        'production',

      sameSite:
        'lax',

      path:
        '/',
    }
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

    const shop =
      normalizeShop(
        req.query.shop
      );


    if (!isValidShop(shop)) {

      return res.status(400).json({
        success: false,
        error:
          'A valid Shopify shop domain is required.',
      });
    }


    const redirectUri =
      `${APP_URL}/v1/install/callback`;


    if (!APP_URL) {

      return res.status(500).json({
        success: false,
        error:
          'APP_URL or BACKEND_URL is not configured.',
      });
    }


    const state =
      createOAuthState();


    setOAuthStateCookie(
      res,
      state
    );


    const authorizationUrl =
      buildAuthorizationUrl({
        shop,
        state,
        redirectUri,
      });


    return res.redirect(
      authorizationUrl
    );

  } catch (error) {

    console.error(
      '[V1 Install] Start error:',
      error.message
    );

    return res.status(400).json({
      success: false,
      error:
        error.message,
    });
  }
}


// ============================================================================
// OAUTH CALLBACK
// ============================================================================

async function handleCallback(
  req,
  res
) {

  try {

    const {
      shop,
      code,
      state,
    } = req.query;


    // ------------------------------------------------------------------------
    // REQUIRED PARAMETERS
    // ------------------------------------------------------------------------

    if (
      !shop ||
      !code ||
      !state
    ) {

      return res.status(400).json({
        success: false,
        error:
          'Invalid Shopify OAuth callback.',
      });
    }


    // ------------------------------------------------------------------------
    // SHOP VALIDATION
    // ------------------------------------------------------------------------

    if (
      !isValidShop(shop)
    ) {

      return res.status(400).json({
        success: false,
        error:
          'Invalid Shopify shop domain.',
      });
    }


    const normalizedShop =
      normalizeShop(shop);


    // ------------------------------------------------------------------------
    // STATE VALIDATION
    // ------------------------------------------------------------------------

    const storedState =
      req.cookies?.[
        OAUTH_STATE_COOKIE
      ];


    if (
      !validateState(
        state,
        storedState
      )
    ) {

      return res.status(403).json({
        success: false,
        error:
          'Invalid or expired OAuth state.',
      });
    }


    // ------------------------------------------------------------------------
    // HMAC VALIDATION
    // ------------------------------------------------------------------------

    if (
      !verifyOAuthHmac(
        req.query
      )
    ) {

      return res.status(403).json({
        success: false,
        error:
          'Invalid Shopify OAuth signature.',
      });
    }


    clearOAuthStateCookie(
      res
    );


    // ------------------------------------------------------------------------
    // TOKEN + SHOP INFORMATION
    // ------------------------------------------------------------------------

    const oauth =
      await completeOAuth({
        shop:
          normalizedShop,

        code,
      });


    // ------------------------------------------------------------------------
    // CREATE / UPDATE V1 SHOP
    // ------------------------------------------------------------------------

    const result =
      await installShop({
        shop:
          normalizedShop,

        shopInfo:
          oauth.shopInfo,

        accessToken:
          oauth.accessToken,

        refreshToken:
          oauth.refreshToken,

        expiresIn:
          oauth.expiresIn,

        refreshTokenExpiresIn:
          oauth.refreshTokenExpiresIn,

        tokenType:
          oauth.tokenType,
      });


    // ------------------------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------------------------

    if (
      SUCCESS_URL
    ) {

      const url =
        new URL(
          SUCCESS_URL
        );


      url.searchParams.set(
        'shop',
        normalizedShop
      );


      url.searchParams.set(
        'installed',
        'true'
      );


      return res.redirect(
        url.toString()
      );
    }


    return res.status(200).json({
      success: true,

      message:
        'Layboka AI installed successfully.',

      shop:
        normalizedShop,

      webhooks:
        result.webhookResult,
    });

  } catch (error) {

    console.error(
      '[V1 Install] Callback error:',
      error.message
    );


    clearOAuthStateCookie(
      res
    );


    return res.status(500).json({
      success: false,
      error:
        'Shopify installation failed.',
    });
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  startInstallation,
  handleCallback,
};
