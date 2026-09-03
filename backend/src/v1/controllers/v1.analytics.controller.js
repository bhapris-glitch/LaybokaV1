/**
 * ============================================================================
 * Layboka AI - V1
 * Analytics Controller
 * ============================================================================
 *
 * File:
 * backend/src/v1/controllers/v1.analytics.controller.js
 *
 * Purpose:
 * - Track V1 conversion events
 * - Track widget opens
 * - Track conversations
 * - Track product views/clicks
 * - Track add-to-cart
 * - Track checkout
 * - Track purchases
 *
 * Funnel:
 *
 * widget_open
 *     ↓
 * conversation
 *     ↓
 * product_view
 *     ↓
 * product_click
 *     ↓
 * add_to_cart
 *     ↓
 * checkout
 *     ↓
 * purchase
 *
 * IMPORTANT:
 * - This endpoint does NOT trust merchant revenue values blindly.
 * - Purchase events should ultimately be confirmed by Shopify webhooks.
 * - Browser-side purchase tracking is useful for attribution, but is not
 *   considered the final source of truth for revenue.
 * ============================================================================
 */

'use strict';

const V1Shop = require('../models/V1Shop');


// ============================================================================
// EVENT TYPES
// ============================================================================

const EVENT_TYPES = Object.freeze({
  WIDGET_OPEN: 'widget_open',
  CONVERSATION: 'conversation',
  PRODUCT_VIEW: 'product_view',
  PRODUCT_CLICK: 'product_click',
  ADD_TO_CART: 'add_to_cart',
  CHECKOUT: 'checkout',
  PURCHASE: 'purchase'
});


// ============================================================================
// POST ANALYTICS EVENT
// ============================================================================

/**
 * POST /v1/analytics/event
 *
 * Example:
 *
 * {
 *   "shop": "example.myshopify.com",
 *   "event": "product_click",
 *   "sessionId": "abc123",
 *   "productId": "123",
 *   "shopifyProductId": "987654",
 *   "metadata": {}
 * }
 */
async function trackEvent(req, res) {
  try {

    const {
      shop: rawShop,
      event,
      sessionId,
      productId,
      shopifyProductId,
      metadata = {}
    } = req.body || {};

    // ------------------------------------------------------------------------
    // Normalize shop
    // ------------------------------------------------------------------------

    const shop =
      normalizeShopDomain(rawShop);

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required',
        code: 'SHOP_REQUIRED'
      });
    }

    // ------------------------------------------------------------------------
    // Validate event
    // ------------------------------------------------------------------------

    if (!isValidEvent(event)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid analytics event',
        code: 'INVALID_EVENT',
        allowedEvents: Object.values(EVENT_TYPES)
      });
    }

    // ------------------------------------------------------------------------
    // Validate session
    // ------------------------------------------------------------------------

    if (
      typeof sessionId !== 'string' ||
      !sessionId.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
        code: 'SESSION_REQUIRED'
      });
    }

    // ------------------------------------------------------------------------
    // Find merchant
    // ------------------------------------------------------------------------

    const shopDocument =
      await V1Shop.findOne({
        shop
      }).select('_id shop');

    if (!shopDocument) {
      return res.status(404).json({
        success: false,
        error: 'V1 shop installation not found',
        code: 'SHOP_NOT_INSTALLED'
      });
    }

    // ------------------------------------------------------------------------
    // Sanitize metadata
    // ------------------------------------------------------------------------

    const safeMetadata =
      sanitizeMetadata(metadata);

    // ------------------------------------------------------------------------
    // Event payload
    // ------------------------------------------------------------------------

    const analyticsEvent = {
      shop: shopDocument.shop,

      shopId:
        shopDocument._id,

      event,

      sessionId:
        sessionId.trim().slice(0, 200),

      productId:
        normalizeOptionalString(
          productId,
          200
        ),

      shopifyProductId:
        normalizeOptionalString(
          shopifyProductId,
          100
        ),

      metadata:
        safeMetadata,

      createdAt:
        new Date()
    };

    // ------------------------------------------------------------------------
    // Persist event
    // ------------------------------------------------------------------------

    /*
     * The model is intentionally loaded here rather than globally so this
     * controller remains easy to test and avoids circular dependencies.
     *
     * File created next:
     * models/V1AnalyticsEvent.js
     */

    const V1AnalyticsEvent =
      require('../models/V1AnalyticsEvent');

    await V1AnalyticsEvent.create(
      analyticsEvent
    );

    // ------------------------------------------------------------------------
    // Update merchant activity
    // ------------------------------------------------------------------------

    await V1Shop.updateOne(
      {
        _id: shopDocument._id
      },
      {
        $set: {
          lastActiveAt: new Date()
        }
      }
    );

    // ------------------------------------------------------------------------
    // Response
    // ------------------------------------------------------------------------

    return res.status(201).json({
      success: true,

      data: {
        event,
        tracked: true
      }
    });

  } catch (error) {

    console.error(
      '[V1 ANALYTICS] Event tracking failed:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Unable to record analytics event',
      code: 'ANALYTICS_ERROR'
    });
  }
}


// ============================================================================
// BATCH EVENTS
// ============================================================================

/**
 * POST /v1/analytics/events
 *
 * Allows the widget to send several events in one request.
 *
 * Maximum:
 * 20 events per request.
 */
async function trackEvents(req, res) {
  try {

    const {
      shop: rawShop,
      events
    } = req.body || {};

    const shop =
      normalizeShopDomain(rawShop);

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required',
        code: 'SHOP_REQUIRED'
      });
    }

    if (!Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'Events must be an array',
        code: 'INVALID_EVENTS'
      });
    }

    if (
      events.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: 'At least one event is required',
        code: 'EMPTY_EVENTS'
      });
    }

    if (
      events.length > 20
    ) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 events per request',
        code: 'TOO_MANY_EVENTS'
      });
    }

    // ------------------------------------------------------------------------
    // Find merchant
    // ------------------------------------------------------------------------

    const shopDocument =
      await V1Shop.findOne({
        shop
      }).select('_id shop');

    if (!shopDocument) {
      return res.status(404).json({
        success: false,
        error: 'V1 shop installation not found',
        code: 'SHOP_NOT_INSTALLED'
      });
    }

    // ------------------------------------------------------------------------
    // Build event documents
    // ------------------------------------------------------------------------

    const documents = [];

    for (const item of events) {

      if (!item) {
        continue;
      }

      if (
        !isValidEvent(item.event)
      ) {
        continue;
      }

      if (
        typeof item.sessionId !== 'string' ||
        !item.sessionId.trim()
      ) {
        continue;
      }

      documents.push({
        shop:
          shopDocument.shop,

        shopId:
          shopDocument._id,

        event:
          item.event,

        sessionId:
          item.sessionId
            .trim()
            .slice(0, 200),

        productId:
          normalizeOptionalString(
            item.productId,
            200
          ),

        shopifyProductId:
          normalizeOptionalString(
            item.shopifyProductId,
            100
          ),

        metadata:
          sanitizeMetadata(
            item.metadata
          ),

        createdAt:
          new Date()
      });
    }

    if (
      documents.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: 'No valid analytics events supplied',
        code: 'NO_VALID_EVENTS'
      });
    }

    // ------------------------------------------------------------------------
    // Insert
    // ------------------------------------------------------------------------

    const V1AnalyticsEvent =
      require('../models/V1AnalyticsEvent');

    await V1AnalyticsEvent.insertMany(
      documents,
      {
        ordered: false
      }
    );

    // ------------------------------------------------------------------------
    // Update activity
    // ------------------------------------------------------------------------

    await V1Shop.updateOne(
      {
        _id: shopDocument._id
      },
      {
        $set: {
          lastActiveAt: new Date()
        }
      }
    );

    return res.status(201).json({
      success: true,

      data: {
        received:
          events.length,

        tracked:
          documents.length
      }
    });

  } catch (error) {

    console.error(
      '[V1 ANALYTICS] Batch tracking failed:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Unable to record analytics events',
      code: 'ANALYTICS_ERROR'
    });
  }
}


// ============================================================================
// HELPERS
// ============================================================================

function isValidEvent(event) {
  return Object.values(
    EVENT_TYPES
  ).includes(event);
}


function normalizeShopDomain(shop) {
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


function normalizeOptionalString(
  value,
  maxLength
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    typeof value !== 'string' &&
    typeof value !== 'number'
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(
    0,
    maxLength
  );
}


// ============================================================================
// METADATA SANITIZATION
// ============================================================================

function sanitizeMetadata(metadata) {

  if (
    !metadata ||
    typeof metadata !== 'object' ||
    Array.isArray(metadata)
  ) {
    return {};
  }

  const result = {};

  /*
   * Keep metadata intentionally small.
   * Analytics should not become a dumping ground for arbitrary data.
   */
  const allowedKeys = [
    'page',
    'source',
    'device',
    'variantId',
    'productTitle',
    'cartValue',
    'currency',
    'orderId',
    'checkoutId',
    'referrer'
  ];

  for (
    const key of allowedKeys
  ) {

    if (
      metadata[key] === undefined ||
      metadata[key] === null
    ) {
      continue;
    }

    const value =
      metadata[key];

    if (
      typeof value === 'string'
    ) {
      result[key] =
        value.trim().slice(0, 500);

      continue;
    }

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      result[key] =
        value;

      continue;
    }

    if (
      typeof value === 'boolean'
    ) {
      result[key] =
        value;
    }
  }

  return result;
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  trackEvent,
  trackEvents,

  EVENT_TYPES,

  isValidEvent,
  normalizeShopDomain,
  sanitizeMetadata
};
