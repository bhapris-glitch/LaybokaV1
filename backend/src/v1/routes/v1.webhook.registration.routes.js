'use strict';

/**
 * ============================================================================
 * Layboka AI — V1 Webhook Registration Routes
 * ============================================================================
 *
 * File:
 * backend/src/v1/routes/v1.webhook.registration.routes.js
 *
 * Purpose:
 * - Check Shopify webhook registration status
 * - Register missing Shopify webhooks
 *
 * IMPORTANT:
 * - Protect these routes with merchant authentication before production.
 * - Do not expose webhook registration publicly using only a shop parameter.
 *
 * ============================================================================
 */

const express = require('express');

const {
  getWebhookStatus,
  registerWebhooks
} = require('../controllers/v1.webhook.registration.controller');

const router = express.Router();


// ============================================================================
// WEBHOOK STATUS
// ============================================================================

router.get(
  '/webhooks/status',
  getWebhookStatus
);


// ============================================================================
// REGISTER WEBHOOKS
// ============================================================================

router.post(
  '/webhooks/register',
  registerWebhooks
);


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;
