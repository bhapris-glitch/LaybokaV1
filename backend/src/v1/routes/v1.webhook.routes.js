/**
 * ============================================================================
 * Layboka AI — V1
 * Shopify Webhook Routes
 * ============================================================================
 *
 * File:
 * backend/src/v1/routes/v1.webhook.routes.js
 *
 * Purpose:
 * - Receive Shopify webhooks
 * - Preserve raw request body
 * - Verify Shopify HMAC
 * - Parse JSON only after verification
 * - Pass verified payload to webhook controller
 *
 * IMPORTANT:
 * - This router is mounted by server.js BEFORE global express.json().
 * - Do not move the webhook mount below the global JSON parser.
 * - No external middleware folder is required for V1.
 *
 * ============================================================================
 */

'use strict';

const crypto = require('crypto');
const express = require('express');

const {
  handleWebhook,
} = require('../controllers/v1.webhook.controller');

const router = express.Router();


// ============================================================================
// SHOPIFY WEBHOOK HMAC VERIFICATION
// ============================================================================

function verifyShopifyWebhook(req, res, next) {
  try {
    const secret =
      process.env.SHOPIFY_API_SECRET ||
      process.env.SHOPIFY_API_SECRET_KEY;

    if (!secret) {
      console.error(
        '[V1 Webhook] Shopify API secret is not configured.'
      );

      return res.status(500).json({
        success: false,
        error: 'Shopify webhook verification is not configured.',
      });
    }

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Raw Shopify webhook body is required.',
      });
    }

    const receivedHmac =
      req.get('X-Shopify-Hmac-Sha256');

    if (!receivedHmac) {
      return res.status(401).json({
        success: false,
        error: 'Shopify webhook signature is missing.',
      });
    }

    const expectedHmac =
      crypto
        .createHmac('sha256', secret)
        .update(req.body)
        .digest('base64');

    const received =
      Buffer.from(receivedHmac, 'utf8');

    const expected =
      Buffer.from(expectedHmac, 'utf8');

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Shopify webhook signature.',
      });
    }

    return next();
  } catch (error) {
    console.error(
      '[V1 Webhook] HMAC verification error:',
      error.message
    );

    return res.status(401).json({
      success: false,
      error: 'Unable to verify Shopify webhook.',
    });
  }
}


// ============================================================================
// PARSE VERIFIED WEBHOOK
// ============================================================================

function parseVerifiedWebhook(req, res, next) {
  try {
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Webhook body is missing.',
      });
    }

    req.body = JSON.parse(
      req.body.toString('utf8')
    );

    return next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Shopify webhook JSON payload.',
    });
  }
}


// ============================================================================
// SHOPIFY WEBHOOK
// ============================================================================

router.post(
  '/webhooks/shopify',

  express.raw({
    type: 'application/json',
    limit: '2mb',
  }),

  verifyShopifyWebhook,

  parseVerifiedWebhook,

  handleWebhook
);


// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;
