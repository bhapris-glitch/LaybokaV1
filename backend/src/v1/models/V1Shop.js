/**
 * ============================================================================
 * Layboka AI — V1
 * Shopify Shop Model
 * ============================================================================
 *
 * File:
 * backend/src/v1/models/V1Shop.js
 *
 * Purpose:
 * - Store V1 Shopify merchant information
 * - Store Shopify OAuth credentials
 * - Track 5-day trial
 * - Track subscription status
 * - Track product synchronization
 * - Track widget installation
 *
 * This model is intentionally separate from the existing Shop model.
 * ============================================================================
 */

'use strict';

const mongoose = require('mongoose');


// ============================================================================
// SCHEMA
// ============================================================================

const V1ShopSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------------------
    // SHOPIFY IDENTIFICATION
    // ------------------------------------------------------------------------

    shop: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    shopifyShopId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },


    // ------------------------------------------------------------------------
    // SHOPIFY OAUTH
    // ------------------------------------------------------------------------

    accessToken: {
      type: String,
      required: true,

      // Do not return the access token in normal queries.
      select: false,
    },


    // ------------------------------------------------------------------------
    // SHOP INFORMATION
    // ------------------------------------------------------------------------

    shopName: {
      type: String,
      default: '',
      trim: true,
    },

    email: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },


    // ------------------------------------------------------------------------
    // TRIAL
    // ------------------------------------------------------------------------

    trialStartedAt: {
      type: Date,
      default: null,
      index: true,
    },

    trialEndsAt: {
      type: Date,
      default: null,
      index: true,
    },


    // ------------------------------------------------------------------------
    // BILLING
    // ------------------------------------------------------------------------

    subscriptionStatus: {
      type: String,
      enum: [
        'trial',
        'active',
        'expired',
        'cancelled',
        'past_due',
      ],
      default: 'trial',
      index: true,
    },


    // ------------------------------------------------------------------------
    // AI STATUS
    // ------------------------------------------------------------------------

    aiEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },


    // ------------------------------------------------------------------------
    // PRODUCT SYNC
    // ------------------------------------------------------------------------

    productSyncStatus: {
      type: String,
      enum: [
        'pending',
        'syncing',
        'completed',
        'failed',
      ],
      default: 'pending',
      index: true,
    },

    productSyncStartedAt: {
      type: Date,
      default: null,
    },

    productSyncCompletedAt: {
      type: Date,
      default: null,
    },

    productSyncError: {
      type: String,
      default: '',
    },


    // ------------------------------------------------------------------------
    // WIDGET
    // ------------------------------------------------------------------------

    widgetInstalled: {
      type: Boolean,
      default: false,
      index: true,
    },

    widgetInstalledAt: {
      type: Date,
      default: null,
    },


    // ------------------------------------------------------------------------
    // ACTIVITY
    // ------------------------------------------------------------------------

    lastActiveAt: {
      type: Date,
      default: null,
      index: true,
    },
  },

  {
    timestamps: true,

    collection: 'v1_shops',
  }
);


// ============================================================================
// INDEXES
// ============================================================================

// Quickly find shops whose trial has expired.
V1ShopSchema.index({
  subscriptionStatus: 1,
  trialEndsAt: 1,
});

// Useful for product-sync workers.
V1ShopSchema.index({
  productSyncStatus: 1,
  updatedAt: -1,
});


// ============================================================================
// HELPERS
// ============================================================================

/**
 * Return whether the shop currently has an active paid subscription.
 */
V1ShopSchema.methods.hasActiveSubscription = function () {
  return this.subscriptionStatus === 'active';
};


/**
 * Return whether the shop's trial is currently active.
 */
V1ShopSchema.methods.isTrialActive = function (now = new Date()) {
  if (this.subscriptionStatus !== 'trial') {
    return false;
  }

  if (!this.trialEndsAt) {
    return false;
  }

  return new Date(this.trialEndsAt).getTime() > now.getTime();
};


/**
 * Return whether AI can currently be used.
 *
 * Paid subscription:
 *   allowed
 *
 * Active trial:
 *   allowed
 *
 * Expired/cancelled/past_due:
 *   blocked
 */
V1ShopSchema.methods.canUseAI = function (now = new Date()) {
  if (!this.aiEnabled) {
    return false;
  }

  if (this.subscriptionStatus === 'active') {
    return true;
  }

  return this.isTrialActive(now);
};


// ============================================================================
// MODEL
// ============================================================================

const V1Shop =
  mongoose.models.V1Shop ||
  mongoose.model('V1Shop', V1ShopSchema);


// ============================================================================
// EXPORT
// ============================================================================

module.exports = V1Shop;
