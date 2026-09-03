/**
 * ============================================================================
 * Layboka AI — V1
 * Billing Controller
 * ============================================================================
 *
 * File:
 * backend/src/v1/controllers/v1.billing.controller.js
 *
 * Purpose:
 * - Return billing/subscription status
 * - Return Stripe checkout configuration
 * - Keep payment-provider logic server-side
 *
 * IMPORTANT:
 * - This controller does NOT trust browser-submitted subscription status.
 * - Subscription activation/cancellation must come from trusted Stripe
 *   server-side webhook handling.
 *
 * ============================================================================
 */

'use strict';

const {
  getBillingStatus,
  getCheckoutConfig,
} = require('../services/v1.billing.service');


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
    .replace(/\/+$/, '');
}


function getShop(req) {
  return normalizeShop(
    req.query?.shop ||
    req.body?.shop ||
    req.headers['x-shopify-shop-domain']
  );
}


// ============================================================================
// GET BILLING STATUS
// ============================================================================

async function getStatus(req, res) {
  try {
    const shop = getShop(req);

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required',
      });
    }

    const data =
      await getBillingStatus(shop);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      '[V1 Billing] Status error:',
      error.message
    );

    if (
      error.message === 'Shop not found'
    ) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to load billing status',
    });
  }
}


// ============================================================================
// GET CHECKOUT CONFIG
// ============================================================================

async function getCheckout(req, res) {
  try {
    const shop = getShop(req);

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required',
      });
    }

    const data =
      await getCheckoutConfig(shop);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      '[V1 Billing] Checkout config error:',
      error.message
    );

    if (
      error.message === 'Shop not found'
    ) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    if (
      error.message.includes(
        'price ID is not configured'
      )
    ) {
      return res.status(503).json({
        success: false,
        error:
          'Stripe billing is not configured',
      });
    }

    return res.status(500).json({
      success: false,
      error:
        'Failed to load checkout configuration',
    });
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  getStatus,
  getCheckout,
};
