'use strict';

/**
 * ============================================================================
 * Layboka AI — V1 Shopify Webhook Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/v1.webhook.service.js
 *
 * Purpose:
 * - Register required Shopify webhooks
 * - Avoid duplicate webhook registrations
 * - Support product synchronization
 * - Support verified purchase tracking
 *
 * ============================================================================
 */

const V1Shop = require('../models/V1Shop');


// ============================================================================
// CONFIG
// ============================================================================

const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_API_VERSION || '2026-07';

const APP_URL =
  process.env.APP_URL ||
  process.env.BACKEND_URL ||
  'http://localhost:5000';

const WEBHOOK_PATH =
  '/v1/webhooks/shopify';

const WEBHOOK_ADDRESS =
  `${APP_URL.replace(/\/+$/, '')}${WEBHOOK_PATH}`;


// ============================================================================
// REQUIRED TOPICS
// ============================================================================

const REQUIRED_WEBHOOKS = Object.freeze([
  'products/create',
  'products/update',
  'products/delete',
  'orders/create',
  'orders/paid'
]);


// ============================================================================
// SHOPIFY REQUEST
// ============================================================================

async function shopifyRequest(shop, accessToken, path, options = {}) {
  if (!shop || !accessToken) {
    throw new Error(
      'Shop and Shopify access token are required.'
    );
  }

  const response = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}${path}`,
    {
      method: options.method || 'GET',

      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },

      body: options.body
        ? JSON.stringify(options.body)
        : undefined
    }
  );

  const text = await response.text();

  let data = {};

  try {
    data = text
      ? JSON.parse(text)
      : {};
  } catch {
    data = {
      raw: text
    };
  }

  if (!response.ok) {
    const error = new Error(
      `Shopify API request failed: ${response.status}`
    );

    error.status = response.status;
    error.response = data;

    throw error;
  }

  return data;
}


// ============================================================================
// LOAD SHOP
// ============================================================================

async function resolveShop(shopOrId) {
  if (!shopOrId) {
    throw new Error(
      'V1 shop is required.'
    );
  }

  if (
    typeof shopOrId === 'object' &&
    shopOrId.shop &&
    shopOrId.accessToken
  ) {
    return shopOrId;
  }

  let shop;

  if (typeof shopOrId === 'string') {
    shop = await V1Shop.findOne({
      shop: shopOrId.toLowerCase()
    }).select('+accessToken');
  } else {
    shop = await V1Shop.findById(shopOrId)
      .select('+accessToken');
  }

  if (!shop) {
    throw new Error(
      'V1 shop not found.'
    );
  }

  if (!shop.accessToken) {
    throw new Error(
      'Shopify access token is missing.'
    );
  }

  return shop;
}


// ============================================================================
// GET EXISTING WEBHOOKS
// ============================================================================

async function getExistingWebhooks(shop, accessToken) {
  const data = await shopifyRequest(
    shop,
    accessToken,
    '/webhooks.json?limit=250'
  );

  return Array.isArray(data.webhooks)
    ? data.webhooks
    : [];
}


// ============================================================================
// FIND EXISTING WEBHOOK
// ============================================================================

function findExistingWebhook(
  webhooks,
  topic,
  address
) {
  return webhooks.find(
    (webhook) =>
      webhook.topic === topic &&
      webhook.address === address
  );
}


// ============================================================================
// CREATE WEBHOOK
// ============================================================================

async function createWebhook(
  shop,
  accessToken,
  topic,
  address
) {
  return shopifyRequest(
    shop,
    accessToken,
    '/webhooks.json',
    {
      method: 'POST',

      body: {
        webhook: {
          topic,
          address,
          format: 'json'
        }
      }
    }
  );
}


// ============================================================================
// REGISTER ONE WEBHOOK
// ============================================================================

async function registerWebhook(
  shop,
  accessToken,
  topic,
  existingWebhooks = null
) {
  const webhooks =
    existingWebhooks ||
    await getExistingWebhooks(
      shop,
      accessToken
    );

  const existing = findExistingWebhook(
    webhooks,
    topic,
    WEBHOOK_ADDRESS
  );

  if (existing) {
    return {
      topic,
      status: 'already_registered',
      webhookId: existing.id,
      address: existing.address
    };
  }

  const result = await createWebhook(
    shop,
    accessToken,
    topic,
    WEBHOOK_ADDRESS
  );

  return {
    topic,
    status: 'registered',
    webhookId:
      result?.webhook?.id || null,
    address: WEBHOOK_ADDRESS
  };
}


// ============================================================================
// REGISTER ALL WEBHOOKS
// ============================================================================

async function registerAllWebhooks(shopOrId) {
  const shopDocument =
    await resolveShop(shopOrId);

  const shop = shopDocument.shop;
  const accessToken =
    shopDocument.accessToken;

  const existingWebhooks =
    await getExistingWebhooks(
      shop,
      accessToken
    );

  const results = [];

  for (const topic of REQUIRED_WEBHOOKS) {
    try {
      const result =
        await registerWebhook(
          shop,
          accessToken,
          topic,
          existingWebhooks
        );

      results.push({
        ...result,
        success: true
      });
    } catch (error) {
      console.error(
        `[V1 Webhook] Failed to register ${topic} for ${shop}`,
        error
      );

      results.push({
        topic,
        status: 'failed',
        success: false,
        error: error.message
      });
    }
  }

  const failed =
    results.filter(
      (item) => !item.success
    );

  return {
    shop,
    address: WEBHOOK_ADDRESS,
    total: results.length,
    registered:
      results.filter(
        (item) =>
          item.status === 'registered'
      ).length,
    alreadyRegistered:
      results.filter(
        (item) =>
          item.status === 'already_registered'
      ).length,
    failed: failed.length,
    success: failed.length === 0,
    results
  };
}


// ============================================================================
// DELETE WEBHOOK
// ============================================================================

async function deleteWebhook(
  shopOrId,
  webhookId
) {
  if (!webhookId) {
    throw new Error(
      'Webhook ID is required.'
    );
  }

  const shopDocument =
    await resolveShop(shopOrId);

  await shopifyRequest(
    shopDocument.shop,
    shopDocument.accessToken,
    `/webhooks/${encodeURIComponent(webhookId)}.json`,
    {
      method: 'DELETE'
    }
  );

  return {
    success: true,
    webhookId
  };
}


// ============================================================================
// DELETE ALL LAYBOKA WEBHOOKS
// ============================================================================

async function deleteAllWebhooks(shopOrId) {
  const shopDocument =
    await resolveShop(shopOrId);

  const webhooks =
    await getExistingWebhooks(
      shopDocument.shop,
      shopDocument.accessToken
    );

  const laybokaWebhooks =
    webhooks.filter(
      (webhook) =>
        webhook.address === WEBHOOK_ADDRESS
    );

  const results = [];

  for (const webhook of laybokaWebhooks) {
    try {
      await deleteWebhook(
        shopDocument,
        webhook.id
      );

      results.push({
        webhookId: webhook.id,
        topic: webhook.topic,
        success: true
      });
    } catch (error) {
      results.push({
        webhookId: webhook.id,
        topic: webhook.topic,
        success: false,
        error: error.message
      });
    }
  }

  return {
    shop: shopDocument.shop,
    deleted: results.filter(
      (item) => item.success
    ).length,
    failed: results.filter(
      (item) => !item.success
    ).length,
    results
  };
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  SHOPIFY_API_VERSION,
  WEBHOOK_PATH,
  WEBHOOK_ADDRESS,
  REQUIRED_WEBHOOKS,

  getExistingWebhooks,
  registerWebhook,
  registerAllWebhooks,

  deleteWebhook,
  deleteAllWebhooks
};
