/**
 * ============================================================================
 * Layboka AI — V1
 * Shopify Webhook Controller
 * ============================================================================
 *
 * File:
 * backend/src/v1/controllers/v1.webhook.controller.js
 *
 * Purpose:
 * - Receive verified Shopify webhooks
 * - Keep V1 product catalog synchronized
 * - Record verified paid orders
 * - Prevent duplicate revenue events
 *
 * Supported V1 topics:
 *   products/create
 *   products/update
 *   products/delete
 *   orders/paid
 *
 * IMPORTANT:
 * - HMAC verification happens in v1.webhook.routes.js
 *   BEFORE this controller runs.
 * - Browser/client purchase events are NOT treated as verified revenue.
 * - Shopify orders/paid is the source of truth for V1 revenue.
 *
 * ============================================================================
 */

'use strict';

const V1Shop = require('../models/V1Shop');
const V1AnalyticsEvent =
  require('../models/V1AnalyticsEvent');

const {
  upsertProduct,
  deleteProduct,
} = require('../services/v1.product.service');


// ============================================================================
// SUPPORTED TOPICS
// ============================================================================

const SUPPORTED_TOPICS = Object.freeze([
  'products/create',
  'products/update',
  'products/delete',
  'orders/paid',
]);


// ============================================================================
// HANDLE WEBHOOK
// ============================================================================

async function handleWebhook(req, res) {
  try {
    const topic =
      getWebhookTopic(req);

    const shopDomain =
      normalizeShop(
        req.headers['x-shopify-shop-domain']
      );

    const payload =
      req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error:
          'Shopify webhook topic is missing',
      });
    }

    if (
      !SUPPORTED_TOPICS.includes(topic)
    ) {
      /*
       * Return 200 for topics we deliberately
       * do not process so Shopify does not
       * repeatedly retry them.
       */
      return res.status(200).json({
        success: true,
        ignored: true,
        topic,
      });
    }

    if (!shopDomain) {
      return res.status(400).json({
        success: false,
        error:
          'Shopify shop domain is missing',
      });
    }

    if (!payload) {
      return res.status(400).json({
        success: false,
        error:
          'Webhook payload is missing',
      });
    }

    const shop =
      await V1Shop.findOne({
        shop: shopDomain,
      });

    if (!shop) {
      /*
       * The app may have been uninstalled or the
       * merchant may no longer exist in V1.
       *
       * Do not retry forever.
       */
      return res.status(200).json({
        success: true,
        ignored: true,
        reason:
          'V1 shop not found',
      });
    }

    switch (topic) {
      case 'products/create':
        await handleProductCreate(
          shop,
          payload
        );
        break;

      case 'products/update':
        await handleProductUpdate(
          shop,
          payload
        );
        break;

      case 'products/delete':
        await handleProductDelete(
          shop,
          payload
        );
        break;

      case 'orders/paid':
        await handleOrderPaid(
          shop,
          payload
        );
        break;

      default:
        break;
    }

    await V1Shop.updateOne(
      {
        _id: shop._id,
      },
      {
        $set: {
          lastActiveAt:
            new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      topic,
    });
  } catch (error) {
    console.error(
      'V1 Shopify webhook error:',
      error.message
    );

    /*
     * For genuine processing errors, return 500
     * so Shopify can retry the webhook.
     */
    return res.status(500).json({
      success: false,
      error:
        'Webhook processing failed',
    });
  }
}


// ============================================================================
// PRODUCT CREATE
// ============================================================================

async function handleProductCreate(
  shop,
  product
) {
  if (!product?.id) {
    throw new Error(
      'Product ID is missing'
    );
  }

  await upsertProduct(
    shop.shop,
    product
  );
}


// ============================================================================
// PRODUCT UPDATE
// ============================================================================

async function handleProductUpdate(
  shop,
  product
) {
  if (!product?.id) {
    throw new Error(
      'Product ID is missing'
    );
  }

  await upsertProduct(
    shop.shop,
    product
  );
}


// ============================================================================
// PRODUCT DELETE
// ============================================================================

async function handleProductDelete(
  shop,
  product
) {
  if (!product?.id) {
    throw new Error(
      'Product ID is missing'
    );
  }

  await deleteProduct(
    shop.shop,
    product.id
  );
}


// ============================================================================
// ORDER PAID
// ============================================================================

async function handleOrderPaid(
  shop,
  order
) {
  const orderId =
    order?.id
      ? String(order.id)
      : null;

  if (!orderId) {
    throw new Error(
      'Shopify order ID is missing'
    );
  }

  /*
   * Shopify can retry the same webhook.
   *
   * The combination of shop + orderId is
   * our idempotency key.
   */
  const existing =
    await V1AnalyticsEvent.findOne({
      shop: shop.shop,

      orderId,

      event: 'purchase',

      verified: true,

      attributionSource:
        'shopify_webhook',
    });

  if (existing) {
    return {
      duplicate: true,
      event: existing,
    };
  }

  const revenue =
    parseMoney(
      order.current_total_price ??
      order.total_price
    );

  const currency =
    String(
      order.currency ||
      order.presentment_currency ||
      'USD'
    ).toUpperCase();

  const orderNumber =
    order.order_number != null
      ? String(
          order.order_number
        )
      : null;

  /*
   * Shopify order payload does not reliably
   * contain the Layboka browser session ID.
   *
   * Therefore this event is tied to the order,
   * not falsely attributed to a browser session.
   */
  const sessionId =
    `shopify-order-${orderId}`;

  const purchaseEvent = {
    shop:
      shop.shop,

    shopId:
      shop._id,

    event:
      'purchase',

    sessionId,

    orderId,

    orderNumber,

    revenue,

    currency,

    verified:
      true,

    attributionSource:
      'shopify_webhook',

    metadata: {
      financialStatus:
        order.financial_status ||
        null,

      fulfillmentStatus:
        order.fulfillment_status ||
        null,

      customerId:
        order.customer?.id
          ? String(
              order.customer.id
            )
          : null,

      lineItemCount:
        Array.isArray(
          order.line_items
        )
          ? order.line_items.length
          : 0,
    },

    createdAt:
      order.processed_at
        ? new Date(
            order.processed_at
          )
        : new Date(),
  };

  /*
   * The unique index on
   * { shop, event, orderId, verified }
   * should protect against concurrent webhook
   * deliveries.
   */
  try {
    await V1AnalyticsEvent.create(
      purchaseEvent
    );
  } catch (error) {
    /*
     * Duplicate-key error means another
     * webhook request inserted the event first.
     */
    if (error?.code === 11000) {
      return {
        duplicate: true,
      };
    }

    throw error;
  }

  return {
    duplicate: false,
    revenue,
    currency,
    orderId,
  };
}


// ============================================================================
// GET WEBHOOK TOPIC
// ============================================================================

function getWebhookTopic(req) {
  return (
    req.headers[
      'x-shopify-topic'
    ] ||
    req.headers[
      'X-Shopify-Topic'
    ] ||
    null
  );
}


// ============================================================================
// NORMALIZE SHOP
// ============================================================================

function normalizeShop(shop) {
  if (!shop) {
    return null;
  }

  return String(shop)
    .trim()
    .toLowerCase()
    .replace(
      /^https?:\/\//,
      ''
    )
    .replace(
      /^www\./,
      ''
    )
    .split('/')[0]
    .split('?')[0]
    .split('#')[0];
}


// ============================================================================
// MONEY PARSER
// ============================================================================

function parseMoney(value) {
  const amount =
    Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return 0;
  }

  return Math.round(
    amount * 100
  ) / 100;
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
  handleOrderPaid,
};
