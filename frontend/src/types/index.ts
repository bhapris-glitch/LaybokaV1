/**
 * ============================================================================
 * Layboka AI — V1
 * Shared Frontend Types
 * ============================================================================
 *
 * File:
 * frontend/src/types/index.ts
 *
 * Purpose:
 * - Centralize shared application types
 * - Prevent duplicate interfaces
 * - Keep components and services type-safe
 *
 * ============================================================================
 */

// ============================================================================
// GENERIC API
// ============================================================================

export interface ApiResponse<T = unknown> {

  success?: boolean;

  message?: string;

  data?: T;

  error?: string;

  code?: string;

  [key: string]: unknown;
}


// ============================================================================
// USER
// ============================================================================

export interface User {

  id: string;

  email: string;

  name?: string;

  role?: string;

  createdAt?: string;

  updatedAt?: string;
}


// ============================================================================
// MERCHANT
// ============================================================================

export interface Merchant {

  id: string;

  shop?: string;

  shopDomain?: string;

  storeName?: string;

  email?: string;

  plan?: string;

  subscriptionStatus?: string;

  trialActive?: boolean;

  trialEndsAt?: string | null;

  createdAt?: string;

  updatedAt?: string;

  [key: string]: unknown;
}


// ============================================================================
// TRIAL
// ============================================================================

export interface Trial {

  active: boolean;

  durationDays?: number;

  daysRemaining?: number;

  startedAt?: string | null;

  expiresAt?: string | null;
}


// ============================================================================
// BILLING
// ============================================================================

export type PlanId =
  | 'starter'
  | 'growth'
  | 'pro'
  | 'enterprise';


export type BillingStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid'
  | 'expired';


export interface Subscription {

  id?: string;

  plan?: PlanId | string;

  status?: BillingStatus | string;

  currency?: string;

  amount?: number;

  interval?: 'month' | 'year';

  currentPeriodStart?: string | null;

  currentPeriodEnd?: string | null;

  cancelAtPeriodEnd?: boolean;
}


// ============================================================================
// PRODUCT
// ============================================================================

export interface ProductVariant {

  id?: string;

  title?: string;

  price?: number | string;

  compareAtPrice?: number | string | null;

  available?: boolean;

  inventoryQuantity?: number | null;

  sku?: string | null;

  [key: string]: unknown;
}


export interface Product {

  id: string;

  title: string;

  handle?: string;

  description?: string;

  price?: number | string;

  compareAtPrice?: number | string | null;

  currency?: string;

  image?: string | null;

  imageUrl?: string | null;

  images?: string[];

  url?: string | null;

  available?: boolean;

  inventoryQuantity?: number | null;

  vendor?: string;

  productType?: string;

  tags?: string[];

  variants?: ProductVariant[];

  createdAt?: string;

  updatedAt?: string;

  [key: string]: unknown;
}


// ============================================================================
// CART
// ============================================================================

export interface CartItem {

  productId?: string;

  variantId?: string;

  title?: string;

  quantity: number;

  price?: number;

  currency?: string;

  image?: string;

  [key: string]: unknown;
}


// ============================================================================
// CHAT
// ============================================================================

export type ChatRole =
  | 'user'
  | 'assistant'
  | 'system';


export interface ChatMessage {

  id?: string;

  role: ChatRole;

  content: string;

  createdAt?: string;

  products?: Product[];

  metadata?: Record<
    string,
    unknown
  >;
}


export interface ChatSession {

  id: string;

  shop?: string;

  messages: ChatMessage[];

  createdAt?: string;

  updatedAt?: string;
}


// ============================================================================
// ANALYTICS
// ============================================================================

export type AnalyticsEventName =
  | 'chat_open'
  | 'chat_started'
  | 'message_sent'
  | 'product_view'
  | 'product_click'
  | 'add_to_cart'
  | 'checkout_started'
  | 'purchase'
  | 'trial_started'
  | 'install_completed';


export interface AnalyticsEvent {

  event:
    AnalyticsEventName;

  sessionId?: string;

  shop?: string;

  productId?: string;

  value?: number;

  currency?: string;

  metadata?: Record<
    string,
    unknown
  >;
}


export interface AnalyticsSummary {

  totalChats?: number;

  totalMessages?: number;

  productViews?: number;

  productClicks?: number;

  addToCart?: number;

  checkoutStarted?: number;

  purchases?: number;

  conversionRate?: number;

  revenue?: number;

  currency?: string;
}


// ============================================================================
// DASHBOARD
// ============================================================================

export interface DashboardData {

  merchant?: Merchant;

  trial?: Trial;

  subscription?: Subscription;

  analytics?: AnalyticsSummary;
}


// ============================================================================
// INSTALLATION
// ============================================================================

export interface Installation {

  shop: string;

  installed?: boolean;

  installedAt?: string | null;

  trial?: Trial;

  status?: string;

  message?: string;
}


// ============================================================================
// NAVIGATION
// ============================================================================

export interface NavItem {

  label: string;

  href: string;

  external?: boolean;
}


// ============================================================================
// FORM STATE
// ============================================================================

export interface FormState {

  loading: boolean;

  error: string | null;

  success: string | null;
}


// ============================================================================
// ASYNC STATE
// ============================================================================

export interface AsyncState<T> {

  data: T | null;

  loading: boolean;

  error: string | null;
}


// ============================================================================
// PAGINATION
// ============================================================================

export interface Pagination {

  page: number;

  limit: number;

  total: number;

  hasMore: boolean;
}


// ============================================================================
// CURRENCY
// ============================================================================

export type SupportedCurrency =
  | 'USD'
  | 'INR';


export interface Money {

  amount: number;

  currency: SupportedCurrency | string;
}


// ============================================================================
// API ERROR
// ============================================================================

export interface AppError {

  message: string;

  status?: number;

  code?: string;

  details?: unknown;
}


// ============================================================================
// COMMON RESPONSE
// ============================================================================

export interface SuccessResponse {

  success: true;

  message?: string;
}


export interface ErrorResponse {

  success: false;

  error?: string;

  message?: string;

  code?: string;
}
