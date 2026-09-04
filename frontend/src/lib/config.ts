/**
 * ============================================================================
 * Layboka AI — V1
 * Frontend Configuration
 * ============================================================================
 *
 * File:
 * frontend/src/lib/config.ts
 *
 * Purpose:
 * - Centralize frontend configuration
 * - Keep API URLs in one place
 * - Define V1 trial settings
 * - Define V1 pricing
 * - Define API endpoints
 *
 * ============================================================================
 */

const normalizeUrl = (url: string): string => {
  return url.replace(/\/+$/, '');
};


// ============================================================================
// APPLICATION
// ============================================================================

export const APP_CONFIG = {
  name:
    process.env.NEXT_PUBLIC_APP_NAME ||
    'Layboka AI',

  version:
    process.env.NEXT_PUBLIC_APP_VERSION ||
    '1.0.0',

  url:
    normalizeUrl(
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://laybokav1.com'
    ),

  trialDays:
    Number(
      process.env.NEXT_PUBLIC_TRIAL_DAYS || '5'
    ),
} as const;


// ============================================================================
// BACKEND
// ============================================================================

export const API_CONFIG = {
  baseUrl:
    normalizeUrl(
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:5000'
    ),

  timeout:
    30000,
} as const;


// ============================================================================
// API BASE
// ============================================================================

export const API_BASE =
  `${API_CONFIG.baseUrl}/v1`;


// ============================================================================
// V1 API ENDPOINTS
// ============================================================================
//
// Keep endpoint definitions centralized.
// If the backend path changes, we update it here instead of searching
// throughout the entire frontend.
//

export const API_ENDPOINTS = {

  // --------------------------------------------------------------------------
  // INSTALL / SHOPIFY
  // --------------------------------------------------------------------------

  install:
    `${API_BASE}/install`,

  installCallback:
    `${API_BASE}/install/callback`,


  // --------------------------------------------------------------------------
  // CHAT
  // --------------------------------------------------------------------------

  chat:
    `${API_BASE}/chat`,

  chatStatus:
    `${API_BASE}/chat/status`,


  // --------------------------------------------------------------------------
  // ANALYTICS
  // --------------------------------------------------------------------------

  analyticsEvent:
    `${API_BASE}/analytics/event`,

  analyticsEvents:
    `${API_BASE}/analytics/events`,

  analyticsDashboard:
    `${API_BASE}/analytics/dashboard`,

  analyticsFunnel:
    `${API_BASE}/analytics/funnel`,

  analyticsProducts:
    `${API_BASE}/analytics/products`,

  analyticsDaily:
    `${API_BASE}/analytics/daily`,


  // --------------------------------------------------------------------------
  // BILLING
  // --------------------------------------------------------------------------

  billingStatus:
    `${API_BASE}/billing/status`,

  billingCheckout:
    `${API_BASE}/billing/checkout`,


  // --------------------------------------------------------------------------
  // WEBHOOKS
  // --------------------------------------------------------------------------

  webhookStatus:
    `${API_BASE}/webhooks/status`,

  webhookRegister:
    `${API_BASE}/webhooks/register`,


  // --------------------------------------------------------------------------
  // HEALTH
  // --------------------------------------------------------------------------

  health:
    `${API_BASE}/health`,
} as const;


// ============================================================================
// V1 PRICING
// ============================================================================
//
// Initial global-market V1 pricing.
//
// Trial:
//   5 days
//
// Starter:
//   $9/month
//   500 AI conversations/month
//
// Growth:
//   $29/month
//   2,000 AI conversations/month
//
// Pro:
//   $79/month
//   10,000 AI conversations/month
//
// Enterprise:
//   Custom
//
// These values are frontend display values.
// Actual payment enforcement must happen on the backend.
//

export const PRICING_PLANS = [
  {
    id:
      'starter',

    name:
      'Starter',

    price:
      9,

    currency:
      'USD',

    interval:
      'month',

    conversations:
      500,

    description:
      'For small Shopify stores getting started with AI sales.',

    features: [
      '24/7 AI Sales Agent',
      'Shopify product knowledge',
      'Product recommendations',
      'Customer Q&A',
      '500 AI conversations/month',
      'Basic sales analytics',
      'Email support',
    ],

    popular:
      false,
  },

  {
    id:
      'growth',

    name:
      'Growth',

    price:
      29,

    currency:
      'USD',

    interval:
      'month',

    conversations:
      2000,

    description:
      'For growing stores that want more conversations and sales.',

    features: [
      'Everything in Starter',
      '2,000 AI conversations/month',
      'Advanced product recommendations',
      'Upsell suggestions',
      'Cross-sell suggestions',
      'Conversion analytics',
      'Priority support',
    ],

    popular:
      true,
  },

  {
    id:
      'pro',

    name:
      'Pro',

    price:
      79,

    currency:
      'USD',

    interval:
      'month',

    conversations:
      10000,

    description:
      'For established stores with higher customer volume.',

    features: [
      'Everything in Growth',
      '10,000 AI conversations/month',
      'Advanced sales insights',
      'Advanced conversion analytics',
      'Higher usage limits',
      'Priority support',
      'Early V2 feature access',
    ],

    popular:
      false,
  },

  {
    id:
      'enterprise',

    name:
      'Enterprise',

    price:
      null,

    currency:
      'USD',

    interval:
      'custom',

    conversations:
      null,

    description:
      'For larger businesses with custom requirements.',

    features: [
      'Everything in Pro',
      'Custom AI conversation volume',
      'Custom implementation',
      'Custom support',
      'Custom billing',
    ],

    popular:
      false,
  },
] as const;


// ============================================================================
// TRIAL
// ============================================================================

export const TRIAL_CONFIG = {

  days:
    APP_CONFIG.trialDays,

  label:
    `${APP_CONFIG.trialDays}-Day Free Trial`,

  description:
    `Try Layboka AI free for ${APP_CONFIG.trialDays} days.`,

  requiresCard:
    false,

} as const;


// ============================================================================
// BRAND
// ============================================================================

export const BRAND_CONFIG = {

  primary:
    '#FF4616',

  background:
    '#040501',

  foreground:
    '#F7F7F5',

} as const;


// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  app:
    APP_CONFIG,

  api:
    API_CONFIG,

  endpoints:
    API_ENDPOINTS,

  pricing:
    PRICING_PLANS,

  trial:
    TRIAL_CONFIG,

  brand:
    BRAND_CONFIG,
};

