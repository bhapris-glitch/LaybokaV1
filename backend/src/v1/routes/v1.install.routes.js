/**
 * ============================================================================
 * Layboka AI - V1
 * Installation Routes
 * ============================================================================
 *
 * File:
 * backend/src/v1/routes/v1.install.routes.js
 *
 * Purpose:
 * - Shopify installation entry point
 * - Shopify OAuth callback
 * - Shopify installation status
 *
 * Endpoints:
 *
 * GET /v1/install
 * GET /v1/install/callback
 * GET /v1/install/status
 *
 * ============================================================================
 */

'use strict';

const express =
  require('express');


const {
  startInstallation,
  handleCallback,
  getInstallationStatus,
} =
  require(
    '../controllers/v1.install.controller'
  );


// ============================================================================
// ROUTER
// ============================================================================

const router =
  express.Router();


// ============================================================================
// SHOPIFY INSTALLATION
// ============================================================================

/**
 * Start Shopify installation.
 *
 * Example:
 *
 * GET /v1/install?shop=example.myshopify.com
 *
 */

router.get(
  '/install',
  startInstallation
);


// ============================================================================
// SHOPIFY OAUTH CALLBACK
// ============================================================================

/**
 * Shopify OAuth callback.
 *
 * Shopify redirects here after merchant authorization.
 *
 */

router.get(
  '/install/callback',
  handleCallback
);


// ============================================================================
// INSTALLATION STATUS
// ============================================================================

/**
 * Check whether a Shopify store is installed.
 *
 * Example:
 *
 * GET /v1/install/status?shop=example.myshopify.com
 *
 * Response:
 *
 * {
 *   "success": true,
 *   "installed": true,
 *   "installStatus": "installed",
 *   "shop": {
 *     "domain": "example.myshopify.com"
 *   }
 * }
 *
 */

router.get(
  '/install/status',
  getInstallationStatus
);


// ============================================================================
// EXPORT
// ============================================================================

module.exports =
  router;
