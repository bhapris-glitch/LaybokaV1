'use strict';

/**
 * ============================================================================
 * Layboka AI — V1 Shopify Webhook Routes
 * ============================================================================
 *
 * File:
 * backend/src/v1/routes/v1.webhook.routes.js
 *
 * Purpose:
 * - Receive Shopify webhooks
 * - Preserve the raw request body
 * - Verify Shopify HMAC
 * - Forward verified payloads to V1 webhook controller
 *
 * IMPORTANT:
 * - Do NOT use express.json() before this route.
 * - HMAC must be calculated from the exact raw request body.
 *
 * ============================================================================
 */

const express = require('express');

const {
  handleWebhook
} = require('../controllers/v1.webhook.controller');

const {
  verifyShopifyWebhook
} = require('../../../middleware/verifyWebhook');

const router = express.Router();


// ============================================================================
// WEBHOOK ROUTE
// ============================================================================

/*
 * express.raw() is intentionally used here.
 *
 * Shopify signs the raw HTTP body.
 */
router.post(
  '/webhooks/shopify',

  express.raw({
    type: 'application/json',
    limit: '2mb'
  }),

  verifyShopifyWebhook,

  /*
   * Convert the verified raw body into JSON only AFTER
   * HMAC verification has completed.
   */
  (req, res, next) => {
    try {
      if (!Buffer.isBuffer(req.body)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook body.'
        });
      }

      req.body = JSON.parse(
        req.body.toString('utf8')
      );

      return next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Shopify webhook JSON.'
      });
    }
  },

  handleWebhook
);


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;
