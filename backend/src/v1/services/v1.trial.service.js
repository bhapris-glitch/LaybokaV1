/**
 * ============================================================================
 * Layboka AI — V1
 * Trial Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/v1.trial.service.js
 *
 * Purpose:
 * - Start the 5-day V1 trial
 * - Check trial status
 * - Calculate remaining trial time
 * - Expire trials
 * - Determine whether AI access is allowed
 *
 * IMPORTANT:
 * Trial enforcement happens on the backend.
 * Never rely on frontend JavaScript for trial security.
 * ============================================================================
 */

'use strict';

const V1Shop = require('../models/V1Shop');

const {
  V1_CONFIG,
  calculateTrialEndDate,
  getTrialRemaining,
  isTrialActive,
  canUseAI,
} = require('../config/v1.config');


// ============================================================================
// START TRIAL
// ============================================================================

/**
 * Start the V1 five-day trial for a shop.
 *
 * A trial is only created if the shop does not already have one.
 *
 * This prevents repeated OAuth callbacks or API requests from
 * resetting the merchant's trial period.
 *
 * @param {Object|String} shopOrId
 * @returns {Promise<Object>}
 */
async function startTrial(shopOrId) {
  const shop = await resolveShop(shopOrId);

  if (!shop) {
    throw new Error('V1 shop not found');
  }

  // --------------------------------------------------------------------------
  // Do not reset an existing trial.
  // --------------------------------------------------------------------------

  if (shop.trialStartedAt && shop.trialEndsAt) {
    return shop;
  }


  // --------------------------------------------------------------------------
  // Create a new trial.
  // --------------------------------------------------------------------------

  const startedAt = new Date();
  const endsAt = calculateTrialEndDate(startedAt);


  shop.trialStartedAt = startedAt;
  shop.trialEndsAt = endsAt;

  shop.subscriptionStatus = V1_CONFIG.TRIAL.STATUS;
  shop.aiEnabled = true;

  shop.lastActiveAt = startedAt;

  await shop.save();

  return shop;
}


// ============================================================================
// GET TRIAL STATUS
// ============================================================================

/**
 * Get complete trial information for a shop.
 *
 * @param {Object|String} shopOrId
 * @returns {Promise<Object>}
 */
async function getTrialStatus(shopOrId) {
  const shop = await resolveShop(shopOrId);

  if (!shop) {
    throw new Error('V1 shop not found');
  }

  const now = new Date();

  // --------------------------------------------------------------------------
  // Paid merchant
  // --------------------------------------------------------------------------

  if (shop.subscriptionStatus === V1_CONFIG.SUBSCRIPTION.ACTIVE) {
    return {
      status: 'active',
      subscriptionStatus: 'active',

      trialStartedAt: shop.trialStartedAt,
      trialEndsAt: shop.trialEndsAt,

      remaining: {
        milliseconds: null,
        seconds: null,
        minutes: null,
        hours: null,
        days: null,
      },

      aiEnabled: shop.aiEnabled,
      canUseAI: true,
    };
  }


  // --------------------------------------------------------------------------
  // Trial
  // --------------------------------------------------------------------------

  const active = isTrialActive(shop.trialEndsAt, now);

  if (shop.subscriptionStatus === V1_CONFIG.TRIAL.STATUS && active) {
    const remaining = getTrialRemaining(
      shop.trialEndsAt,
      now
    );

    return {
      status: 'trial',
      subscriptionStatus: 'trial',

      trialStartedAt: shop.trialStartedAt,
      trialEndsAt: shop.trialEndsAt,

      remaining,

      aiEnabled: shop.aiEnabled,
      canUseAI: canUseAI(shop, now),
    };
  }


  // --------------------------------------------------------------------------
  // Expired
  // --------------------------------------------------------------------------

  if (
    shop.subscriptionStatus === V1_CONFIG.TRIAL.STATUS ||
    shop.subscriptionStatus === V1_CONFIG.TRIAL.EXPIRED_STATUS
  ) {
    await expireTrial(shop);

    return {
      status: 'expired',
      subscriptionStatus: V1_CONFIG.TRIAL.EXPIRED_STATUS,

      trialStartedAt: shop.trialStartedAt,
      trialEndsAt: shop.trialEndsAt,

      remaining: {
        milliseconds: 0,
        seconds: 0,
        minutes: 0,
        hours: 0,
        days: 0,
      },

      aiEnabled: false,
      canUseAI: false,
    };
  }


  // --------------------------------------------------------------------------
  // Other subscription states
  // --------------------------------------------------------------------------

  return {
    status: shop.subscriptionStatus,
    subscriptionStatus: shop.subscriptionStatus,

    trialStartedAt: shop.trialStartedAt,
    trialEndsAt: shop.trialEndsAt,

    remaining: {
      milliseconds: 0,
      seconds: 0,
      minutes: 0,
      hours: 0,
      days: 0,
    },

    aiEnabled: false,
    canUseAI: false,
  };
}


// ============================================================================
// CHECK ACCESS
// ============================================================================

/**
 * Check whether the merchant can use the AI Sales Agent.
 *
 * This should be called by the V1 chat endpoint before processing
 * an AI request.
 *
 * @param {Object|String} shopOrId
 * @returns {Promise<Object>}
 */
async function checkAIAccess(shopOrId) {
  const shop = await resolveShop(shopOrId);

  if (!shop) {
    return {
      allowed: false,
      reason: 'shop_not_found',
      message: 'Shop not found.',
    };
  }

  const now = new Date();


  // --------------------------------------------------------------------------
  // Paid subscription
  // --------------------------------------------------------------------------

  if (
    shop.subscriptionStatus ===
    V1_CONFIG.SUBSCRIPTION.ACTIVE
  ) {
    if (!shop.aiEnabled) {
      return {
        allowed: false,
        reason: 'ai_disabled',
        message: 'AI Sales Agent is currently disabled.',
      };
    }

    return {
      allowed: true,
      reason: 'active_subscription',

      subscriptionStatus: 'active',

      trialEndsAt: shop.trialEndsAt,

      remaining: {
        milliseconds: null,
        seconds: null,
        minutes: null,
        hours: null,
        days: null,
      },
    };
  }


  // --------------------------------------------------------------------------
  // Trial
  // --------------------------------------------------------------------------

  if (
    shop.subscriptionStatus ===
    V1_CONFIG.TRIAL.STATUS
  ) {
    const active = isTrialActive(
      shop.trialEndsAt,
      now
    );

    if (active && shop.aiEnabled) {
      const remaining = getTrialRemaining(
        shop.trialEndsAt,
        now
      );

      // Update activity without unnecessarily changing
      // trial dates/status.
      shop.lastActiveAt = now;
      await shop.save();

      return {
        allowed: true,
        reason: 'active_trial',

        subscriptionStatus: 'trial',

        trialEndsAt: shop.trialEndsAt,

        remaining,
      };
    }

    // Trial has expired.
    await expireTrial(shop);

    return {
      allowed: false,
      reason: 'trial_expired',

      subscriptionStatus:
        V1_CONFIG.TRIAL.EXPIRED_STATUS,

      trialEndsAt: shop.trialEndsAt,

      remaining: {
        milliseconds: 0,
        seconds: 0,
        minutes: 0,
        hours: 0,
        days: 0,
      },

      message:
        'Your 5-day free trial has ended. Please upgrade to continue using the AI Sales Agent.',
    };
  }


  // --------------------------------------------------------------------------
  // Expired
  // --------------------------------------------------------------------------

  if (
    shop.subscriptionStatus ===
    V1_CONFIG.TRIAL.EXPIRED_STATUS
  ) {
    return {
      allowed: false,
      reason: 'trial_expired',

      subscriptionStatus:
        V1_CONFIG.TRIAL.EXPIRED_STATUS,

      trialEndsAt: shop.trialEndsAt,

      remaining: {
        milliseconds: 0,
        seconds: 0,
        minutes: 0,
        hours: 0,
        days: 0,
      },

      message:
        'Your trial has ended. Please upgrade to continue.',
    };
  }


  // --------------------------------------------------------------------------
  // Cancelled / past due / unknown state
  // --------------------------------------------------------------------------

  return {
    allowed: false,

    reason:
      shop.subscriptionStatus ===
      V1_CONFIG.SUBSCRIPTION.CANCELLED
        ? 'subscription_cancelled'
        : shop.subscriptionStatus ===
          V1_CONFIG.SUBSCRIPTION.PAST_DUE
          ? 'subscription_past_due'
          : 'subscription_inactive',

    subscriptionStatus: shop.subscriptionStatus,

    trialEndsAt: shop.trialEndsAt,

    remaining: {
      milliseconds: 0,
      seconds: 0,
      minutes: 0,
      hours: 0,
      days: 0,
    },

    message:
      'AI Sales Agent is not currently available for this shop.',
  };
}


// ============================================================================
// EXPIRE TRIAL
// ============================================================================

/**
 * Mark a trial as expired and disable AI.
 *
 * @param {Object} shop
 * @returns {Promise<Object>}
 */
async function expireTrial(shop) {
  if (!shop) {
    throw new Error('Shop is required');
  }

  shop.subscriptionStatus =
    V1_CONFIG.TRIAL.EXPIRED_STATUS;

  shop.aiEnabled = false;

  await shop.save();

  return shop;
}


// ============================================================================
// EXPIRE ALL TRIALS
// ============================================================================

/**
 * Find and expire every V1 trial that has passed its end date.
 *
 * This is useful for a cron job.
 *
 * Example:
 *
 *   await expireAllTrials();
 *
 * It is also safe to call periodically because already-expired
 * shops are excluded from the query.
 *
 * @returns {Promise<Object>}
 */
async function expireAllTrials() {
  const now = new Date();

  const result = await V1Shop.updateMany(
    {
      subscriptionStatus:
        V1_CONFIG.TRIAL.STATUS,

      trialEndsAt: {
        $lte: now,
      },

      aiEnabled: true,
    },
    {
      $set: {
        subscriptionStatus:
          V1_CONFIG.TRIAL.EXPIRED_STATUS,

        aiEnabled: false,
      },
    }
  );

  return {
    matched: result.matchedCount ?? 0,
    modified: result.modifiedCount ?? 0,
  };
}


// ============================================================================
// REMAINING TIME
// ============================================================================

/**
 * Return remaining trial time.
 *
 * @param {Object|String} shopOrId
 * @returns {Promise<Object>}
 */
async function getRemainingTime(shopOrId) {
  const shop = await resolveShop(shopOrId);

  if (!shop) {
    throw new Error('V1 shop not found');
  }

  return getTrialRemaining(
    shop.trialEndsAt,
    new Date()
  );
}


// ============================================================================
// SHOP RESOLVER
// ============================================================================

/**
 * Accept either:
 *
 * 1. A V1Shop mongoose document
 * 2. A Mongo ObjectId
 * 3. A Shopify shop domain
 *
 * @param {Object|String} shopOrId
 * @returns {Promise<Object|null>}
 */
async function resolveShop(shopOrId) {
  if (!shopOrId) {
    return null;
  }


  // --------------------------------------------------------------------------
  // Already a mongoose document
  // --------------------------------------------------------------------------

  if (
    typeof shopOrId === 'object' &&
    shopOrId._id
  ) {
    return shopOrId;
  }


  // --------------------------------------------------------------------------
  // String lookup
  // --------------------------------------------------------------------------

  if (typeof shopOrId === 'string') {
    const value = shopOrId.trim().toLowerCase();

    // Try Mongo ObjectId first.
    if (mongooseObjectId(value)) {
      const byId = await V1Shop.findById(value);

      if (byId) {
        return byId;
      }
    }

    // Otherwise treat it as Shopify domain.
    return V1Shop.findOne({
      shop: value,
    });
  }

  return null;
}


// ============================================================================
// OBJECT ID CHECK
// ============================================================================

function mongooseObjectId(value) {
  return /^[a-f\d]{24}$/i.test(value);
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  startTrial,
  getTrialStatus,
  checkAIAccess,
  expireTrial,
  expireAllTrials,
  getRemainingTime,
};
