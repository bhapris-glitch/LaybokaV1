/**
 * ============================================================================
 * Layboka AI - V1
 * Chat Controller
 * ============================================================================
 *
 * File:
 * backend/src/v1/controllers/v1.chat.controller.js
 *
 * Purpose:
 * - Receive shopper chat messages
 * - Validate V1 shop
 * - Enforce 5-day trial server-side
 * - Call V1 AI service
 * - Return AI sales response
 * - Update shop activity
 *
 * IMPORTANT:
 * - Trial enforcement happens on the backend.
 * - Frontend/widget cannot bypass trial expiration.
 * - OpenAI is never called when AI access is denied.
 * ============================================================================
 */

'use strict';

const V1Shop = require('../models/V1Shop');

const {
  checkAIAccess
} = require('../services/v1.trial.service');

const {
  generateSalesResponse
} = require('../services/v1.ai.service');


// ============================================================================
// CHAT
// ============================================================================

/**
 * POST /v1/chat
 *
 * Body:
 * {
 *   "shop": "example.myshopify.com",
 *   "message": "I need a black shirt",
 *   "conversation": [],
 *   "selectedProductId": null
 * }
 */
async function chat(req, res) {
  try {

    // ------------------------------------------------------------------------
    // Extract request
    // ------------------------------------------------------------------------

    const {
      shop: rawShop,
      message,
      conversation = [],
      selectedProductId = null
    } = req.body || {};

    const shop =
      normalizeShopDomain(rawShop);

    // ------------------------------------------------------------------------
    // Validate shop
    // ------------------------------------------------------------------------

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required'
      });
    }

    // ------------------------------------------------------------------------
    // Validate message
    // ------------------------------------------------------------------------

    if (
      typeof message !== 'string' ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // ------------------------------------------------------------------------
    // Find V1 shop
    // ------------------------------------------------------------------------

    const v1Shop =
      await V1Shop.findOne({
        shop
      });

    if (!v1Shop) {
      return res.status(404).json({
        success: false,
        error: 'V1 shop installation not found',
        code: 'SHOP_NOT_INSTALLED'
      });
    }

    // ------------------------------------------------------------------------
    // Check server-side AI access
    // ------------------------------------------------------------------------

    const access =
      await checkAIAccess(v1Shop);

    if (!access.allowed) {

      return res.status(403).json({
        success: false,

        error:
          access.message ||
          'AI access is unavailable',

        code:
          getAccessErrorCode(
            access.reason
          ),

        subscriptionStatus:
          access.subscriptionStatus,

        trialEndsAt:
          access.trialEndsAt,

        remaining:
          access.remaining
      });
    }

    // ------------------------------------------------------------------------
    // Check whether merchant manually disabled AI
    // ------------------------------------------------------------------------

    if (v1Shop.aiEnabled === false) {

      return res.status(403).json({
        success: false,
        error: 'AI Sales Executive is currently disabled',
        code: 'AI_DISABLED'
      });
    }

    // ------------------------------------------------------------------------
    // Normalize conversation
    // ------------------------------------------------------------------------

    const safeConversation =
      normalizeConversation(
        conversation
      );

    // ------------------------------------------------------------------------
    // Generate AI response
    // ------------------------------------------------------------------------

    const aiResponse =
      await generateSalesResponse({
        shop: v1Shop,
        message: message.trim(),
        conversation: safeConversation,
        selectedProductId
      });

    // ------------------------------------------------------------------------
    // Update activity
    // ------------------------------------------------------------------------

    v1Shop.lastActiveAt =
      new Date();

    await v1Shop.save();

    // ------------------------------------------------------------------------
    // Return response
    // ------------------------------------------------------------------------

    return res.status(200).json({
      success: true,

      data: {
        message:
          aiResponse.message,

        intent:
          aiResponse.intent,

        buyingStage:
          aiResponse.buyingStage,

        salesGoal:
          aiResponse.salesGoal,

        products:
          aiResponse.products || [],

        upsells:
          aiResponse.upsells || [],

        crossSells:
          aiResponse.crossSells || [],

        checkout:
          aiResponse.checkout || null
      }
    });

  } catch (error) {

    console.error(
      '[V1 CHAT] Error:',
      error
    );

    return handleChatError(
      res,
      error
    );
  }
}


// ============================================================================
// GET AI ACCESS STATUS
// ============================================================================

/**
 * GET /v1/chat/status?shop=example.myshopify.com
 *
 * Used by the widget/dashboard to determine whether AI can be used.
 */
async function getChatStatus(req, res) {
  try {

    const shop =
      normalizeShopDomain(
        req.query.shop
      );

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required'
      });
    }

    const v1Shop =
      await V1Shop.findOne({
        shop
      });

    if (!v1Shop) {
      return res.status(404).json({
        success: false,
        error: 'V1 shop installation not found',
        code: 'SHOP_NOT_INSTALLED'
      });
    }

    const access =
      await checkAIAccess(v1Shop);

    return res.status(200).json({
      success: true,

      data: {
        allowed:
          access.allowed,

        reason:
          access.reason,

        code:
          getAccessErrorCode(
            access.reason
          ),

        subscriptionStatus:
          access.subscriptionStatus,

        trialEndsAt:
          access.trialEndsAt,

        remaining:
          access.remaining,

        message:
          access.message
      }
    });

  } catch (error) {

    console.error(
      '[V1 CHAT STATUS] Error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Unable to check AI status'
    });
  }
}


// ============================================================================
// ACCESS ERROR CODE
// ============================================================================

function getAccessErrorCode(reason) {

  switch (reason) {

    case 'trial_expired':
      return 'TRIAL_EXPIRED';

    case 'subscription_cancelled':
      return 'SUBSCRIPTION_CANCELLED';

    case 'subscription_past_due':
      return 'SUBSCRIPTION_PAST_DUE';

    case 'ai_disabled':
      return 'AI_DISABLED';

    default:
      return 'AI_ACCESS_DENIED';
  }
}


// ============================================================================
// CONVERSATION SANITIZATION
// ============================================================================

function normalizeConversation(
  conversation
) {
  if (!Array.isArray(conversation)) {
    return [];
  }

  return conversation
    .slice(-20)
    .filter(item => {
      if (!item) {
        return false;
      }

      if (
        item.role !== 'user' &&
        item.role !== 'assistant'
      ) {
        return false;
      }

      return (
        typeof item.content === 'string' &&
        item.content.trim().length > 0
      );
    })
    .map(item => ({
      role:
        item.role,

      content:
        item.content
          .trim()
          .slice(0, 4000)
    }));
}


// ============================================================================
// SHOP DOMAIN NORMALIZATION
// ============================================================================

function normalizeShopDomain(
  shop
) {
  if (
    typeof shop !== 'string'
  ) {
    return '';
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


// ============================================================================
// ERROR HANDLER
// ============================================================================

function handleChatError(
  res,
  error
) {

  // --------------------------------------------------------------------------
  // Validation errors
  // --------------------------------------------------------------------------

  if (
    error?.message ===
    'Message cannot be empty'
  ) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'INVALID_MESSAGE'
    });
  }

  if (
    error?.message?.includes(
      'Message exceeds maximum length'
    )
  ) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'MESSAGE_TOO_LONG'
    });
  }

  // --------------------------------------------------------------------------
  // OpenAI configuration
  // --------------------------------------------------------------------------

  if (
    error?.message ===
    'OPENAI_API_KEY is not configured'
  ) {
    return res.status(503).json({
      success: false,
      error: 'AI service is not configured',
      code: 'AI_NOT_CONFIGURED'
    });
  }

  // --------------------------------------------------------------------------
  // OpenAI / external service errors
  // --------------------------------------------------------------------------

  if (
    error?.status === 429 ||
    error?.code === 'rate_limit_exceeded'
  ) {
    return res.status(429).json({
      success: false,
      error:
        'AI service is temporarily busy. Please try again.',
      code: 'AI_RATE_LIMITED'
    });
  }

  // --------------------------------------------------------------------------
  // Generic failure
  // --------------------------------------------------------------------------

  return res.status(500).json({
    success: false,
    error:
      'Unable to process your message right now.',
    code: 'CHAT_ERROR'
  });
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  chat,
  getChatStatus,
  normalizeConversation,
  normalizeShopDomain
};
