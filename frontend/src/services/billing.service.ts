/**
 * ============================================================================
 * Layboka AI — V1
 * Billing Service
 * ============================================================================
 *
 * File:
 * frontend/src/services/billing.service.ts
 *
 * Purpose:
 * - Get current subscription/trial status
 * - Start Stripe checkout
 * - Handle billing state in the frontend
 *
 * IMPORTANT:
 * - Stripe secret keys NEVER belong in the frontend.
 * - Prices displayed here are informational.
 * - The backend is the source of truth for billing.
 * - Stripe Checkout is created by the backend.
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

export type BillingPlan =
  | 'starter'
  | 'growth'
  | 'pro'
  | 'enterprise';


export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid'
  | 'expired'
  | 'none';


export interface BillingStatus {

  success?: boolean;

  shop?: string;

  plan?: BillingPlan | string | null;

  status?: SubscriptionStatus | string;

  subscriptionStatus?: SubscriptionStatus | string;

  trial?: {

    active?: boolean;

    daysRemaining?: number;

    expiresAt?: string | null;

    startedAt?: string | null;

  };

  currentPeriodStart?: string | null;

  currentPeriodEnd?: string | null;

  cancelAtPeriodEnd?: boolean;

  conversations?: {

    used?: number;

    limit?: number;

    remaining?: number;

  };

  currency?: string;

  [key: string]: unknown;
}


export interface CheckoutRequest {

  plan:
    BillingPlan;

  shop?: string;

  successUrl?: string;

  cancelUrl?: string;
}


export interface CheckoutResponse {

  success?: boolean;

  message?: string;

  checkoutUrl?: string;

  url?: string;

  sessionId?: string;

  [key: string]: unknown;
}


// ============================================================================
// GET BILLING STATUS
// ============================================================================

/**
 * Retrieves the current merchant's billing state.
 *
 * Backend remains the source of truth.
 */

export async function getBillingStatus(
  shop?: string
): Promise<BillingStatus> {

  const params =
    shop
      ? {
          shop,
        }
      : undefined;


  return await apiService.get<BillingStatus>(
    API_ENDPOINTS.billingStatus,
    {
      params,
    }
  );
}


// ============================================================================
// CREATE STRIPE CHECKOUT
// ============================================================================

/**
 * Creates a Stripe Checkout session through the backend.
 *
 * The frontend never communicates directly with Stripe's secret API.
 */

export async function createCheckout(
  request: CheckoutRequest
): Promise<CheckoutResponse> {

  if (
    !request.plan
  ) {

    throw new Error(
      'Please select a subscription plan.'
    );
  }


  const response =
    await apiService.post<
      CheckoutResponse,
      CheckoutRequest
    >(
      API_ENDPOINTS.billingCheckout,
      request
    );


  const checkoutUrl =
    response.checkoutUrl ||
    response.url;


  if (
    !checkoutUrl
  ) {

    throw new Error(
      response.message ||
      'Unable to create the checkout session.'
    );
  }


  return response;
}


// ============================================================================
// REDIRECT TO STRIPE CHECKOUT
// ============================================================================

export async function startCheckout(
  plan: BillingPlan,
  shop?: string
): Promise<void> {

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : undefined;


  const response =
    await createCheckout({

      plan,

      shop,

      successUrl:
        appUrl
          ? `${appUrl}/billing/success`
          : undefined,

      cancelUrl:
        appUrl
          ? `${appUrl}/pricing`
          : undefined,
    });


  const checkoutUrl =
    response.checkoutUrl ||
    response.url;


  if (
    !checkoutUrl
  ) {

    throw new Error(
      'Stripe checkout URL was not returned by the backend.'
    );
  }


  window.location.assign(
    checkoutUrl
  );
}


// ============================================================================
// PLAN HELPERS
// ============================================================================

export function isPaidPlan(
  plan?: string | null
): boolean {

  if (!plan) {
    return false;
  }


  return [
    'starter',
    'growth',
    'pro',
    'enterprise',
  ].includes(
    plan.toLowerCase()
  );
}


export function isTrialActive(
  billing?: BillingStatus | null
): boolean {

  return Boolean(
    billing?.trial?.active
  );
}


export function isSubscriptionActive(
  billing?: BillingStatus | null
): boolean {

  const status =
    String(
      billing?.status ||
      billing?.subscriptionStatus ||
      ''
    ).toLowerCase();


  return (
    status === 'active' ||
    status === 'trialing'
  );
}


export function isBillingBlocked(
  billing?: BillingStatus | null
): boolean {

  if (!billing) {
    return false;
  }


  const status =
    String(
      billing.status ||
      billing.subscriptionStatus ||
      ''
    ).toLowerCase();


  return [
    'expired',
    'canceled',
    'unpaid',
  ].includes(
    status
  );
}


// ============================================================================
// USAGE HELPERS
// ============================================================================

export function getConversationUsage(
  billing?: BillingStatus | null
): {
  used: number;
  limit: number | null;
  remaining: number | null;
  percentage: number;
} {

  const used =
    Math.max(
      0,
      Number(
        billing?.conversations?.used || 0
      )
    );


  const rawLimit =
    billing?.conversations?.limit;


  const limit =
    typeof rawLimit === 'number' &&
    rawLimit >= 0
      ? rawLimit
      : null;


  const remaining =
    limit === null
      ? null
      : Math.max(
          0,
          limit - used
        );


  const percentage =
    limit &&
    limit > 0
      ? Math.min(
          100,
          Math.round(
            (used / limit) * 100
          )
        )
      : 0;


  return {

    used,

    limit,

    remaining,

    percentage,
  };
}


// ============================================================================
// BILLING STATUS LABEL
// ============================================================================

export function getBillingStatusLabel(
  billing?: BillingStatus | null
): string {

  if (!billing) {
    return 'Unknown';
  }


  if (
    billing.trial?.active
  ) {

    const days =
      billing.trial.daysRemaining;


    if (
      typeof days === 'number'
    ) {

      if (days <= 0) {
        return 'Trial expired';
      }


      return `${days} day${days === 1 ? '' : 's'} left in trial`;
    }


    return 'Free trial';
  }


  const status =
    String(
      billing.status ||
      billing.subscriptionStatus ||
      'none'
    ).toLowerCase();


  switch (status) {

    case 'active':
      return 'Active';

    case 'past_due':
      return 'Payment past due';

    case 'canceled':
      return 'Canceled';

    case 'unpaid':
      return 'Payment required';

    case 'expired':
      return 'Expired';

    case 'incomplete':
      return 'Payment incomplete';

    default:
      return 'No active subscription';
  }
}


// ============================================================================
// SAFE BILLING STATUS
// ============================================================================
//
// Billing information should not prevent the rest of the dashboard from
// rendering.
//

export async function safeGetBillingStatus(
  shop?: string
): Promise<BillingStatus | null> {

  try {

    return await getBillingStatus(
      shop
    );

  } catch (error) {

    console.warn(
      '[Layboka Billing] Unable to load billing status:',
      error
    );


    return null;
  }
}


// ============================================================================
// EXPORT DEFAULT
// ============================================================================

const billingService = {

  getBillingStatus,

  createCheckout,

  startCheckout,

  isPaidPlan,

  isTrialActive,

  isSubscriptionActive,

  isBillingBlocked,

  getConversationUsage,

  getBillingStatusLabel,

  safeGetBillingStatus,
};


export default billingService;
