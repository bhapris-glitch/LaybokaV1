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
 * - Register the complete V1 API surface
 *
 * IMPORTANT:
 * Shopify webhook route uses express.raw().
 * server.js must mount v1.webhook.routes.js BEFORE express.json().
 *
 * ============================================================================
 */

'use strict';

const express = require('express');

const router = express.Router();


// ============================================================================
// ROUTES
// ============================================================================

const installRoutes =
  require('./v1.install.routes');

const chatRoutes =
  require('./v1.chat.routes');

const analyticsRoutes =
  require('./v1.analytics.routes');

const analyticsDashboardRoutes =
  require('./v1.analytics.dashboard.routes');

const billingRoutes =
  require('./v1.billing.routes');

const webhookRoutes =
  require('./v1.webhook.routes');

const webhookRegistrationRoutes =
  require('./v1.webhook.registration.routes');


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
// BILLING
// ============================================================================

router.use(
  billingRoutes
);


// ============================================================================
// SHOPIFY WEBHOOKS
// ============================================================================
//
// NOTE:
//
// The actual Shopify webhook endpoint requires raw-body processing.
//
// server.js should mount v1.webhook.routes.js BEFORE express.json().
//
// The registration/status routes do not require raw-body handling.
//

router.use(
  webhookRoutes
);


// ============================================================================
// WEBHOOK REGISTRATION / STATUS
// ============================================================================

router.use(
  webhookRegistrationRoutes
);


// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;
