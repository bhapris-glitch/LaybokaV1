'use strict';

/**
 * ============================================================================
 * Layboka AI — V1 Analytics Dashboard Routes
 * ============================================================================
 *
 * File:
 * backend/src/v1/routes/v1.analytics.dashboard.routes.js
 *
 * Purpose:
 * - Expose merchant dashboard analytics
 * - Return sales funnel
 * - Return dashboard summary
 * - Return product performance
 * - Return daily performance
 *
 * ============================================================================
 */

const express = require('express');

const {
  getSalesFunnel,
  getProductPerformance,
  getDailyPerformance,
  getDashboardSummary
} = require('../services/v1.analytics.service');

const router = express.Router();


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


function parseDate(value) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}


function getOptions(req, res) {
  const startDate = parseDate(req.query.startDate);
  const endDate = parseDate(req.query.endDate);

  if (startDate === null || endDate === null) {
    res.status(400).json({
      success: false,
      error: 'Invalid startDate or endDate.'
    });

    return null;
  }

  return {
    startDate,
    endDate
  };
}


// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

/**
 * GET /v1/analytics/dashboard
 *
 * Example:
 * /v1/analytics/dashboard?shop=example.myshopify.com
 *
 * Optional:
 * ?startDate=2026-08-01
 * &endDate=2026-08-31
 */
async function dashboard(req, res) {
  try {
    const shop = normalizeShop(req.query.shop);

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required.'
      });
    }

    const options = getOptions(req, res);

    if (!options) {
      return;
    }

    const summary = await getDashboardSummary(
      shop,
      options
    );

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error(
      '[V1 Analytics Dashboard]',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to load dashboard analytics.'
    });
  }
}


// ============================================================================
// SALES FUNNEL
// ============================================================================

/**
 * GET /v1/analytics/funnel
 */
async function funnel(req, res) {
  try {
    const shop = normalizeShop(req.query.shop);

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required.'
      });
    }

    const options = getOptions(req, res);

    if (!options) {
      return;
    }

    const data = await getSalesFunnel(
      shop,
      options
    );

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error(
      '[V1 Analytics Funnel]',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to load sales funnel.'
    });
  }
}


// ============================================================================
// PRODUCT PERFORMANCE
// ============================================================================

/**
 * GET /v1/analytics/products
 */
async function products(req, res) {
  try {
    const shop = normalizeShop(req.query.shop);

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required.'
      });
    }

    const options = getOptions(req, res);

    if (!options) {
      return;
    }

    const data = await getProductPerformance(
      shop,
      options
    );

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error(
      '[V1 Analytics Products]',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to load product analytics.'
    });
  }
}


// ============================================================================
// DAILY PERFORMANCE
// ============================================================================

/**
 * GET /v1/analytics/daily
 */
async function daily(req, res) {
  try {
    const shop = normalizeShop(req.query.shop);

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required.'
      });
    }

    const options = getOptions(req, res);

    if (!options) {
      return;
    }

    const data = await getDailyPerformance(
      shop,
      options
    );

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error(
      '[V1 Analytics Daily]',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to load daily analytics.'
    });
  }
}


// ============================================================================
// ROUTES
// ============================================================================

router.get(
  '/analytics/dashboard',
  dashboard
);

router.get(
  '/analytics/funnel',
  funnel
);

router.get(
  '/analytics/products',
  products
);

router.get(
  '/analytics/daily',
  daily
);


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;
