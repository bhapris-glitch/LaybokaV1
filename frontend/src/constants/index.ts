/**
 * ============================================================================
 * Layboka AI — V1
 * Application Constants
 * ============================================================================
 *
 * File:
 * frontend/src/constants/index.ts
 *
 * Purpose:
 * - Centralize public application constants
 * - Keep branding consistent
 * - Define V1 trial information
 * - Define navigation
 * - Define supported currencies
 * - Define frontend-safe plan information
 *
 * IMPORTANT:
 * Never place secrets in this file.
 *
 * ============================================================================
 */

// ============================================================================
// BRAND
// ============================================================================

export const BRAND = {
  name: 'Layboka',

  productName:
    'Layboka AI',

  tagline:
    'Turn Visitors Into Buyers 24/7',

  description:
    'An AI Sales Agent that helps Shopify stores engage shoppers, recommend products, and increase sales.',

  primaryColor:
    '#FF4616',

  backgroundColor:
    '#040501',

  white:
    '#FFFFFF',

  website:
    'https://laybokav1.com',
} as const;


// ============================================================================
// APPLICATION
// ============================================================================

export const APP = {

  name:
    'Layboka AI',

  version:
    '1.0.0',

  environment:
    process.env.NODE_ENV || 'development',

} as const;


// ============================================================================
// TRIAL
// ============================================================================

export const TRIAL = {

  days:
    5,

  label:
    '5-Day Free Trial',

  description:
    'Try the Layboka AI Sales Agent free for 5 days.',

} as const;


// ============================================================================
// CURRENCY
// ============================================================================

export const CURRENCIES = {

  USD: {
    code:
      'USD',

    symbol:
      '$',

    name:
      'US Dollar',
  },

  INR: {
    code:
      'INR',

    symbol:
      '₹',

    name:
      'Indian Rupee',
  },

} as const;


export type SupportedCurrency =
  keyof typeof CURRENCIES;


// ============================================================================
// PRICING PLANS
// ============================================================================
//
// These are frontend display values only.
// The backend/Stripe configuration remains the billing source of truth.
//

export const PLANS = {

  starter: {

    id:
      'starter',

    name:
      'Starter',

    description:
      'AI sales assistance for growing stores.',

    monthlyUSD:
      8,

    monthlyINR:
      699,

    features: [

      '24/7 AI Sales Agent',

      'Product recommendations',

      'Shopify product knowledge',

      'Upselling & cross-selling',

      'Basic sales analytics',

      '5-day free trial',
    ],
  },


  growth: {

    id:
      'growth',

    name:
      'Growth',

    description:
      'More conversations and stronger sales automation.',

    monthlyUSD:
      25,

    monthlyINR:
      2199,

    popular:
      true,

    features: [

      'Everything in Starter',

      'Higher conversation limits',

      'Advanced product recommendations',

      'Cart recovery assistance',

      'Conversion analytics',

      'Priority support',
    ],
  },


  pro: {

    id:
      'pro',

    name:
      'Pro',

    description:
      'For serious Shopify stores scaling AI-assisted sales.',

    monthlyUSD:
      59,

    monthlyINR:
      5199,

    features: [

      'Everything in Growth',

      'Higher AI usage',

      'Advanced sales insights',

      'Advanced upselling',

      'Priority AI processing',

      'Premium support',
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

      'Custom deployment options',

      'Custom pricing',
    ],
  },

} as const;


// ============================================================================
// PLAN TYPE
// ============================================================================

export type PlanId =
  keyof typeof PLANS;


// ============================================================================
// NAVIGATION
// ============================================================================

export const PUBLIC_NAVIGATION = [

  {
    label:
      'Features',

    href:
      '/#features',
  },

  {
    label:
      'How It Works',

    href:
      '/#how-it-works',
  },

  {
    label:
      'Pricing',

    href:
      '/pricing',
  },

  {
    label:
      'Documentation',

    href:
      '/docs',
  },

] as const;


export const DASHBOARD_NAVIGATION = [

  {
    label:
      'Overview',

    href:
      '/dashboard',
  },

  {
    label:
      'Analytics',

    href:
      '/dashboard/analytics',
  },

  {
    label:
      'Billing',

    href:
      '/dashboard/billing',
  },

  {
    label:
      'Settings',

    href:
      '/dashboard/settings',
  },

] as const;


// ============================================================================
// FOOTER
// ============================================================================

export const FOOTER_LINKS = {

  product: [

    {
      label:
        'Features',

      href:
        '/#features',
    },

    {
      label:
        'Pricing',

      href:
        '/pricing',
    },

    {
      label:
        'Documentation',

      href:
        '/docs',
    },

  ],

  company: [

    {
      label:
        'About',

      href:
        '/about',
    },

    {
      label:
        'Contact',

      href:
        '/contact',
    },

  ],

  legal: [

    {
      label:
        'Privacy Policy',

      href:
        '/privacy',
    },

    {
      label:
        'Terms of Service',

      href:
        '/terms',
    },

  ],

} as const;


// ============================================================================
// CHATBOT
// ============================================================================

export const CHATBOT = {

  name:
    'Layboka AI',

  assistantName:
    'Layboka Sales Agent',

  welcomeMessage:
    'Hi! 👋 I’m your AI Sales Agent. What are you looking for today?',

  placeholder:
    'Ask me about products...',

  maxMessageLength:
    2000,

  maxQuickReplies:
    6,

} as const;


// ============================================================================
// ANALYTICS
// ============================================================================

export const ANALYTICS = {

  sessionStorageKey:
    'layboka_v1_chat_session',

  viewedProductsKey:
    'layboka_v1_viewed_products',

  cartKey:
    'layboka_v1_cart',

} as const;


// ============================================================================
// LOCAL STORAGE
// ============================================================================

export const STORAGE_KEYS = {

  currency:
    'layboka_v1_currency',

  theme:
    'layboka_v1_theme',

  installShop:
    'layboka_v1_install_shop',

} as const;


// ============================================================================
// HTTP
// ============================================================================

export const HTTP = {

  timeout:
    30000,

  analyticsTimeout:
    10000,

} as const;


// ============================================================================
// FORM LIMITS
// ============================================================================

export const FORM_LIMITS = {

  emailMaxLength:
    254,

  nameMaxLength:
    100,

  shopDomainMaxLength:
    253,

  messageMaxLength:
    CHATBOT.maxMessageLength,

} as const;


// ============================================================================
// ROUTES
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

  install:
    '/install',

  dashboard:
    '/dashboard',

  analytics:
    '/dashboard/analytics',

  billing:
    '/dashboard/billing',

  settings:
    '/dashboard/settings',

  documentation:
    '/docs',

  privacy:
    '/privacy',

  terms:
    '/terms',

  contact:
    '/contact',

} as const;


// ============================================================================
// EXTERNAL LINKS
// ============================================================================

export const EXTERNAL_LINKS = {

  website:
    'https://laybokav1.com',

} as const;


// ============================================================================
// UI
// ============================================================================

export const UI = {

  mobileBreakpoint:
    768,

  tabletBreakpoint:
    1024,

  desktopBreakpoint:
    1280,

  animationDuration:
    200,

} as const;


// ============================================================================
// FEATURE FLAGS
// ============================================================================
//
// V1 intentionally keeps these conservative.
// Future V2 functionality can be enabled here without rebuilding the
// application's architecture.
//

export const FEATURES = {

  analytics:
    true,

  billing:
    true,

  shopifyInstall:
    true,

  aiChat:
    true,

  productRecommendations:
    true,

  cartRecovery:
    true,

  voice:
    false,

  whatsapp:
    false,

  affiliates:
    false,

  whiteLabel:
    false,

} as const;


// ============================================================================
// EXPORT
// ============================================================================

const constants = {

  BRAND,

  APP,

  TRIAL,

  CURRENCIES,

  PLANS,

  PUBLIC_NAVIGATION,

  DASHBOARD_NAVIGATION,

  FOOTER_LINKS,

  CHATBOT,

  ANALYTICS,

  STORAGE_KEYS,

  HTTP,

  FORM_LIMITS,

  ROUTES,

  EXTERNAL_LINKS,

  UI,

  FEATURES,
};


export default constants;
