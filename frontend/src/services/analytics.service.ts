/**
 * ============================================================================
 * Layboka AI — V1
 * Analytics Service
 * ============================================================================
 *
 * File:
 * frontend/src/services/analytics.service.ts
 *
 * Purpose:
 * - Track basic AI sales-agent events
 * - Retrieve merchant analytics
 * - Retrieve conversion funnel
 * - Retrieve product performance
 * - Retrieve daily analytics
 *
 * ============================================================================
 */

'use client';

import {
  apiService,
} from './api.service';

import {
  API_ENDPOINTS,
} from '@/lib/config';


// ============================================================================
// TYPES
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

  shop?: string;

  sessionId?: string;

  productId?: string;

  productTitle?: string;

  value?: number;

  currency?: string;

  metadata?: Record<
    string,
    unknown
  >;
}


export interface AnalyticsResponse {

  success?: boolean;

  message?: string;

  data?: unknown;

  [key: string]: unknown;
}


export interface AnalyticsDashboard {

  success?: boolean;

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

  [key: string]: unknown;
}


export interface AnalyticsFunnel {

  success?: boolean;

  data?: unknown;

  stages?: Array<{
    name: string;
    count: number;
    rate?: number;
  }>;

  [key: string]: unknown;
}


export interface ProductAnalytics {

  success?: boolean;

  data?: unknown;

  products?: Array<{
    productId?: string;
    title?: string;
    views?: number;
    clicks?: number;
    addToCart?: number;
    purchases?: number;
    revenue?: number;
  }>;

  [key: string]: unknown;
}


export interface DailyAnalytics {

  success?: boolean;

  data?: unknown;

  days?: Array<{
    date: string;
    chats?: number;
    messages?: number;
    purchases?: number;
    revenue?: number;
  }>;

  [key: string]: unknown;
}


// ============================================================================
// TRACK EVENT
// ============================================================================

export async function trackEvent(
  event: AnalyticsEvent
): Promise<AnalyticsResponse> {

  return await apiService.post<
    AnalyticsResponse,
    AnalyticsEvent
  >(
    API_ENDPOINTS.analyticsEvent,
    event
  );
}


// ============================================================================
// TRACK MULTIPLE EVENTS
// ============================================================================

export async function trackEvents(
  events: AnalyticsEvent[]
): Promise<AnalyticsResponse> {

  if (
    !Array.isArray(events) ||
    events.length === 0
  ) {

    return {
      success:
        true,

      message:
        'No analytics events to send.',
    };
  }


  return await apiService.post<
    AnalyticsResponse,
    {
      events: AnalyticsEvent[];
    }
  >(
    API_ENDPOINTS.analyticsEvents,
    {
      events,
    }
  );
}


// ============================================================================
// DASHBOARD
// ============================================================================

export async function getAnalyticsDashboard(
  params?: {
    shop?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<AnalyticsDashboard> {

  return await apiService.get<AnalyticsDashboard>(
    API_ENDPOINTS.analyticsDashboard,
    {
      params,
    }
  );
}


// ============================================================================
// FUNNEL
// ============================================================================

export async function getAnalyticsFunnel(
  params?: {
    shop?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<AnalyticsFunnel> {

  return await apiService.get<AnalyticsFunnel>(
    API_ENDPOINTS.analyticsFunnel,
    {
      params,
    }
  );
}


// ============================================================================
// PRODUCT PERFORMANCE
// ============================================================================

export async function getProductAnalytics(
  params?: {
    shop?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<ProductAnalytics> {

  return await apiService.get<ProductAnalytics>(
    API_ENDPOINTS.analyticsProducts,
    {
      params,
    }
  );
}


// ============================================================================
// DAILY ANALYTICS
// ============================================================================

export async function getDailyAnalytics(
  params?: {
    shop?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<DailyAnalytics> {

  return await apiService.get<DailyAnalytics>(
    API_ENDPOINTS.analyticsDaily,
    {
      params,
    }
  );
}


// ============================================================================
// CONVENIENCE EVENT HELPERS
// ============================================================================

export async function trackChatOpen(
  data?: Omit<
    AnalyticsEvent,
    'event'
  >
): Promise<AnalyticsResponse> {

  return trackEvent({
    ...data,

    event:
      'chat_open',
  });
}


export async function trackChatStarted(
  data?: Omit<
    AnalyticsEvent,
    'event'
  >
): Promise<AnalyticsResponse> {

  return trackEvent({
    ...data,

    event:
      'chat_started',
  });
}


export async function trackMessageSent(
  data?: Omit<
    AnalyticsEvent,
    'event'
  >
): Promise<AnalyticsResponse> {

  return trackEvent({
    ...data,

    event:
      'message_sent',
  });
}


export async function trackProductView(
  data?: Omit<
    AnalyticsEvent,
    'event'
  >
): Promise<AnalyticsResponse> {

  return trackEvent({
    ...data,

    event:
      'product_view',
  });
}


export async function trackProductClick(
  data?: Omit<
    AnalyticsEvent,
    'event'
  >
): Promise<AnalyticsResponse> {

  return trackEvent({
    ...data,

    event:
      'product_click',
  });
}


export async function trackAddToCart(
  data?: Omit<
    AnalyticsEvent,
    'event'
  >
): Promise<AnalyticsResponse> {

  return trackEvent({
    ...data,

    event:
      'add_to_cart',
  });
}


export async function trackCheckoutStarted(
  data?: Omit<
    AnalyticsEvent,
    'event'
  >
): Promise<AnalyticsResponse> {

  return trackEvent({
    ...data,

    event:
      'checkout_started',
  });
}


export async function trackPurchase(
  data?: Omit<
    AnalyticsEvent,
    'event'
  >
): Promise<AnalyticsResponse> {

  return trackEvent({
    ...data,

    event:
      'purchase',
  });
}


// ============================================================================
// SAFE ANALYTICS TRACKING
// ============================================================================
//
// Analytics should never break the main customer experience.
//
// For example, if analytics is temporarily unavailable,
// a customer should still be able to use the chatbot.
//

export async function safeTrackEvent(
  event: AnalyticsEvent
): Promise<void> {

  try {

    await trackEvent(
      event
    );

  } catch (error) {

    console.warn(
      '[Layboka Analytics] Event tracking failed:',
      error
    );
  }
}


// ============================================================================
// EXPORT DEFAULT
// ============================================================================

const analyticsService = {

  trackEvent,

  trackEvents,

  getAnalyticsDashboard,

  getAnalyticsFunnel,

  getProductAnalytics,

  getDailyAnalytics,

  trackChatOpen,

  trackChatStarted,

  trackMessageSent,

  trackProductView,

  trackProductClick,

  trackAddToCart,

  trackCheckoutStarted,

  trackPurchase,

  safeTrackEvent,
};


export default analyticsService;

