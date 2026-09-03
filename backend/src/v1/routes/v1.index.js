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
 * - Centralize all normal V1 API routes
 * - Keep server.js clean
 * - Keep Shopify webhook raw-body handling separate
 *
 * IMPORTANT:
 * v1.webhook.routes.js is intentionally NOT mounted here.
 *
 * Shopify webhooks must be mounted by server.js BEFORE express.json().
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
// WEBHOOK REGISTRATION / STATUS
// ============================================================================
//
// These are normal JSON/API routes.
// The actual Shopify webhook receiver is mounted separately
// in server.js because it requires express.raw().
//

router.use(
  webhookRegistrationRoutes
);


// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;
