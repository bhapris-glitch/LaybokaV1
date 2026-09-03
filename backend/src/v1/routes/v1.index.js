/**
 * ============================================================================
 * Layboka AI — V1
 * Route Index
 * ============================================================================
 *
 * File:
 * backend/src/v1/routes/v1.index.js
 *
 * Purpose:
 * - Centralize all V1 routes
 * - Keep server.js clean
 * - Provide one `/v1` route mount
 *
 * ============================================================================
 */

'use strict';

const express = require('express');

const installRoutes =
  require('./v1.install.routes');

const chatRoutes =
  require('./v1.chat.routes');

const analyticsRoutes =
  require('./v1.analytics.routes');

const analyticsDashboardRoutes =
  require('./v1.analytics.dashboard.routes');

const webhookRoutes =
  require('./v1.webhook.routes');

const billingRoutes =
  require('./v1.billing.routes');

const router = express.Router();


// ============================================================================
// INSTALL / SHOPIFY OAUTH
// ============================================================================

router.use(
  installRoutes
);


// ============================================================================
// AI CHAT
// ============================================================================

router.use(
  chatRoutes
);


// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

router.use(
  analyticsRoutes
);


// ============================================================================
// ANALYTICS DASHBOARD
// ============================================================================

router.use(
  analyticsDashboardRoutes
);


// ============================================================================
// SHOPIFY WEBHOOKS
// ============================================================================

router.use(
  webhookRoutes
);


// ============================================================================
// BILLING
// ============================================================================

router.use(
  billingRoutes
);


// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;
