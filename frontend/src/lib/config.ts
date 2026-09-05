/**
 * ============================================================================
 * LaybokaV1 — V1
 * Frontend Configuration
 * ============================================================================
 *
 * File:
 * frontend/src/lib/config.ts
 *
 * Purpose:
 * - Central application configuration
 * - Backend API URL
 * - Frontend routes
 * - V1 API endpoints
 * - Shopify installation URL
 * - Brand configuration
 *
 * IMPORTANT:
 *
 * NEXT_PUBLIC_API_URL must be the REAL PUBLIC BACKEND URL.
 *
 * Example during development:
 *
 * NEXT_PUBLIC_API_URL=http://localhost:5000
 *
 * Example production:
 *
 * NEXT_PUBLIC_API_URL=https://api.laybokav1.com
 *
 * OR use the Railway-generated backend URL if you have not yet
 * connected a custom API domain.
 *
 * Do NOT use:
 *
 * https://Laybokav1/backend.com
 *
 * unless that is an actual domain you own and have configured.
 *
 * ============================================================================
 */

'use client';


// ============================================================================
// ENVIRONMENT
// ============================================================================

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';


// ============================================================================
// NORMALIZE API URL
// ============================================================================

function normalizeApiUrl(
  value: string
): string {

  return value
    .trim()
    .replace(/\/+$/, '');
}


export const API_URL =
  normalizeApiUrl(
    rawApiUrl
  );


// ============================================================================
// BRAND
// ============================================================================

export const BRAND = {

  name: 'LaybokaV1',

  logo: 'LaybokaV1',

  primary: '#FF4616',

  background: '#040501',

  tagline:
    'Turn Visitors Into Buyers',

  description:
    'AI Sales Agent for Shopify stores.',

} as const;


// ============================================================================
// TRIAL
// ============================================================================

export const TRIAL = {

  days: 5,

  label: '5-Day Free Trial',

} as const;


// ============================================================================
// FRONTEND ROUTES
// ============================================================================

export const ROUTES = {

  home:
    '/',

  pricing:
    '/pricing',

  login:
    '/login',

  register:
    '/register',

  dashboard:
    '/dashboard',

  install:
    '/install',

  success:
    '/install/success',

  documentation:
    '/documentation',

  contact:
    '/contact',

  privacy:
    '/privacy',

  terms:
    '/terms',

} as const;


// ============================================================================
// V1 API ROOT
// ============================================================================
//
// The V1 backend uses /v1.
//
// Example:
//
// https://api.laybokav1.com/v1
//
// ============================================================================

export const API_V1 =
  `${API_URL}/v1`;


// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {

  // --------------------------------------------------------------------------
  // Health
  // --------------------------------------------------------------------------

  health:
    `${API_URL}/health`,


  // --------------------------------------------------------------------------
  // V1 root
  // --------------------------------------------------------------------------

  v1:
    API_V1,


  // --------------------------------------------------------------------------
  // Shopify Installation
  // --------------------------------------------------------------------------
  //
  // GET /v1/install?shop=store.myshopify.com
  //
  // The browser should navigate directly to this endpoint.
  //

  install:
    `${API_V1}/install`,

  installCallback:
    `${API_V1}/install/callback`,

  installStatus:
    `${API_V1}/install/status`,


  // --------------------------------------------------------------------------
  // Chat
  // --------------------------------------------------------------------------

  chat:
    `${API_V1}/chat`,

  chatStatus:
    `${API_V1}/chat/status`,


  // --------------------------------------------------------------------------
  // Products
  // --------------------------------------------------------------------------

  products:
    `${API_V1}/products`,


  // --------------------------------------------------------------------------
  // Billing
  // --------------------------------------------------------------------------

  billing:
    `${API_V1}/billing`,

  billingStatus:
    `${API_V1}/billing/status`,

  billingPlans:
    `${API_V1}/billing/plans`,

  billingCheckout:
    `${API_V1}/billing/checkout`,

  billingSubscription:
    `${API_V1}/billing/subscription`,

  billingCancel:
    `${API_V1}/billing/cancel`,


  // --------------------------------------------------------------------------
  // Analytics
  // --------------------------------------------------------------------------

  analytics:
    `${API_V1}/analytics`,

  analyticsEvent:
    `${API_V1}/analytics/event`,

  analyticsEvents:
    `${API_V1}/analytics/events`,

  analyticsDashboard:
    `${API_V1}/analytics/dashboard`,

  analyticsFunnel:
    `${API_V1}/analytics/funnel`,

  analyticsProducts:
    `${API_V1}/analytics/products`,

  analyticsDaily:
    `${API_V1}/analytics/daily`,


  // --------------------------------------------------------------------------
  // Store
  // --------------------------------------------------------------------------

  store:
    `${API_V1}/store`,

} as const;


// ============================================================================
// SHOPIFY INSTALL URL
// ============================================================================

/**
 * Build the backend Shopify installation URL.
 *
 * IMPORTANT:
 *
 * Do not call Shopify directly from the browser.
 *
 * Browser
 *   ↓
 * Layboka backend /v1/install
 *   ↓
 * Shopify OAuth
 *
 * The backend owns Shopify credentials and OAuth state.
 */

export function getInstallApiUrl(
  shop: string
): string {

  const params =
    new URLSearchParams();

  params.set(
    'shop',
    shop
  );


  return (
    `${API_ENDPOINTS.install}?` +
    params.toString()
  );
}


// ============================================================================
// API URL BUILDER
// ============================================================================

/**
 * Safely build an API URL from an endpoint and optional path.
 *
 * Example:
 *
 * buildApiUrl(API_ENDPOINTS.products, '123')
 *
 * becomes:
 *
 * https://api.example.com/v1/products/123
 */

export function buildApiUrl(
  endpoint: string,
  path?: string
): string {

  const base =
    endpoint.replace(
      /\/+$/,
      ''
    );


  if (!path) {

    return base;
  }


  return (
    `${base}/` +
    encodeURIComponent(
      path
    )
  );
}


// ============================================================================
// API REQUEST CONFIG
// ============================================================================

export const API_CONFIG = {

  credentials:
    'include' as RequestCredentials,

  headers: {

    'Content-Type':
      'application/json',

    Accept:
      'application/json',

  },

} as const;


// ============================================================================
// APPLICATION CONFIG
// ============================================================================

export const APP_CONFIG = {

  name:
    BRAND.name,

  version:
    '1.0.0',

  environment:
    process.env.NODE_ENV ||
    'development',

  apiUrl:
    API_URL,

  apiVersion:
    'v1',

  trialDays:
    TRIAL.days,

  currency:
    'USD',

  supportedCurrencies:
    [
      'USD',
      'INR',
    ],

} as const;


// ============================================================================
// PRICING
// ============================================================================
//
// These are the V1 public prices.
// Keep pricing centralized here so the pricing page,
// checkout UI and future dashboard do not hard-code different values.
//
// ============================================================================

export const PLANS = {

  starter: {

    id:
      'starter',

    name:
      'Starter',

    description:
      'AI sales assistance for growing Shopify stores.',

    monthlyUSD:
      8,

    monthlyINR:
      699,

    features: [

      '24/7 AI Sales Agent',

      'Shopify product knowledge',

      'Product recommendations',

      'Upselling & cross-selling',

      'Basic sales analytics',

    ],

  },


  growth: {

    id:
      'growth',

    name:
      'Growth',

    description:
      'More automation and higher sales capacity.',

    monthlyUSD:
      25,

    monthlyINR:
      2199,

    features: [

      'Everything in Starter',

      'Higher conversation limits',

      'Cart recovery assistance',

      'Conversion analytics',

      'Advanced recommendations',

    ],

  },


  pro: {

    id:
      'pro',

    name:
      'Pro',

    description:
      'Advanced AI sales automation for scaling stores.',

    monthlyUSD:
      59,

    monthlyINR:
      5199,

    features: [

      'Everything in Growth',

      'Advanced sales insights',

      'Priority AI processing',

      'Higher usage limits',

      'Advanced sales automation',

    ],

  },


  enterprise: {

    id:
      'enterprise',

    name:
      'Enterprise',

    description:
      'Custom AI sales infrastructure for larger businesses.',

    monthlyUSD:
      null,

    monthlyINR:
      null,

    features: [

      'Everything in Pro',

      'Custom usage limits',

      'Custom integrations',

      'Dedicated support',

    ],

  },

} as const;


// ============================================================================
// TYPE HELPERS
// ============================================================================

export type PlanId =
  keyof typeof PLANS;


export type SupportedCurrency =
  APP_CONFIG['supportedCurrencies'][number];


// ============================================================================
// RUNTIME CONFIG CHECK
// ============================================================================

/**
 * Returns true when a production API URL has been configured.
 *
 * This is useful for showing a clear configuration error rather than
 * silently sending production users to localhost.
 */

export function isProductionApiConfigured():
  boolean {

  if (
    process.env.NODE_ENV !==
    'production'
  ) {

    return true;
  }


  return (
    Boolean(
      process.env.NEXT_PUBLIC_API_URL
    ) &&
    !API_URL.includes(
      'localhost'
    ) &&
    !API_URL.includes(
      '127.0.0.1'
    )
  );
}


// ============================================================================
// CONFIG VALIDATION
// ============================================================================

export function validateFrontendConfig():
  void {

  if (
    typeof window === 'undefined'
  ) {

    return;
  }


  if (
    process.env.NODE_ENV ===
    'production' &&
    !isProductionApiConfigured()
  ) {

    console.error(
      '[LaybokaV1] NEXT_PUBLIC_API_URL is not configured for production.'
    );

  }

}


// ============================================================================
// EXPORT
// ============================================================================

const config = {

  API_URL,

  API_V1,

  API_ENDPOINTS,

  API_CONFIG,

  APP_CONFIG,

  BRAND,

  TRIAL,

  PLANS,

  ROUTES,

  getInstallApiUrl,

  buildApiUrl,

  isProductionApiConfigured,

  validateFrontendConfig,

};


export default config;
