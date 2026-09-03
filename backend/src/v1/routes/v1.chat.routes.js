/**
 * ============================================================================
 * Layboka AI - V1
 * Chat Routes
 * ============================================================================
 *
 * File:
 * backend/src/v1/routes/v1.chat.routes.js
 *
 * Purpose:
 * - Shopper AI chat endpoint
 * - AI access/trial status endpoint
 *
 * Endpoints:
 * POST /v1/chat
 * GET  /v1/chat/status
 * ============================================================================
 */

'use strict';

const express = require('express');

const {
  chat,
  getChatStatus
} = require('../controllers/v1.chat.controller');


// ============================================================================
// ROUTER
// ============================================================================

const router = express.Router();


// ============================================================================
// CHAT
// ============================================================================

/**
 * POST /v1/chat
 *
 * Shopper sends a message to Layboka AI.
 */
router.post(
  '/chat',
  chat
);


// ============================================================================
// CHAT STATUS
// ============================================================================

/**
 * GET /v1/chat/status?shop=example.myshopify.com
 *
 * Checks whether the merchant's AI is currently available.
 */
router.get(
  '/chat/status',
  getChatStatus
);


// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;
