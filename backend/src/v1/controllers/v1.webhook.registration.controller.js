'use strict';

/**
 * ============================================================================
 * Layboka AI — V1 Webhook Registration Controller
 * ============================================================================
 *
 * File:
 * backend/src/v1/controllers/v1.webhook.registration.controller.js
 *
 * Purpose:
 * - Register Layboka Shopify webhooks
 * - Check current webhook registration
 * - Re-register missing webhooks
 *
 * IMPORTANT:
 * - These endpoints should be protected by merchant authentication before
 *   exposing them publicly.
 * - Installation itself can call registerAllWebhooks() directly.
 *
 * ============================================================================
 */

const V1Shop = require('../models/V1Shop');

const {
  REQUIRED_WEBHOOKS,
  WEBHOOK_ADDRESS,
  getExistingWebhooks,
  registerAllWebhooks
} = require('../services/v1.webhook.service');


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


async function resolveShop(req) {
  const shop = normalizeShop(
    req.query.shop ||
    req.body?.shop
  );

  if (!shop) {
    return {
      error: 'Shop domain is required.'
    };
  }

  const shopDocument =
    await V1Shop.findOne({
      shop
    }).select('+accessToken');

  if (!shopDocument) {
    return {
      error: 'V1 shop not found.'
    };
  }

  if (!shopDocument.accessToken) {
    return {
      error: 'Shopify access token is missing.'
    };
  }

  return {
    shop,
    shopDocument
  };
}


// ============================================================================
// WEBHOOK STATUS
// ============================================================================

/**
 * GET /v1/webhooks/status?shop=example.myshopify.com
 */
async function getWebhookStatus(req, res) {
  try {
    const resolved =
      await resolveShop(req);

    if (resolved.error) {
      return res.status(
        resolved.error === 'V1 shop not found.'
          ? 404
          : 400
      ).json({
        success: false,
        error: resolved.error
      });
    }

    const {
      shop,
      shopDocument
    } = resolved;

    const webhooks =
      await getExistingWebhooks(
        shop,
        shopDocument.accessToken
      );

    const laybokaWebhooks =
      webhooks.filter(
        (webhook) =>
          webhook.address === WEBHOOK_ADDRESS
      );

    const status = REQUIRED_WEBHOOKS.map(
      (topic) => {
        const webhook =
          laybokaWebhooks.find(
            (item) =>
              item.topic === topic
          );

        return {
          topic,
          registered: Boolean(webhook),
          webhookId:
            webhook?.id || null,
          address:
            webhook?.address ||
            WEBHOOK_ADDRESS
        };
      }
    );

    return res.status(200).json({
      success: true,

      data: {
        shop,

        webhookAddress:
          WEBHOOK_ADDRESS,

        required:
          REQUIRED_WEBHOOKS.length,

        registered:
          status.filter(
            (item) => item.registered
          ).length,

        missing:
          status.filter(
            (item) => !item.registered
          ).length,

        webhooks: status
      }
    });
  } catch (error) {
    console.error(
      '[V1 Webhook Status]',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to check Shopify webhooks.'
    });
  }
}


// ============================================================================
// REGISTER WEBHOOKS
// ============================================================================

/**
 * POST /v1/webhooks/register
 *
 * Body:
 * {
 *   "shop": "example.myshopify.com"
 * }
 */
async function registerWebhooks(req, res) {
  try {
    const resolved =
      await resolveShop(req);

    if (resolved.error) {
      return res.status(
        resolved.error === 'V1 shop not found.'
          ? 404
          : 400
      ).json({
        success: false,
        error: resolved.error
      });
    }

    const result =
      await registerAllWebhooks(
        resolved.shopDocument
      );

    if (!result.success) {
      return res.status(207).json({
        success: false,
        error:
          'Some Shopify webhooks could not be registered.',
        data: result
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error(
      '[V1 Webhook Registration]',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to register Shopify webhooks.'
    });
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  getWebhookStatus,
  registerWebhooks
};
