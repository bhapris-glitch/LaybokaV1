/**
 * ============================================================================
 * Layboka AI — V1
 * Billing Routes
 * ============================================================================
 *
 * File:
 * backend/src/v1/routes/v1.billing.routes.js
 *
 * Purpose:
 * - Billing status
 * - Stripe checkout configuration
 *
 * ============================================================================
 */

'use strict';

const express = require('express');

const {
  getStatus,
  getCheckout,
} = require('../controllers/v1.billing.controller');

const router = express.Router();


// ============================================================================
// BILLING STATUS
// ============================================================================

router.get(
  '/billing/status',
  getStatus
);


// ============================================================================
// STRIPE CHECKOUT CONFIG
// ============================================================================

router.get(
  '/billing/checkout',
  getCheckout
);


// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;
