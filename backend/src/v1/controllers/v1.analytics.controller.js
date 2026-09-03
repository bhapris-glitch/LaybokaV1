/**
 * ============================================================================
 * Layboka AI — V1
 * Analytics Controller
 * ============================================================================
 *
 * File:
 * backend/src/v1/controllers/v1.analytics.controller.js
 *
 * Purpose:
 * - Receive analytics events from the merchant widget
 * - Validate incoming event data
 * - Store funnel events
 * - Support batch event tracking
 *
 * IMPORTANT:
 * - Browser purchase events are NOT treated as verified revenue.
 * - Verified purchases come from Shopify webhooks.
 *
 * ============================================================================
 */

'use strict';

const V1Shop = require('../models/V1Shop');
const V1AnalyticsEvent = require('../models/V1AnalyticsEvent');


// ============================================================================
// CONSTANTS
// ============================================================================

const ALLOWED_EVENTS = new Set([
  'widget_open',
  'conversation',
  'product_view',
  'product_click',
  'add_to_cart',
  'checkout',
  'purchase',
]);

const MAX_BATCH_SIZE = 20;
const MAX_SESSION_ID_LENGTH = 200;
const MAX_METADATA_KEYS = 30;


// ============================================================================
// HELPERS
// ============================================================================

function normalizeShop(shop) {
  if (!shop || typeof shop !== 'string') {
    return null;
  }

  return shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
}


function cleanString(value, maxLength = 500) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return undefined;
  }

  return cleaned.slice(0, maxLength);
}


function cleanNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return undefined;
  }

  return number;
}


function cleanMetadata(metadata) {
  if (
    !metadata ||
    typeof metadata !== 'object' ||
    Array.isArray(metadata)
  ) {
    return {};
  }

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
    'referrer',
  ];

  const result = {};

  for (const key of allowedKeys) {
    if (
      Object.prototype.hasOwnProperty.call(
        metadata,
        key
      )
    ) {
      const value = metadata[key];

      if (
        typeof value === 'string'
      ) {
        const cleaned = cleanString(value, 500);

        if (cleaned !== undefined) {
          result[key] = cleaned;
        }
      } else {
        const number = cleanNumber(value);

        if (number !== undefined) {
          result[key] = number;
        }
      }
    }
  }

  return Object.keys(result)
    .slice(0, MAX_METADATA_KEYS)
    .reduce((output, key) => {
      output[key] = result[key];
      return output;
    }, {});
}


function validateEvent(event) {
  return (
    typeof event === 'string' &&
    ALLOWED_EVENTS.has(event)
  );
}


// ============================================================================
// SHOP RESOLUTION
// ============================================================================

async function resolveShop(shop) {
  const normalizedShop = normalizeShop(shop);

  if (!normalizedShop) {
    return null;
  }

  return V1Shop.findOne({
    shop: normalizedShop,
  });
}


// ============================================================================
// BUILD EVENT
// ============================================================================

function buildEventDocument({
  shopDoc,
  event,
  sessionId,
  productId,
  shopifyProductId,
  metadata,
}) {
  const cleanEvent = {
    shop: shopDoc.shop,
    shopId: shopDoc._id,
    event,
    sessionId,
    attributionSource: 'widget',
    verified: false,
    metadata: cleanMetadata(metadata),
  };

  const cleanedProductId = cleanString(
    productId,
    100
  );

  if (cleanedProductId) {
    cleanEvent.productId = cleanedProductId;
  }

  const cleanedShopifyProductId = cleanString(
    shopifyProductId,
    100
  );

  if (cleanedShopifyProductId) {
    cleanEvent.shopifyProductId =
      cleanedShopifyProductId;
  }

  return cleanEvent;
}


// ============================================================================
// TRACK SINGLE EVENT
// ============================================================================

async function trackEvent(req, res) {
  try {
    const shop = normalizeShop(
      req.body?.shop
    );

    const event = req.body?.event;

    const sessionId = cleanString(
      req.body?.sessionId,
      MAX_SESSION_ID_LENGTH
    );

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required',
      });
    }

    if (!validateEvent(event)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid analytics event',
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
    }

    const shopDoc = await resolveShop(shop);

    if (!shopDoc) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    const document = buildEventDocument({
      shopDoc,
      event,
      sessionId,
      productId: req.body?.productId,
      shopifyProductId:
        req.body?.shopifyProductId,
      metadata: req.body?.metadata,
    });

    const saved =
      await V1AnalyticsEvent.create(
        document
      );

    await V1Shop.updateOne(
      {
        _id: shopDoc._id,
      },
      {
        $set: {
          lastActiveAt: new Date(),
        },
      }
    );

    return res.status(201).json({
      success: true,
      eventId: saved._id,
    });
  } catch (error) {
    console.error(
      '[V1 Analytics] Track event error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to track analytics event',
    });
  }
}


// ============================================================================
// TRACK BATCH EVENTS
// ============================================================================

async function trackEvents(req, res) {
  try {
    const shop = normalizeShop(
      req.body?.shop
    );

    const events = req.body?.events;

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required',
      });
    }

    if (!Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'Events must be an array',
      });
    }

    if (
      events.length === 0 ||
      events.length > MAX_BATCH_SIZE
    ) {
      return res.status(400).json({
        success: false,
        error: `Events must contain between 1 and ${MAX_BATCH_SIZE} items`,
      });
    }

    const shopDoc = await resolveShop(shop);

    if (!shopDoc) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    const documents = [];

    for (const item of events) {
      if (
        !item ||
        typeof item !== 'object'
      ) {
        continue;
      }

      const event = item.event;

      const sessionId = cleanString(
        item.sessionId,
        MAX_SESSION_ID_LENGTH
      );

      if (
        !validateEvent(event) ||
        !sessionId
      ) {
        continue;
      }

      documents.push(
        buildEventDocument({
          shopDoc,
          event,
          sessionId,
          productId: item.productId,
          shopifyProductId:
            item.shopifyProductId,
          metadata: item.metadata,
        })
      );
    }

    if (documents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid analytics events supplied',
      });
    }

    const saved =
      await V1AnalyticsEvent.insertMany(
        documents,
        {
          ordered: false,
        }
      );

    await V1Shop.updateOne(
      {
        _id: shopDoc._id,
      },
      {
        $set: {
          lastActiveAt: new Date(),
        },
      }
    );

    return res.status(201).json({
      success: true,
      count: saved.length,
    });
  } catch (error) {
    console.error(
      '[V1 Analytics] Batch event error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to track analytics events',
    });
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  trackEvent,
  trackEvents,
};
