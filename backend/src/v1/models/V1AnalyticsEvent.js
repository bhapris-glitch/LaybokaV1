/**
 * ============================================================================
 * Layboka AI — V1
 * Analytics Event Model
 * ============================================================================
 *
 * File:
 * backend/src/v1/models/V1AnalyticsEvent.js
 *
 * Purpose:
 * - Store V1 funnel analytics events
 * - Track product interactions
 * - Track checkout activity
 * - Record verified Shopify purchases
 * - Prevent duplicate verified purchase events
 *
 * ============================================================================
 */

'use strict';

const mongoose = require('mongoose');


// ============================================================================
// CONSTANTS
// ============================================================================

const EVENTS = Object.freeze([
  'widget_open',
  'conversation',
  'product_view',
  'product_click',
  'add_to_cart',
  'checkout',
  'purchase',
]);

const ATTRIBUTION_SOURCES = Object.freeze([
  'widget',
  'shopify_webhook',
  'system',
]);


// ============================================================================
// SCHEMA
// ============================================================================

const V1AnalyticsEventSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------------------
    // SHOP
    // ------------------------------------------------------------------------

    shop: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'V1Shop',
      index: true,
    },


    // ------------------------------------------------------------------------
    // EVENT
    // ------------------------------------------------------------------------

    event: {
      type: String,
      required: true,
      enum: EVENTS,
      index: true,
    },


    // ------------------------------------------------------------------------
    // SESSION
    // ------------------------------------------------------------------------

    sessionId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },


    // ------------------------------------------------------------------------
    // PRODUCT
    // ------------------------------------------------------------------------

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'V1Product',
      index: true,
    },

    shopifyProductId: {
      type: String,
      trim: true,
      index: true,
    },


    // ------------------------------------------------------------------------
    // ORDER
    // ------------------------------------------------------------------------

    orderId: {
      type: String,
      trim: true,
      index: true,
    },

    orderNumber: {
      type: String,
      trim: true,
    },


    // ------------------------------------------------------------------------
    // REVENUE
    // ------------------------------------------------------------------------

    revenue: {
      type: Number,
      min: 0,
    },

    currency: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 10,
    },


    // ------------------------------------------------------------------------
    // VERIFICATION
    // ------------------------------------------------------------------------

    verified: {
      type: Boolean,
      default: false,
      index: true,
    },

    attributionSource: {
      type: String,
      enum: ATTRIBUTION_SOURCES,
      default: 'widget',
      index: true,
    },


    // ------------------------------------------------------------------------
    // EVENT METADATA
    // ------------------------------------------------------------------------

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },


    // ------------------------------------------------------------------------
    // TIMESTAMP
    // ------------------------------------------------------------------------

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'v1_analytics_events',
    versionKey: false,
  }
);


// ============================================================================
// INDEXES
// ============================================================================

// General analytics queries.
V1AnalyticsEventSchema.index({
  shop: 1,
  createdAt: -1,
});


// Funnel queries.
V1AnalyticsEventSchema.index({
  shop: 1,
  event: 1,
  createdAt: -1,
});


// Session funnel queries.
V1AnalyticsEventSchema.index({
  shop: 1,
  sessionId: 1,
  createdAt: -1,
});


// Product performance queries.
V1AnalyticsEventSchema.index({
  shop: 1,
  shopifyProductId: 1,
  event: 1,
  createdAt: -1,
});


// Order lookups.
V1AnalyticsEventSchema.index({
  shop: 1,
  orderId: 1,
});


// ============================================================================
// VERIFIED PURCHASE IDEMPOTENCY
// ============================================================================
//
// Shopify can retry the same webhook.
//
// This partial unique index guarantees that one Shopify order can create
// only one verified purchase event for a shop.
//
// The condition is intentionally restricted to:
// - purchase events
// - verified events
// - Shopify webhook attribution
// - events containing an orderId
//
// Widget-side purchase events are NOT affected by this index.
// ============================================================================

V1AnalyticsEventSchema.index(
  {
    shop: 1,
    event: 1,
    orderId: 1,
    verified: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      verified: true,
      attributionSource: 'shopify_webhook',
      event: 'purchase',
      orderId: {
        $exists: true,
      },
    },
  }
);


// ============================================================================
// METHODS
// ============================================================================

/**
 * Check whether this event is a verified purchase.
 */
V1AnalyticsEventSchema.methods.isVerifiedPurchase = function () {
  return (
    this.event === 'purchase' &&
    this.verified === true &&
    this.attributionSource === 'shopify_webhook'
  );
};


// ============================================================================
// STATICS
// ============================================================================

/**
 * Find analytics events for a shop.
 */
V1AnalyticsEventSchema.statics.findForShop = function (
  shop,
  options = {}
) {
  const query = {
    shop: String(shop).toLowerCase().trim(),
  };

  if (options.event) {
    query.event = options.event;
  }

  if (options.sessionId) {
    query.sessionId = options.sessionId;
  }

  if (options.startDate || options.endDate) {
    query.createdAt = {};

    if (options.startDate) {
      query.createdAt.$gte = new Date(options.startDate);
    }

    if (options.endDate) {
      query.createdAt.$lte = new Date(options.endDate);
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 1000);
};


/**
 * Find verified Shopify purchases.
 */
V1AnalyticsEventSchema.statics.findVerifiedPurchases = function (
  shop,
  options = {}
) {
  const query = {
    shop: String(shop).toLowerCase().trim(),
    event: 'purchase',
    verified: true,
    attributionSource: 'shopify_webhook',
  };

  if (options.startDate || options.endDate) {
    query.createdAt = {};

    if (options.startDate) {
      query.createdAt.$gte = new Date(options.startDate);
    }

    if (options.endDate) {
      query.createdAt.$lte = new Date(options.endDate);
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 1000);
};


// ============================================================================
// MODEL
// ============================================================================

const V1AnalyticsEvent =
  mongoose.models.V1AnalyticsEvent ||
  mongoose.model(
    'V1AnalyticsEvent',
    V1AnalyticsEventSchema
  );


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = V1AnalyticsEvent;
