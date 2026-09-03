/**
 * ============================================================================
 * Layboka AI — V1
 * Billing Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/v1.billing.service.js
 *
 * Purpose:
 * - Provide V1 billing/subscription state
 * - Keep billing logic isolated from controllers
 * - Support Stripe USD subscriptions
 * - Prepare for trial-to-paid transition
 *
 * V1 billing is intentionally small.
 * Stripe Checkout/subscription creation can be connected to the existing
 * Stripe implementation without changing the V1 trial system.
 *
 * ============================================================================
 */

'use strict';

const V1Shop = require('../models/V1Shop');
const { V1_CONFIG } = require('../config/v1.config');


// ============================================================================
// CONSTANTS
// ============================================================================

const STRIPE_CURRENCY =
  V1_CONFIG.BILLING?.CURRENCY || 'USD';

const BILLING_ENABLED =
  V1_CONFIG.BILLING?.ENABLED === true;


// ============================================================================
// HELPERS
// ============================================================================

function normalizeShop(shop) {
  if (!shop || typeof shop !== 'string') {
    throw new Error('Shop domain is required');
  }

  return shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
}


async function resolveShop(shopOrId) {
  if (!shopOrId) {
    return null;
  }

  if (
    typeof shopOrId === 'object' &&
    shopOrId._id
  ) {
    return shopOrId;
  }

  const value = String(shopOrId).trim();

  if (!value) {
    return null;
  }

  if (/^[a-f\d]{24}$/i.test(value)) {
    return V1Shop.findById(value);
  }

  return V1Shop.findOne({
    shop: normalizeShop(value),
  });
}


// ============================================================================
// BILLING CONFIG
// ============================================================================

function getBillingConfig() {
  return {
    enabled: BILLING_ENABLED,
    currency: STRIPE_CURRENCY,

    provider: 'stripe',

    // Price IDs are intentionally read from environment variables.
    // Never hard-code Stripe price IDs in source code.
    priceId:
      process.env.STRIPE_V1_PRICE_ID ||
      process.env.STRIPE_PRICE_ID ||
      null,

    publishableKey:
      process.env.STRIPE_PUBLISHABLE_KEY ||
      process.env.STRIPE_PUBLIC_KEY ||
      null,
  };
}


// ============================================================================
// SUBSCRIPTION STATUS
// ============================================================================

async function getBillingStatus(shopOrId) {
  const shop = await resolveShop(shopOrId);

  if (!shop) {
    throw new Error('Shop not found');
  }

  const now = new Date();

  let trialActive = false;

  if (
    shop.trialEndsAt &&
    shop.trialEndsAt > now &&
    shop.subscriptionStatus ===
      V1_CONFIG.SUBSCRIPTION.TRIAL
  ) {
    trialActive = true;
  }

  const subscriptionActive =
    shop.subscriptionStatus ===
    V1_CONFIG.SUBSCRIPTION.ACTIVE;

  const expired =
    shop.subscriptionStatus ===
    V1_CONFIG.SUBSCRIPTION.EXPIRED;

  const cancelled =
    shop.subscriptionStatus ===
    V1_CONFIG.SUBSCRIPTION.CANCELLED;

  const pastDue =
    shop.subscriptionStatus ===
    V1_CONFIG.SUBSCRIPTION.PAST_DUE;

  let trialRemainingMs = 0;

  if (shop.trialEndsAt) {
    trialRemainingMs = Math.max(
      0,
      shop.trialEndsAt.getTime() -
        now.getTime()
    );
  }

  return {
    shop: shop.shop,

    status: shop.subscriptionStatus,

    aiEnabled: shop.aiEnabled === true,

    trial: {
      active: trialActive,
      startedAt: shop.trialStartedAt || null,
      endsAt: shop.trialEndsAt || null,
      remainingMs: trialRemainingMs,
      remainingDays:
        trialRemainingMs > 0
          ? Math.ceil(
              trialRemainingMs /
                (24 * 60 * 60 * 1000)
            )
          : 0,
    },

    subscription: {
      active: subscriptionActive,
      cancelled,
      pastDue,
    },

    expired,

    billing: getBillingConfig(),
  };
}


// ============================================================================
// ACTIVATE SUBSCRIPTION
// ============================================================================

/**
 * Activate a paid subscription after Stripe confirms it.
 *
 * IMPORTANT:
 * This function should only be called by trusted server-side
 * Stripe webhook/payment logic.
 */
async function activateSubscription(
  shopOrId,
  subscriptionData = {}
) {
  const shop = await resolveShop(shopOrId);

  if (!shop) {
    throw new Error('Shop not found');
  }

  const update = {
    subscriptionStatus:
      V1_CONFIG.SUBSCRIPTION.ACTIVE,

    aiEnabled: true,
  };

  if (subscriptionData.customerId) {
    update.stripeCustomerId =
      String(subscriptionData.customerId);
  }

  if (subscriptionData.subscriptionId) {
    update.stripeSubscriptionId =
      String(subscriptionData.subscriptionId);
  }

  if (subscriptionData.priceId) {
    update.stripePriceId =
      String(subscriptionData.priceId);
  }

  if (subscriptionData.currentPeriodEnd) {
    update.subscriptionCurrentPeriodEnd =
      new Date(
        subscriptionData.currentPeriodEnd
      );
  }

  const updated =
    await V1Shop.findByIdAndUpdate(
      shop._id,
      {
        $set: update,
      },
      {
        new: true,
      }
    );

  return updated;
}


// ============================================================================
// CANCEL SUBSCRIPTION
// ============================================================================

/**
 * Mark subscription as cancelled.
 *
 * The caller can decide whether cancellation takes effect immediately
 * or at the end of the current billing period.
 */
async function cancelSubscription(
  shopOrId,
  options = {}
) {
  const shop = await resolveShop(shopOrId);

  if (!shop) {
    throw new Error('Shop not found');
  }

  const immediate =
    options.immediate === true;

  const update = {
    subscriptionStatus:
      V1_CONFIG.SUBSCRIPTION.CANCELLED,
  };

  if (immediate) {
    update.aiEnabled = false;
  }

  if (options.currentPeriodEnd) {
    update.subscriptionCurrentPeriodEnd =
      new Date(
        options.currentPeriodEnd
      );
  }

  return V1Shop.findByIdAndUpdate(
    shop._id,
    {
      $set: update,
    },
    {
      new: true,
    }
  );
}


// ============================================================================
// MARK PAST DUE
// ============================================================================

async function markPastDue(shopOrId) {
  const shop = await resolveShop(shopOrId);

  if (!shop) {
    throw new Error('Shop not found');
  }

  return V1Shop.findByIdAndUpdate(
    shop._id,
    {
      $set: {
        subscriptionStatus:
          V1_CONFIG.SUBSCRIPTION.PAST_DUE,

        aiEnabled: false,
      },
    },
    {
      new: true,
    }
  );
}


// ============================================================================
// CHECKOUT CONFIG
// ============================================================================

/**
 * Return the information required by the controller to start
 * an existing Stripe Checkout flow.
 *
 * The actual Stripe SDK call remains outside this service so V1
 * can reuse the project's existing Stripe implementation.
 */
async function getCheckoutConfig(shopOrId) {
  const shop = await resolveShop(shopOrId);

  if (!shop) {
    throw new Error('Shop not found');
  }

  const billing = getBillingConfig();

  if (!billing.enabled) {
    return {
      enabled: false,
      shop: shop.shop,
      currency: billing.currency,
      provider: billing.provider,
      priceId: billing.priceId,
    };
  }

  if (!billing.priceId) {
    throw new Error(
      'Stripe V1 price ID is not configured'
    );
  }

  return {
    enabled: true,

    shop: shop.shop,

    currency: billing.currency,

    provider: billing.provider,

    priceId: billing.priceId,
  };
}


// ============================================================================
// WEBHOOK STATUS HANDLERS
// ============================================================================

async function handleStripeSubscriptionActive(
  shopOrId,
  data = {}
) {
  return activateSubscription(
    shopOrId,
    data
  );
}


async function handleStripeSubscriptionCancelled(
  shopOrId,
  data = {}
) {
  return cancelSubscription(
    shopOrId,
    {
      immediate:
        data.immediate === true,

      currentPeriodEnd:
        data.currentPeriodEnd,
    }
  );
}


async function handleStripePaymentFailed(
  shopOrId
) {
  return markPastDue(shopOrId);
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  BILLING_ENABLED,
  STRIPE_CURRENCY,

  normalizeShop,
  resolveShop,

  getBillingConfig,
  getBillingStatus,
  getCheckoutConfig,

  activateSubscription,
  cancelSubscription,
  markPastDue,

  handleStripeSubscriptionActive,
  handleStripeSubscriptionCancelled,
  handleStripePaymentFailed,
};
