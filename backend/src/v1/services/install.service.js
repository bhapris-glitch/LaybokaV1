/**
 * ============================================================================
 * Layboka AI — V1
 * Installation Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/install.service.js
 *
 * Purpose:
 * - Create/update V1 merchant
 * - Start the 5-day trial only once
 * - Store Shopify OAuth credentials
 * - Register webhooks
 * - Start product synchronization
 *
 * ============================================================================
 */

'use strict';

const V1Shop =
  require('../models/V1Shop');

const {
  registerAllWebhooks,
} = require('./v1.webhook.service');

const {
  syncProducts,
} = require('./v1.product.service');

const {
  startTrial,
} = require('./v1.trial.service');

const {
  normalizeShop,
} = require('./oauth.service');


// ============================================================================
// SAVE SHOP
// ============================================================================

async function createOrUpdateShop({
  shop,
  shopInfo,
  accessToken,
  refreshToken,
  expiresIn,
  refreshTokenExpiresIn,
  tokenType,
}) {

  const normalizedShop =
    normalizeShop(shop);


  if (!accessToken) {
    throw new Error(
      'Shopify access token is required'
    );
  }


  if (!shopInfo?.id) {
    throw new Error(
      'Shopify shop information is required'
    );
  }


  const existingShop =
    await V1Shop.findOne({
      shop: normalizedShop,
    }).select(
      '+accessToken +refreshToken'
    );


  const now =
    new Date();


  const update = {

    shop:
      normalizedShop,

    shopifyShopId:
      String(shopInfo.id),

    accessToken,

    shopName:
      shopInfo.name ||
      normalizedShop,

    email:
      shopInfo.email ||
      null,

    tokenType:
      tokenType ||
      'legacy_offline',

    tokenRefreshedAt:
      now,

    tokenRefreshError:
      null,

    aiEnabled:
      true,

    lastActiveAt:
      now,
  };


  // --------------------------------------------------------------------------
  // ACCESS TOKEN EXPIRY
  // --------------------------------------------------------------------------

  if (
    expiresIn &&
    Number(expiresIn) > 0
  ) {

    update.accessTokenExpiresAt =
      new Date(
        now.getTime() +
        Number(expiresIn) * 1000
      );

  } else {

    update.accessTokenExpiresAt =
      null;
  }


  // --------------------------------------------------------------------------
  // REFRESH TOKEN
  // --------------------------------------------------------------------------

  if (refreshToken) {

    update.refreshToken =
      refreshToken;

  } else if (!existingShop) {

    update.refreshToken =
      null;
  }


  // --------------------------------------------------------------------------
  // REFRESH TOKEN EXPIRY
  // --------------------------------------------------------------------------

  if (
    refreshTokenExpiresIn &&
    Number(refreshTokenExpiresIn) > 0
  ) {

    update.refreshTokenExpiresAt =
      new Date(
        now.getTime() +
        Number(refreshTokenExpiresIn) *
        1000
      );

  } else if (!existingShop) {

    update.refreshTokenExpiresAt =
      null;
  }


  // --------------------------------------------------------------------------
  // NEW SHOP
  // --------------------------------------------------------------------------

  if (!existingShop) {

    update.trialStartedAt =
      now;

    update.trialEndsAt =
      new Date(
        now.getTime() +
        5 * 24 * 60 * 60 * 1000
      );

    update.subscriptionStatus =
      'trial';

    update.productSyncStatus =
      'pending';
  }


  // --------------------------------------------------------------------------
  // UPSERT
  // --------------------------------------------------------------------------

  const savedShop =
    await V1Shop.findOneAndUpdate(
      {
        shop: normalizedShop,
      },

      {
        $set: update,

        $setOnInsert: {
          widgetEnabled: true,
        },
      },

      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).select(
      '+accessToken +refreshToken'
    );


  // --------------------------------------------------------------------------
  // SAFETY: NEVER RESET TRIAL
  // --------------------------------------------------------------------------

  if (
    existingShop &&
    existingShop.trialStartedAt
  ) {

    if (
      !savedShop.trialStartedAt ||
      savedShop.trialStartedAt.getTime() !==
        existingShop.trialStartedAt.getTime()
    ) {

      await V1Shop.updateOne(
        {
          _id:
            savedShop._id,
        },

        {
          $set: {
            trialStartedAt:
              existingShop.trialStartedAt,

            trialEndsAt:
              existingShop.trialEndsAt,

            subscriptionStatus:
              existingShop.subscriptionStatus,
          },
        }
      );

      savedShop.trialStartedAt =
        existingShop.trialStartedAt;

      savedShop.trialEndsAt =
        existingShop.trialEndsAt;

      savedShop.subscriptionStatus =
        existingShop.subscriptionStatus;
    }
  }


  return savedShop;
}


// ============================================================================
// START INSTALLATION
// ============================================================================

async function installShop({
  shop,
  shopInfo,
  accessToken,
  refreshToken,
  expiresIn,
  refreshTokenExpiresIn,
  tokenType,
}) {

  const savedShop =
    await createOrUpdateShop({
      shop,
      shopInfo,
      accessToken,
      refreshToken,
      expiresIn,
      refreshTokenExpiresIn,
      tokenType,
    });


  // --------------------------------------------------------------------------
  // TRIAL
  // --------------------------------------------------------------------------

  await startTrial(
    savedShop
  );


  // --------------------------------------------------------------------------
  // WEBHOOKS
  // --------------------------------------------------------------------------
  //
  // Webhook registration failure must NOT make an otherwise valid OAuth
  // installation fail.
  //
  // --------------------------------------------------------------------------

  let webhookResult =
    null;

  try {

    webhookResult =
      await registerAllWebhooks(
        savedShop
      );

  } catch (error) {

    console.error(
      '[V1 Install] Webhook registration failed:',
      error.message
    );

    webhookResult = {
      success: false,
      error: error.message,
    };
  }


  // --------------------------------------------------------------------------
  // PRODUCT SYNC
  // --------------------------------------------------------------------------
  //
  // Do not make the OAuth callback wait for potentially thousands of products.
  //
  // --------------------------------------------------------------------------

  setImmediate(
    async () => {

      try {

        await syncProducts(
          savedShop
        );

      } catch (error) {

        console.error(
          '[V1 Install] Product sync failed:',
          error.message
        );
      }
    }
  );


  return {
    shop: savedShop,

    webhookResult,
  };
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  createOrUpdateShop,
  installShop,
};
