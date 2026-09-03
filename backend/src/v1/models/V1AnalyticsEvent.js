/**
 * ============================================================================
 * Layboka AI - V1
 * Analytics Event Model
 * ============================================================================
 *
 * File:
 * backend/src/v1/models/V1AnalyticsEvent.js
 *
 * Purpose:
 * - Store V1 shopper funnel events
 * - Support merchant analytics
 * - Support conversion attribution
 * - Support Shopify purchase verification
 *
 * Collection:
 * v1_analytics_events
 *
 * Funnel events:
 * - widget_open
 * - conversation
 * - product_view
 * - product_click
 * - add_to_cart
 * - checkout
 * - purchase
 * ============================================================================
 */

'use strict';

const mongoose = require('mongoose');


// ============================================================================
// EVENT TYPES
// ============================================================================

const EVENT_TYPES = [
  'widget_open',
  'conversation',
  'product_view',
  'product_click',
  'add_to_cart',
  'checkout',
  'purchase'
];


// ============================================================================
// SCHEMA
// ============================================================================

const V1AnalyticsEventSchema =
  new mongoose.Schema(
    {

      // ----------------------------------------------------------------------
      // SHOP
      // ----------------------------------------------------------------------

      shop: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
      },

      shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'V1Shop',
        required: true,
        index: true
      },


      // ----------------------------------------------------------------------
      // EVENT
      // ----------------------------------------------------------------------

      event: {
        type: String,
        enum: EVENT_TYPES,
        required: true,
        index: true
      },


      // ----------------------------------------------------------------------
      // VISITOR SESSION
      // ----------------------------------------------------------------------

      /*
       * Anonymous browser session identifier.
       *
       * This is NOT intended to identify a person.
       */
      sessionId: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
        index: true
      },


      // ----------------------------------------------------------------------
      // PRODUCT
      // ----------------------------------------------------------------------

      productId: {
        type: String,
        default: null,
        trim: true,
        maxlength: 200,
        index: true
      },

      shopifyProductId: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100,
        index: true
      },


      // ----------------------------------------------------------------------
      // EVENT METADATA
      // ----------------------------------------------------------------------

      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      },


      // ----------------------------------------------------------------------
      // PURCHASE ATTRIBUTION
      // ----------------------------------------------------------------------

      /*
       * These fields are mainly populated when Shopify confirms
       * an actual order.
       */

      orderId: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100,
        index: true
      },

      orderNumber: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100
      },

      revenue: {
        type: Number,
        default: null,
        min: 0
      },

      currency: {
        type: String,
        default: null,
        uppercase: true,
        trim: true,
        maxlength: 10
      },


      // ----------------------------------------------------------------------
      // ATTRIBUTION
      // ----------------------------------------------------------------------

      /*
       * Set to true only when the purchase has been verified against
       * Shopify order data.
       */
      verified: {
        type: Boolean,
        default: false,
        index: true
      },

      attributionSource: {
        type: String,
        enum: [
          'widget',
          'shopify_webhook',
          'system'
        ],
        default: 'widget'
      },


      // ----------------------------------------------------------------------
      // TIMESTAMP
      // ----------------------------------------------------------------------

      createdAt: {
        type: Date,
        default: Date.now,
        index: true
      }

    },

    {
      collection: 'v1_analytics_events',

      /*
       * We explicitly manage createdAt because analytics events should
       * represent the actual event timestamp.
       */
      timestamps: false,

      versionKey: false
    }
  );


// ============================================================================
// INDEXES
// ============================================================================

/*
 * Merchant funnel analytics by time.
 */
V1AnalyticsEventSchema.index({
  shop: 1,
  createdAt: -1
});


/*
 * Merchant + event type + time.
 *
 * Useful for:
 * - widget opens
 * - conversations
 * - product clicks
 * - checkouts
 * - purchases
 */
V1AnalyticsEventSchema.index({
  shop: 1,
  event: 1,
  createdAt: -1
});


/*
 * Visitor journey.
 *
 * Allows the system to reconstruct the funnel for one anonymous session.
 */
V1AnalyticsEventSchema.index({
  shop: 1,
  sessionId: 1,
  createdAt: 1
});


/*
 * Product conversion analysis.
 */
V1AnalyticsEventSchema.index({
  shop: 1,
  shopifyProductId: 1,
  event: 1,
  createdAt: -1
});


/*
 * Verified revenue queries.
 */
V1AnalyticsEventSchema.index({
  shop: 1,
  verified: 1,
  event: 1,
  createdAt: -1
});


/*
 * Shopify order lookup.
 *
 * Prevents the same order from becoming difficult to find when a webhook
 * is retried.
 */
V1AnalyticsEventSchema.index({
  shop: 1,
  orderId: 1
});


// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Determine whether this event represents a verified purchase.
 */
V1AnalyticsEventSchema.methods.isVerifiedPurchase =
  function () {

    return (
      this.event === 'purchase' &&
      this.verified === true &&
      Boolean(this.orderId)
    );
  };


// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get events for a merchant.
 */
V1AnalyticsEventSchema.statics.findForShop =
  function (
    shop,
    options = {}
  ) {

    const {
      event,
      sessionId,
      startDate,
      endDate,
      limit = 500
    } = options;

    const query = {
      shop
    };

    if (event) {
      query.event = event;
    }

    if (sessionId) {
      query.sessionId = sessionId;
    }

    if (
      startDate ||
      endDate
    ) {

      query.createdAt = {};

      if (startDate) {
        query.createdAt.$gte =
          new Date(startDate);
      }

      if (endDate) {
        query.createdAt.$lte =
          new Date(endDate);
      }
    }

    return this.find(query)
      .sort({
        createdAt: -1
      })
      .limit(
        Math.min(
          Math.max(
            Number(limit) || 500,
            1
          ),
          5000
        )
      )
      .lean();
  };


/**
 * Get verified purchases for a merchant.
 */
V1AnalyticsEventSchema.statics.findVerifiedPurchases =
  function (
    shop,
    options = {}
  ) {

    const {
      startDate,
      endDate,
      limit = 500
    } = options;

    const query = {
      shop,
      event: 'purchase',
      verified: true
    };

    if (
      startDate ||
      endDate
    ) {

      query.createdAt = {};

      if (startDate) {
        query.createdAt.$gte =
          new Date(startDate);
      }

      if (endDate) {
        query.createdAt.$lte =
          new Date(endDate);
      }
    }

    return this.find(query)
      .sort({
        createdAt: -1
      })
      .limit(
        Math.min(
          Math.max(
            Number(limit) || 500,
            1
          ),
          5000
        )
      )
      .lean();
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
// EXPORT
// ============================================================================

module.exports =
  V1AnalyticsEvent;
