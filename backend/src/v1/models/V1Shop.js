'use strict';

/**
 * ============================================================================
 * Layboka AI — V1 Shop Model
 * ============================================================================
 *
 * File:
 * backend/src/v1/models/V1Shop.js
 *
 * Purpose:
 * - Store V1 Shopify shop information
 * - Store Shopify expiring offline access-token credentials
 * - Track trial/subscription state
 * - Track product synchronization
 * - Track widget installation
 *
 * ============================================================================
 */

const mongoose = require('mongoose');

const {
  V1_CONFIG
} = require('../config/v1.config');


// ============================================================================
// SCHEMA
// ============================================================================

const V1ShopSchema = new mongoose.Schema(
  {
    // ========================================================================
    // SHOPIFY SHOP
    // ========================================================================

    shop: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    shopifyShopId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    shopName: {
      type: String,
      trim: true,
      maxlength: 300
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 320
    },


    // ========================================================================
    // SHOPIFY ACCESS TOKEN
    // ========================================================================

    /*
     * Shopify now uses expiring offline access tokens for public apps.
     *
     * accessToken:
     * - Short-lived Shopify Admin API access token.
     * - Hidden from normal queries.
     */

    accessToken: {
      type: String,
      required: true,
      select: false
    },

    /*
     * Refresh token returned by Shopify for expiring offline access.
     *
     * Hidden from normal queries.
     */
    refreshToken: {
      type: String,
      select: false
    },

    /*
     * Absolute expiration time of the current access token.
     */
    accessTokenExpiresAt: {
      type: Date,
      index: true
    },

    /*
     * Absolute expiration time of the refresh token.
     *
     * Shopify refresh tokens are also expiring credentials.
     */
    refreshTokenExpiresAt: {
      type: Date,
      index: true
    },

    /*
     * Helps identify which token system this shop uses.
     */
    tokenType: {
      type: String,
      enum: [
        'expiring_offline',
        'legacy_offline'
      ],
      default: 'expiring_offline',
      index: true
    },

    /*
     * Last successful token refresh.
     */
    tokenRefreshedAt: {
      type: Date
    },

    /*
     * Last token refresh failure.
     *
     * Do not store sensitive API responses here.
     */
    tokenRefreshError: {
      type: String,
      maxlength: 1000
    },


    // ========================================================================
    // TRIAL
    // ========================================================================

    trialStartedAt: {
      type: Date,
      index: true
    },

    trialEndsAt: {
      type: Date,
      index: true
    },


    // ========================================================================
    // SUBSCRIPTION
    // ========================================================================

    subscriptionStatus: {
      type: String,
      enum: [
        'trial',
        'active',
        'expired',
        'cancelled',
        'past_due'
      ],
      default: 'trial',
      index: true
    },


    // ========================================================================
    // AI
    // ========================================================================

    aiEnabled: {
      type: Boolean,
      default: true,
      index: true
    },


    // ========================================================================
    // PRODUCT SYNC
    // ========================================================================

    productSyncStatus: {
      type: String,
      enum: [
        'pending',
        'syncing',
        'completed',
        'failed'
      ],
      default: 'pending',
      index: true
    },

    productSyncStartedAt: {
      type: Date
    },

    productSyncCompletedAt: {
      type: Date
    },

    productSyncError: {
      type: String,
      maxlength: 2000
    },


    // ========================================================================
    // WIDGET
    // ========================================================================

    widgetInstalled: {
      type: Boolean,
      default: false,
      index: true
    },

    widgetInstalledAt: {
      type: Date
    },


    // ========================================================================
    // ACTIVITY
    // ========================================================================

    lastActiveAt: {
      type: Date,
      index: true
    }
  },

  {
    collection: 'v1_shops',

    timestamps: true,

    versionKey: false
  }
);


// ============================================================================
// INDEXES
// ============================================================================

V1ShopSchema.index({
  subscriptionStatus: 1,
  trialEndsAt: 1
});

V1ShopSchema.index({
  productSyncStatus: 1,
  productSyncStartedAt: -1
});

V1ShopSchema.index({
  accessTokenExpiresAt: 1,
  tokenType: 1
});

V1ShopSchema.index({
  refreshTokenExpiresAt: 1,
  tokenType: 1
});


// ============================================================================
// INSTANCE METHODS
// ============================================================================

V1ShopSchema.methods.hasActiveSubscription =
  function hasActiveSubscription() {
    return (
      this.subscriptionStatus ===
      V1_CONFIG.SUBSCRIPTION.ACTIVE
    );
  };


V1ShopSchema.methods.isTrialActive =
  function isTrialActive(now = new Date()) {
    if (
      this.subscriptionStatus !==
      V1_CONFIG.TRIAL.STATUS
    ) {
      return false;
    }

    if (!this.trialEndsAt) {
      return false;
    }

    return (
      new Date(this.trialEndsAt).getTime() >
      now.getTime()
    );
  };


V1ShopSchema.methods.canUseAI =
  function canUseAI(now = new Date()) {
    if (!this.aiEnabled) {
      return false;
    }

    if (this.hasActiveSubscription()) {
      return true;
    }

    return this.isTrialActive(now);
  };


/**
 * Returns true when the Shopify access token should be refreshed.
 *
 * A small safety window prevents requests from being made with a token
 * that is about to expire.
 */
V1ShopSchema.methods.isAccessTokenExpired =
  function isAccessTokenExpired(
    now = new Date(),
    safetyWindowMs = 5 * 60 * 1000
  ) {
    if (!this.accessTokenExpiresAt) {
      return false;
    }

    return (
      new Date(this.accessTokenExpiresAt).getTime() <=
      now.getTime() + safetyWindowMs
    );
  };


V1ShopSchema.methods.isRefreshTokenExpired =
  function isRefreshTokenExpired(
    now = new Date()
  ) {
    if (!this.refreshTokenExpiresAt) {
      return false;
    }

    return (
      new Date(this.refreshTokenExpiresAt).getTime() <=
      now.getTime()
    );
  };


// ============================================================================
// MODEL
// ============================================================================

const V1Shop =
  mongoose.models.V1Shop ||
  mongoose.model(
    'V1Shop',
    V1ShopSchema
  );


// ============================================================================
// EXPORT
// ============================================================================

module.exports = V1Shop;
