/**
 * ============================================================================
 * Layboka AI — V1
 * Analytics Dashboard Routes
 * ============================================================================
 *
 * File:
 * backend/src/v1/routes/v1.analytics.dashboard.routes.js
 *
 * Purpose:
 * - Dashboard analytics
 * - Funnel analytics
 * - Product performance
 * - Daily performance
 *
 * NOTE:
 * V1 currently resolves the merchant using the shop parameter.
 * Replace this with authenticated merchant identity when the existing
 * dashboard authentication middleware is connected.
 *
 * ============================================================================
 */

'use strict';

const express = require('express');

const {
  getDashboardSummary,
  getFunnel,
  getProductPerformance,
  getDailyPerformance,
} = require('../services/v1.analytics.service');

const router = express.Router();


// ============================================================================
// HELPERS
// ============================================================================

function getShop(req) {
  return (
    req.query?.shop ||
    req.body?.shop ||
    req.headers['x-shopify-shop-domain'] ||
    null
  );
}


function getOptions(req) {
  return {
    startDate: req.query?.startDate,
    endDate: req.query?.endDate,
    days: req.query?.days,
  };
}


// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

router.get(
  '/analytics/dashboard',
  async (req, res) => {
    try {
      const shop = getShop(req);

      if (!shop) {
        return res.status(400).json({
          success: false,
          error: 'Shop domain is required',
        });
      }

      const data =
        await getDashboardSummary(
          shop,
          getOptions(req)
        );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(
        '[V1 Analytics Dashboard]',
        error.message
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to load analytics dashboard',
      });
    }
  }
);


// ============================================================================
// FUNNEL
// ============================================================================

router.get(
  '/analytics/funnel',
  async (req, res) => {
    try {
      const shop = getShop(req);

      if (!shop) {
        return res.status(400).json({
          success: false,
          error: 'Shop domain is required',
        });
      }

      const data =
        await getFunnel(
          shop,
          getOptions(req)
        );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(
        '[V1 Analytics Funnel]',
        error.message
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to load funnel analytics',
      });
    }
  }
);


// ============================================================================
// PRODUCT PERFORMANCE
// ============================================================================

router.get(
  '/analytics/products',
  async (req, res) => {
    try {
      const shop = getShop(req);

      if (!shop) {
        return res.status(400).json({
          success: false,
          error: 'Shop domain is required',
        });
      }

      const data =
        await getProductPerformance(
          shop,
          getOptions(req)
        );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(
        '[V1 Analytics Products]',
        error.message
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to load product analytics',
      });
    }
  }
);


// ============================================================================
// DAILY PERFORMANCE
// ============================================================================

router.get(
  '/analytics/daily',
  async (req, res) => {
    try {
      const shop = getShop(req);

      if (!shop) {
        return res.status(400).json({
          success: false,
          error: 'Shop domain is required',
        });
      }

      const data =
        await getDailyPerformance(
          shop,
          getOptions(req)
        );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(
        '[V1 Analytics Daily]',
        error.message
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to load daily analytics',
      });
    }
  }
);


// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;
