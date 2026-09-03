/**
 * ============================================================================
 * Layboka AI - V1
 * V1 Configuration
 * ============================================================================
 *
 * File:
 * backend/src/v1/config/v1.config.js
 *
 * Purpose:
 * - Central V1 configuration
 * - 5-day free trial
 * - V1 feature flags
 * - AI limits
 * - Analytics configuration
 *
 * IMPORTANT:
 * - This file does NOT modify existing Layboka configuration.
 * - V1 is intentionally isolated from the existing application.
 *
 * ============================================================================
 */

'use strict';

// ============================================================================
// ENVIRONMENT
// ============================================================================

const NODE_ENV =
    process.env.NODE_ENV || 'development';


// ============================================================================
// TRIAL
// ============================================================================

const TRIAL_DAYS = 5;

const TRIAL_DURATION_MS =
    TRIAL_DAYS *
    24 *
    60 *
    60 *
    1000;


// ============================================================================
// V1 CONFIGURATION
// ============================================================================

const V1_CONFIG = Object.freeze({

    // ------------------------------------------------------------------------
    // Application
    // ------------------------------------------------------------------------

    VERSION: '1.0.0',

    ENVIRONMENT: NODE_ENV,

    APP_NAME: 'Layboka AI Sales Agent',


    // ------------------------------------------------------------------------
    // Trial
    // ------------------------------------------------------------------------

    TRIAL: Object.freeze({

        DAYS: TRIAL_DAYS,

        DURATION_MS:
            TRIAL_DURATION_MS,

        STATUS:
            'trial',

        EXPIRED_STATUS:
            'expired'

    }),

    SUBSCRIPTION: Object.freeze({
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  PAST_DUE: 'past_due',
}),

    // ------------------------------------------------------------------------
    // AI
    // ------------------------------------------------------------------------

    AI: Object.freeze({

        ENABLED: true,

        MODEL:
            process.env.OPENAI_MODEL ||
            'gpt-4o-mini',

        MAX_MESSAGE_LENGTH:
            4000,

        MAX_HISTORY_MESSAGES:
            20,

        TEMPERATURE:
            0.4

    }),


    // ------------------------------------------------------------------------
    // Sales Agent
    // ------------------------------------------------------------------------

    SALES: Object.freeze({

        ENABLED: true,

        PRODUCT_RECOMMENDATIONS:
            true,

        PRODUCT_COMPARISON:
            true,

        UPSELL:
            true,

        CROSS_SELL:
            true,

        OBJECTION_HANDLING:
            true,

        CART_ASSISTANCE:
            true,

        CHECKOUT_ASSISTANCE:
            true

    }),


    // ------------------------------------------------------------------------
    // Product Catalog
    // ------------------------------------------------------------------------

    PRODUCTS: Object.freeze({

        SYNC_ON_INSTALL:
            true,

        SYNC_ON_UPDATE:
            true,

        DEFAULT_LIMIT:
            20,

        MAX_LIMIT:
            50,

        ONLY_ACTIVE_PRODUCTS:
            true,

        ONLY_AVAILABLE_PRODUCTS:
            false

    }),


    // ------------------------------------------------------------------------
    // Analytics
    // ------------------------------------------------------------------------

    ANALYTICS: Object.freeze({

        ENABLED: true,

        TRACK_WIDGET_OPEN:
            true,

        TRACK_CONVERSATION:
            true,

        TRACK_PRODUCT_VIEW:
            true,

        TRACK_PRODUCT_CLICK:
            true,

        TRACK_ADD_TO_CART:
            true,

        TRACK_CHECKOUT:
            true,

        TRACK_PURCHASE:
            true

    }),


    // ------------------------------------------------------------------------
    // Widget
    // ------------------------------------------------------------------------

    WIDGET: Object.freeze({

        ENABLED: true,

        POSITION:
            'bottom-right',

        DEFAULT_TITLE:
            'Layboka AI Sales Agent',

        DEFAULT_GREETING:
            'Hi! 👋 How can I help you find the right product today?'

    }),


    // ------------------------------------------------------------------------
    // Billing
    // ------------------------------------------------------------------------

    BILLING: Object.freeze({

        ENABLED:
            process.env.V1_BILLING_ENABLED === 'true',

        CURRENCY:
            'USD'

    })

});


// ============================================================================
// HELPER: GET TRIAL END DATE
// ============================================================================

function calculateTrialEndDate(
    startDate = new Date()
) {

    const start =
        new Date(startDate);

    if (Number.isNaN(start.getTime())) {
        throw new Error(
            'Invalid trial start date.'
        );
    }

    return new Date(
        start.getTime() +
        V1_CONFIG.TRIAL.DURATION_MS
    );
}


// ============================================================================
// HELPER: GET TRIAL REMAINING TIME
// ============================================================================

function getTrialRemaining(
    trialEndsAt,
    now = new Date()
) {

    if (!trialEndsAt) {
        return {
            active: false,
            expired: true,
            milliseconds: 0,
            seconds: 0,
            minutes: 0,
            hours: 0,
            days: 0
        };
    }

    const end =
        new Date(trialEndsAt);

    const current =
        new Date(now);

    if (
        Number.isNaN(end.getTime()) ||
        Number.isNaN(current.getTime())
    ) {
        return {
            active: false,
            expired: true,
            milliseconds: 0,
            seconds: 0,
            minutes: 0,
            hours: 0,
            days: 0
        };
    }

    const milliseconds =
        Math.max(
            0,
            end.getTime() -
            current.getTime()
        );

    const seconds =
        Math.floor(
            milliseconds / 1000
        );

    const minutes =
        Math.floor(
            seconds / 60
        );

    const hours =
        Math.floor(
            minutes / 60
        );

    const days =
        Math.floor(
            hours / 24
        );

    return {

        active:
            milliseconds > 0,

        expired:
            milliseconds <= 0,

        milliseconds,

        seconds,

        minutes,

        hours,

        days

    };
}


// ============================================================================
// HELPER: CHECK TRIAL ACTIVE
// ============================================================================

function isTrialActive(
    trialEndsAt,
    now = new Date()
) {

    if (!trialEndsAt) {
        return false;
    }

    const end =
        new Date(trialEndsAt);

    const current =
        new Date(now);

    if (
        Number.isNaN(end.getTime()) ||
        Number.isNaN(current.getTime())
    ) {
        return false;
    }

    return end.getTime() > current.getTime();
}


// ============================================================================
// HELPER: CHECK V1 AI ACCESS
// ============================================================================

function canUseAI(shop) {

    if (!shop) {
        return false;
    }

    if (shop.deleted === true) {
        return false;
    }

    if (
        shop.subscriptionStatus ===
        'active'
    ) {
        return true;
    }

    if (
        shop.subscriptionStatus ===
        'trial'
    ) {

        return isTrialActive(
            shop.trialEndsAt
        );
    }

    return false;
}


// ============================================================================
// EXPORT
// ============================================================================

module.exports = {

    V1_CONFIG,

    calculateTrialEndDate,

    getTrialRemaining,

    isTrialActive,

    canUseAI

};
