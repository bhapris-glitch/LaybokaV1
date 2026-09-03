/**
 * ============================================================================
 * Layboka AI — V1
 * Shopify Webhook Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/v1.webhook.service.js
 *
 * Purpose:
 * - Register required Shopify webhooks after installation
 * - Prevent duplicate webhook registrations
 * - Delete V1 webhooks when required
 *
 * V1 webhooks:
 *   products/create
 *   products/update
 *   products/delete
 *   orders/paid
 *
 * Access tokens are handled by:
 * v1.shopify-token.service.js
 *
 * ============================================================================
 */

'use strict';

const V1Shop = require('../models/V1Shop');

const {
  getValidAccessToken,
  normalizeShop,
} = require('./v1.shopify-token.service');


// ============================================================================
// CONFIG
// ============================================================================

const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_API_VERSION || '2026-07';

const APP_URL =
  process.env.APP_URL ||
  process.env.BACKEND_URL;

const WEBHOOK_PATH =
  '/v1/webhooks/shopify';

const WEBHOOK_ADDRESS =
  APP_URL
    ? `${APP_URL.replace(/\/+$/, '')}${WEBHOOK_PATH}`
    : null;


// ============================================================================
// V1 WEBHOOKS
// ============================================================================

const REQUIRED_WEBHOOKS = Object.freeze([
  'products/create',
  'products/update',
  'products/delete',
  'orders/paid',
]);


// ============================================================================
// SHOP RESOLUTION
// ============================================================================

async function resolveShop(shopOrDomain) {
  if (!shopOrDomain) {
    throw new Error('Shop is required');
  }

  if (
    typeof shopOrDomain === 'object' &&
    shopOrDomain._id
  ) {
    return shopOrDomain;
  }

  const shopDomain =
    normalizeShop(shopOrDomain);

  const shop =
    await V1Shop.findOne({
      shop: shopDomain,
    });

  if (!shop) {
    throw new Error(
      `V1 shop not found: ${shopDomain}`
    );
  }

  return shop;
}


// ============================================================================
// SHOPIFY REQUEST
// ============================================================================

async function shopifyRequest(
  shopOrDomain,
  path,
  options = {}
) {
  const shopDomain =
    normalizeShop(
      typeof shopOrDomain === 'string'
        ? shopOrDomain
        : shopOrDomain.shop
    );

  const {
    accessToken,
  } = await getValidAccessToken(
    shopDomain
  );

  const url =
    `https://${shopDomain}/admin/api/` +
    `${SHOPIFY_API_VERSION}${path}`;

  const response =
    await fetch(url, {
      method:
        options.method || 'GET',

      headers: {
        'X-Shopify-Access-Token':
          accessToken,

        'Content-Type':
          'application/json',

        Accept:
          'application/json',

        ...(options.headers || {}),
      },

      body:
        options.body
          ? JSON.stringify(options.body)
          : undefined,
    });

  let data = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error =
      data?.errors ||
      data?.error ||
      `Shopify API request failed (${response.status})`;

    throw new Error(
      typeof error === 'string'
        ? error
        : JSON.stringify(error)
    );
  }

  return {
    data,
    response,
  };
}


// ============================================================================
// GET EXISTING WEBHOOKS
// ============================================================================

async function getExistingWebhooks(
  shopOrDomain
) {
  const result =
    await shopifyRequest(
      shopOrDomain,
      '/webhooks.json?limit=250'
    );

  return (
    result.data?.webhooks || []
  );
}


// ============================================================================
// FIND EXISTING WEBHOOK
// ============================================================================

function findExistingWebhook(
  webhooks,
  topic
) {
  return webhooks.find(
    webhook =>
      webhook.topic === topic &&
      normalizeWebhookAddress(
        webhook.address
      ) ===
        normalizeWebhookAddress(
          WEBHOOK_ADDRESS
        )
  );
}


function normalizeWebhookAddress(
  address
) {
  if (!address) return '';

  return String(address)
    .trim()
    .replace(/\/+$/, '')
    .toLowerCase();
}


// ============================================================================
// CREATE WEBHOOK
// ============================================================================

async function createWebhook(
  shopOrDomain,
  topic
) {
  if (!WEBHOOK_ADDRESS) {
    throw new Error(
      'APP_URL or BACKEND_URL is required for Shopify webhooks'
    );
  }

  const result =
    await shopifyRequest(
      shopOrDomain,
      '/webhooks.json',
      {
        method: 'POST',

        body: {
          webhook: {
            topic,

            address:
              WEBHOOK_ADDRESS,

            format: 'json',
          },
        },
      }
    );

  return result.data?.webhook || null;
}


// ============================================================================
// REGISTER ONE WEBHOOK
// ============================================================================

async function registerWebhook(
  shopOrDomain,
  topic,
  existingWebhooks = null
) {
  if (
    !REQUIRED_WEBHOOKS.includes(topic)
  ) {
    throw new Error(
      `Unsupported V1 webhook topic: ${topic}`
    );
  }

  const webhooks =
    existingWebhooks ||
    await getExistingWebhooks(
      shopOrDomain
    );

  const existing =
    findExistingWebhook(
      webhooks,
      topic
    );

  if (existing) {
    return {
      created: false,
      existing: true,
      webhook: existing,
    };
  }

  const webhook =
    await createWebhook(
      shopOrDomain,
      topic
    );

  return {
    created: true,
    existing: false,
    webhook,
  };
}


// ============================================================================
// REGISTER ALL V1 WEBHOOKS
// ============================================================================

async function registerAllWebhooks(
  shopOrDomain
) {
  await resolveShop(
    shopOrDomain
  );

  if (!WEBHOOK_ADDRESS) {
    throw new Error(
      'APP_URL or BACKEND_URL is required for Shopify webhooks'
    );
  }

  /*
   * Fetch existing webhooks once.
   * This avoids four unnecessary Shopify API calls.
   */
  const existingWebhooks =
    await getExistingWebhooks(
      shopOrDomain
    );

  const results = [];

  for (
    const topic of REQUIRED_WEBHOOKS
  ) {
    try {
      const result =
        await registerWebhook(
          shopOrDomain,
          topic,
          existingWebhooks
        );

      results.push({
        topic,
        success: true,
        ...result,
      });
    } catch (error) {
      results.push({
        topic,
        success: false,
        error: error.message,
      });
    }
  }

  const failed =
    results.filter(
      result => !result.success
    );

  return {
    success:
      failed.length === 0,

    address:
      WEBHOOK_ADDRESS,

    total:
      REQUIRED_WEBHOOKS.length,

    registered:
      results.filter(
        result =>
          result.success &&
          result.created
      ).length,

    alreadyRegistered:
      results.filter(
        result =>
          result.success &&
          result.existing
      ).length,

    failed:
      failed.length,

    results,
  };
}


// ============================================================================
// DELETE WEBHOOK
// ============================================================================

async function deleteWebhook(
  shopOrDomain,
  webhookId
) {
  if (!webhookId) {
    throw new Error(
      'Webhook ID is required'
    );
  }

  await shopifyRequest(
    shopOrDomain,
    `/webhooks/${encodeURIComponent(
      webhookId
    )}.json`,
    {
      method: 'DELETE',
    }
  );

  return {
    success: true,
    webhookId,
  };
}


// ============================================================================
// DELETE ALL V1 WEBHOOKS
// ============================================================================

async function deleteAllWebhooks(
  shopOrDomain
) {
  const webhooks =
    await getExistingWebhooks(
      shopOrDomain
    );

  const v1Webhooks =
    webhooks.filter(
      webhook =>
        REQUIRED_WEBHOOKS.includes(
          webhook.topic
        ) &&
        normalizeWebhookAddress(
          webhook.address
        ) ===
          normalizeWebhookAddress(
            WEBHOOK_ADDRESS
          )
    );

  const results = [];

  for (
    const webhook of v1Webhooks
  ) {
    try {
      await deleteWebhook(
        shopOrDomain,
        webhook.id
      );

      results.push({
        id: webhook.id,
        topic: webhook.topic,
        success: true,
      });
    } catch (error) {
      results.push({
        id: webhook.id,
        topic: webhook.topic,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    success:
      results.every(
        result => result.success
      ),

    deleted:
      results.filter(
        result => result.success
      ).length,

    failed:
      results.filter(
        result => !result.success
      ).length,

    results,
  };
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  REQUIRED_WEBHOOKS,
  WEBHOOK_ADDRESS,

  resolveShop,

  shopifyRequest,

  getExistingWebhooks,
  findExistingWebhook,

  createWebhook,
  registerWebhook,
  registerAllWebhooks,

  deleteWebhook,
  deleteAllWebhooks,
};
