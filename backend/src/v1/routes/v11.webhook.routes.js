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
 * This route must be mounted BEFORE global express.json().
 *
 * ============================================================================
 */

'use strict';

const express = require('express');

const {
  handleWebhook,
} = require('../controllers/v1.webhook.controller');

const {
  verifyShopifyWebhook,
} = require('../../../middleware/verifyWebhook');

const router =
  express.Router();


// ============================================================================
// SHOPIFY WEBHOOK
// ============================================================================

router.post(
  '/webhooks/shopify',

  /*
   * Shopify signs the exact raw request body.
   * Therefore JSON parsing must happen AFTER
   * HMAC verification.
   */
  express.raw({
    type: 'application/json',
    limit: '2mb',
  }),

  /*
   * Existing project middleware.
   *
   * This middleware must:
   * 1. Read req.rawBody / req.body
   * 2. Validate X-Shopify-Hmac-Sha256
   * 3. Reject invalid requests
   */
  verifyShopifyWebhook,

  /*
   * Convert verified raw body into an object.
   */
  (req, res, next) => {
    try {
      if (!req.body) {
        return res.status(400).json({
          success: false,
          error:
            'Webhook body is missing',
        });
      }

      if (
        Buffer.isBuffer(req.body)
      ) {
        req.body =
          JSON.parse(
            req.body.toString('utf8')
          );
      }

      return next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid webhook JSON payload',
      });
    }
  },

  handleWebhook
);


// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;
