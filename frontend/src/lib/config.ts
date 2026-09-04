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
 * - Define the V1 backend URL
 * - Define API endpoints
 * - Keep API paths consistent across services
 *
 * IMPORTANT:
 * Only PUBLIC configuration belongs here.
 *
 * NEVER put:
 * - OpenAI API keys
 * - Shopify API secrets
 * - Shopify access tokens
 * - Stripe secret keys
 * - MongoDB credentials
 *
 * ============================================================================
 */

// ============================================================================
// ENVIRONMENT
// ============================================================================

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim();


// ============================================================================
// NORMALIZE API URL
// ============================================================================

function normalizeApiUrl(
  value?: string
): string {

  if (!value) {

    /*
     * Development fallback.
     *
     * In production, NEXT_PUBLIC_API_URL must be configured
     * in Vercel.
     */

    return 'http://localhost:5000';
  }


  return value
    .replace(/\/+$/, '');
}


const API_BASE_URL =
  normalizeApiUrl(
    rawApiUrl
  );


// ============================================================================
// API CONFIG
// ============================================================================

export const API_CONFIG = {

  baseUrl:
    API_BASE_URL,

  version:
    'v1',

  timeout:
    30000,

  analyticsTimeout:
    10000,

} as const;


// ============================================================================
// API ENDPOINTS
// ============================================================================
//
// IMPORTANT:
// These paths are relative to /v1.
//
// Example:
//
// API_BASE_URL = https://api.example.com
//
// API_ENDPOINTS.health
// → https://api.example.com/v1/health
//
// ============================================================================

export const API_ENDPOINTS = {

  // --------------------------------------------------------------------------
  // Health
  // --------------------------------------------------------------------------

  health:
    '/health',


  // --------------------------------------------------------------------------
  // Shopify Installation
  // --------------------------------------------------------------------------

  install:
    `${API_BASE_URL}/v1/install`,

  installStatus:
    '/install/status',


  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

  login:
    '/auth/login',

  register:
    '/auth/register',

  logout:
    '/auth/logout',

  me:
    '/auth/me',


  // --------------------------------------------------------------------------
  // Chat / AI Sales Agent
  // --------------------------------------------------------------------------

  chat:
    '/chat',

  chatStatus:
    '/chat/status',


  // --------------------------------------------------------------------------
  // Products
  // --------------------------------------------------------------------------

  products:
    '/products',

  featuredProducts:
    '/products/featured',


  // --------------------------------------------------------------------------
  // Analytics
  // --------------------------------------------------------------------------

  analyticsEvent:
    '/analytics/event',

  analyticsEvents:
    '/analytics/events',

  analyticsDashboard:
    '/analytics/dashboard',

  analyticsFunnel:
    '/analytics/funnel',

  analyticsProducts:
    '/analytics/products',

  analyticsDaily:
    '/analytics/daily',


  // --------------------------------------------------------------------------
  // Billing
  // --------------------------------------------------------------------------

  billingStatus:
    '/billing/status',

  billingCheckout:
    '/billing/checkout',

  billingPortal:
    '/billing/portal',


  // --------------------------------------------------------------------------
  // Merchant
  // --------------------------------------------------------------------------

  merchant:
    '/merchant',

  merchantSettings:
    '/merchant/settings',

} as const;


// ============================================================================
// FULL API URL HELPER
// ============================================================================

export function getApiUrl(
  endpoint: string
): string {

  const normalizedEndpoint =
    endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;


  return (
    `${API_CONFIG.baseUrl}` +
    `/v1` +
    normalizedEndpoint
  );
}


// ============================================================================
// INSTALL URL HELPER
// ============================================================================
//
// Unlike normal API requests, this endpoint is intentionally represented
// as a complete URL because the browser may redirect directly to it.
//

export function getInstallApiUrl(
  shop?: string
): string {

  const url =
    new URL(
      `${API_CONFIG.baseUrl}/v1/install`
    );


  if (shop) {

    url.searchParams.set(
      'shop',
      shop
    );
  }


  return url.toString();
}


// ============================================================================
// APPLICATION CONFIG
// ============================================================================

export const APP_CONFIG = {

  name:
    'Layboka AI',

  website:
    'https://laybokav1.com',

  trialDays:
    5,

  supportEmail:
    'support@laybokav1.com',

} as const;


// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

export const IS_DEVELOPMENT =
  process.env.NODE_ENV ===
  'development';


export const IS_PRODUCTION =
  process.env.NODE_ENV ===
  'production';


// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Returns true when the application has a configured public API URL.
 *
 * localhost is considered valid during development.
 */

export function hasApiConfiguration(): boolean {

  return Boolean(
    rawApiUrl
  );
}


// ============================================================================
// EXPORT DEFAULT
// ============================================================================

const config = {

  API_CONFIG,

  API_ENDPOINTS,

  APP_CONFIG,

  IS_DEVELOPMENT,

  IS_PRODUCTION,

  getApiUrl,

  getInstallApiUrl,

  hasApiConfiguration,
};


export default config;
