'use strict';

/**
 * ============================================================================
 * Layboka AI — V1 Shopify Webhook Controller
 * ============================================================================
 *
 * File:
 * backend/src/v1/controllers/v1.webhook.controller.js
 *
 * Purpose:
 * - Process Shopify product webhooks
 * - Keep V1 product knowledge synchronized
 * - Process verified order purchases
 * - Record verified revenue
 *
 * IMPORTANT:
 * - Webhook HMAC verification must happen BEFORE this controller.
 * - Browser purchase events are never trusted as verified revenue.
 * - Shopify order data is the source of truth for purchases/revenue.
 *
 * ============================================================================
 */

const V1Shop = require('../models/V1Shop');
const V1AnalyticsEvent = require('../models/V1AnalyticsEvent');

const {
  upsertProduct,
  deleteProduct
} = require('../services/v1.product.service');


// ============================================================================
// CONSTANTS
// ============================================================================

const SUPPORTED_TOPICS = Object.freeze([
  'products/create',
  'products/update',
  'products/delete',
  'orders/create',
  'orders/paid'
]);


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
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0];
}


function getWebhookTopic(req) {
  return (
    req.get('X-Shopify-Topic') ||
    req.get('x-shopify-topic') ||
    ''
  )
    .trim()
    .toLowerCase();
}


function getWebhookShop(req) {
  return normalizeShop(
    req.get('X-Shopify-Shop-Domain') ||
    req.get('x-shopify-shop-domain')
  );
}


function getWebhookId(req) {
  return (
    req.get('X-Shopify-Webhook-Id') ||
    req.get('x-shopify-webhook-id') ||
    null
  );
}


function getOrderId(order) {
  if (!order) {
    return null;
  }

  return order.id
    ? String(order.id)
    : null;
}


function getOrderNumber(order) {
  if (!order) {
    return null;
  }

  if (order.order_number !== undefined) {
    return String(order.order_number);
  }

  if (order.name) {
    return String(order.name);
  }

  return null;
}


function getOrderRevenue(order) {
  if (!order) {
    return 0;
  }

  const candidates = [
    order.current_total_price,
    order.total_price
  ];

  for (const value of candidates) {
    const parsed = Number(value);

    if (
      Number.isFinite(parsed) &&
      parsed >= 0
    ) {
      return parsed;
    }
  }

  return 0;
}


function getOrderCurrency(order) {
  if (!order) {
    return 'USD';
  }

  return (
    order.currency ||
    order.presentment_currency ||
    'USD'
  )
    .toString()
    .trim()
    .toUpperCase()
    .slice(0, 10);
}


function getSessionId(order) {
  /*
   * Shopify orders do not reliably contain the original
   * Layboka widget session ID.
   *
   * Therefore we use a deterministic fallback here.
   *
   * Future attribution can be improved by storing
   * Layboka attribution metadata in checkout/cart data.
   */

  const orderId = getOrderId(order);

  if (!orderId) {
    return `shopify-order-${Date.now()}`;
  }

  return `shopify-order-${orderId}`;
}


function extractLineItems(order) {
  if (
    !order ||
    !Array.isArray(order.line_items)
  ) {
    return [];
  }

  return order.line_items
    .map((item) => ({
      productId: item.product_id
        ? String(item.product_id)
        : null,

      variantId: item.variant_id
        ? String(item.variant_id)
        : null,

      title: item.title
        ? String(item.title).slice(0, 500)
        : null,

      quantity: Number(item.quantity) || 0,

      price: Number(item.price) || 0
    }))
    .filter((item) => item.productId);
}


// ============================================================================
// PRODUCT WEBHOOKS
// ============================================================================

async function handleProductCreate(shop, payload) {
  if (!payload || !payload.id) {
    throw new Error(
      'Invalid Shopify product payload.'
    );
  }

  await upsertProduct(
    shop,
    payload
  );

  return {
    action: 'product_created',
    productId: String(payload.id)
  };
}


async function handleProductUpdate(shop, payload) {
  if (!payload || !payload.id) {
    throw new Error(
      'Invalid Shopify product payload.'
    );
  }

  await upsertProduct(
    shop,
    payload
  );

  return {
    action: 'product_updated',
    productId: String(payload.id)
  };
}


async function handleProductDelete(shop, payload) {
  if (!payload || !payload.id) {
    throw new Error(
      'Invalid Shopify product delete payload.'
    );
  }

  await deleteProduct(
    shop,
    payload.id
  );

  return {
    action: 'product_deleted',
    productId: String(payload.id)
  };
}


// ============================================================================
// ORDER WEBHOOK
// ============================================================================

async function handleOrderCreated(shop, order) {
  if (!order) {
    throw new Error(
      'Invalid Shopify order payload.'
    );
  }

  /*
   * orders/create does NOT necessarily mean payment was completed.
   *
   * We intentionally do not record verified revenue here.
   *
   * The orders/paid webhook is the authoritative purchase event.
   */

  return {
    action: 'order_created',
    orderId: getOrderId(order)
  };
}


async function handleOrderPaid(shop, order) {
  if (!order) {
    throw new Error(
      'Invalid Shopify paid-order payload.'
    );
  }

  const orderId = getOrderId(order);

  if (!orderId) {
    throw new Error(
      'Shopify paid order is missing order ID.'
    );
  }

  const existingPurchase =
    await V1AnalyticsEvent.findOne({
      shop,
      event: 'purchase',
      orderId,
      verified: true
    })
      .select({
        _id: 1
      })
      .lean();

  /*
   * Shopify can retry webhooks.
   *
   * Never create duplicate verified purchases.
   */
  if (existingPurchase) {
    return {
      action: 'purchase_already_recorded',
      orderId
    };
  }

  const revenue = getOrderRevenue(order);
  const currency = getOrderCurrency(order);
  const orderNumber = getOrderNumber(order);
  const sessionId = getSessionId(order);
  const lineItems = extractLineItems(order);

  const event = await V1AnalyticsEvent.create({
    shop,

    event: 'purchase',

    sessionId,

    shopifyProductId:
      lineItems.length === 1
        ? lineItems[0].productId
        : undefined,

    orderId,
    orderNumber,

    revenue,
    currency,

    verified: true,

    attributionSource:
      'shopify_webhook',

    metadata: {
      source: 'shopify',
      webhookEvent: 'orders/paid',
      lineItemCount: lineItems.length,
      lineItems
    },

    createdAt: new Date()
  });

  await V1Shop.updateOne(
    {
      shop
    },
    {
      $set: {
        lastActiveAt: new Date()
      }
    }
  );

  return {
    action: 'purchase_recorded',
    orderId,
    orderNumber,
    revenue,
    currency,
    eventId: event._id
  };
}


// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

async function handleWebhook(req, res) {
  const topic = getWebhookTopic(req);
  const shop = getWebhookShop(req);
  const webhookId = getWebhookId(req);

  if (!topic) {
    return res.status(400).json({
      success: false,
      error: 'Missing Shopify webhook topic.'
    });
  }

  if (!shop) {
    return res.status(400).json({
      success: false,
      error: 'Missing Shopify shop domain.'
    });
  }

  if (!SUPPORTED_TOPICS.includes(topic)) {
    /*
     * Returning 200 for unsupported topics prevents
     * unnecessary Shopify webhook retries.
     */
    return res.status(200).json({
      success: true,
      ignored: true,
      topic
    });
  }

  try {
    const shopExists = await V1Shop.exists({
      shop
    });

    if (!shopExists) {
      /*
       * The webhook may arrive after an app/store record
       * has been removed. Do not process unknown shops.
       */
      return res.status(404).json({
        success: false,
        error: 'Shop is not registered.'
      });
    }

    let result;

    switch (topic) {
      case 'products/create':
        result = await handleProductCreate(
          shop,
          req.body
        );
        break;

      case 'products/update':
        result = await handleProductUpdate(
          shop,
          req.body
        );
        break;

      case 'products/delete':
        result = await handleProductDelete(
          shop,
          req.body
        );
        break;

      case 'orders/create':
        result = await handleOrderCreated(
          shop,
          req.body
        );
        break;

      case 'orders/paid':
        result = await handleOrderPaid(
          shop,
          req.body
        );
        break;

      default:
        result = {
          action: 'ignored',
          topic
        };
    }

    return res.status(200).json({
      success: true,
      topic,
      webhookId,
      result
    });
  } catch (error) {
    console.error(
      `[V1 Shopify Webhook] ${topic}`,
      error
    );

    /*
     * Return 500 so Shopify retries transient failures.
     */
    return res.status(500).json({
      success: false,
      error: 'Webhook processing failed.'
    });
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  SUPPORTED_TOPICS,
  handleWebhook,

  handleProductCreate,
  handleProductUpdate,
  handleProductDelete,

  handleOrderCreated,
  handleOrderPaid
};
