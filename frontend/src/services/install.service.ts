/**
 * ============================================================================
 * Layboka AI — V1
 * Shopify Installation Service
 * ============================================================================
 *
 * File:
 * frontend/src/services/install.service.ts
 *
 * Purpose:
 * - Start Shopify installation
 * - Validate Shopify store domain
 * - Build the backend installation URL
 * - Handle installation callback parameters
 * - Keep Shopify OAuth secrets on the backend
 *
 * IMPORTANT:
 * The browser must NEVER receive:
 * - SHOPIFY_API_SECRET
 * - OpenAI API key
 * - Stripe secret
 * - MongoDB credentials
 * - Shopify access token
 *
 * ============================================================================
 */

'use client';

import {
  API_CONFIG,
  API_ENDPOINTS,
} from '@/lib/config';

import {
  apiService,
} from './api.service';


// ============================================================================
// TYPES
// ============================================================================

export interface InstallResponse {
  success?: boolean;

  message?: string;

  shop?: string;

  redirectUrl?: string;

  authUrl?: string;

  installUrl?: string;

  [key: string]: unknown;
}


export interface InstallationStatus {
  success?: boolean;

  installed?: boolean;

  shop?: string;

  trial?: {
    active?: boolean;
    daysRemaining?: number;
    expiresAt?: string;
  };

  [key: string]: unknown;
}


export interface ShopifyInstallResult {
  shop: string;

  redirectUrl: string;
}


// ============================================================================
// SHOP DOMAIN VALIDATION
// ============================================================================

/**
 * Normalizes a merchant's Shopify store input.
 *
 * Supported examples:
 *
 * shop-name.myshopify.com
 * https://shop-name.myshopify.com
 * http://shop-name.myshopify.com/
 * https://www.example-store.com
 * example-store.com
 *
 * The final value returned is the hostname only.
 */

export function normalizeShopDomain(
  value: string
): string {

  const input =
    value.trim();


  if (!input) {
    throw new Error(
      'Please enter your Shopify store URL.'
    );
  }


  let hostname =
    input;


  // --------------------------------------------------------------------------
  // Add protocol when missing
  // --------------------------------------------------------------------------

  if (
    !hostname.startsWith('http://') &&
    !hostname.startsWith('https://')
  ) {

    hostname =
      `https://${hostname}`;
  }


  // --------------------------------------------------------------------------
  // Parse URL
  // --------------------------------------------------------------------------

  let url: URL;

  try {

    url =
      new URL(hostname);

  } catch {

    throw new Error(
      'Please enter a valid Shopify store URL.'
    );
  }


  // --------------------------------------------------------------------------
  // Remove www
  // --------------------------------------------------------------------------

  let host =
    url.hostname
      .toLowerCase()
      .trim();


  if (
    host.startsWith('www.')
  ) {

    host =
      host.substring(4);
  }


  // --------------------------------------------------------------------------
  // Remove trailing dot
  // --------------------------------------------------------------------------

  host =
    host.replace(
      /\.$/,
      ''
    );


  // --------------------------------------------------------------------------
  // Basic hostname validation
  // --------------------------------------------------------------------------

  if (
    !host ||
    !host.includes('.')
  ) {

    throw new Error(
      'Please enter a valid store domain.'
    );
  }


  // --------------------------------------------------------------------------
  // Shopify-hosted store
  // --------------------------------------------------------------------------

  if (
    host.endsWith(
      '.myshopify.com'
    )
  ) {

    return host;
  }


  // --------------------------------------------------------------------------
  // Custom Shopify domain
  // --------------------------------------------------------------------------
  //
  // Custom domains are allowed.
  // The backend will verify that the store is actually associated with
  // Shopify during the OAuth/install process.
  //

  return host;
}


// ============================================================================
// SHOPIFY DOMAIN CHECK
// ============================================================================

export function isShopifyDomain(
  value: string
): boolean {

  try {

    const domain =
      normalizeShopDomain(
        value
      );

    return domain.endsWith(
      '.myshopify.com'
    );

  } catch {

    return false;
  }
}


// ============================================================================
// START INSTALLATION
// ============================================================================

/**
 * Starts the Shopify installation flow.
 *
 * The backend is responsible for:
 *
 * 1. Validating the shop
 * 2. Creating OAuth state
 * 3. Building Shopify authorization URL
 * 4. Redirecting merchant to Shopify
 *
 * We support two backend response styles:
 *
 * redirectUrl
 * authUrl
 * installUrl
 *
 * This makes the frontend tolerant of the V1 backend implementation.
 */

export async function startShopifyInstall(
  shopInput: string
): Promise<ShopifyInstallResult> {

  const shop =
    normalizeShopDomain(
      shopInput
    );


  const response =
    await apiService.post<InstallResponse>(
      '/install',
      {
        shop,
      }
    );


  const redirectUrl =
    response.redirectUrl ||
    response.authUrl ||
    response.installUrl;


  if (
    !redirectUrl
  ) {

    throw new Error(
      response.message ||
      'Unable to start Shopify installation.'
    );
  }


  return {
    shop,

    redirectUrl,
  };
}


// ============================================================================
// REDIRECT TO SHOPIFY
// ============================================================================

export async function redirectToShopify(
  shopInput: string
): Promise<void> {

  const {
    redirectUrl,
  } =
    await startShopifyInstall(
      shopInput
    );


  /*
   * OAuth URLs come from our trusted backend.
   *
   * We use a full browser redirect because Shopify OAuth
   * needs to leave the application.
   */

  window.location.assign(
    redirectUrl
  );
}


// ============================================================================
// DIRECT INSTALL URL
// ============================================================================

/**
 * Returns the backend installation endpoint.
 *
 * This is useful when the landing page wants to redirect directly
 * to the backend instead of making an AJAX request first.
 *
 * Example:
 *
 * https://backend.example.com/v1/install?shop=store.myshopify.com
 */

export function getInstallUrl(
  shopInput: string
): string {

  const shop =
    normalizeShopDomain(
      shopInput
    );


  const url =
    new URL(
      API_ENDPOINTS.install
    );


  url.searchParams.set(
    'shop',
    shop
  );


  return url.toString();
}


// ============================================================================
// INSTALLATION STATUS
// ============================================================================

/**
 * Checks the current installation/trial status.
 *
 * The exact authentication mechanism remains backend-controlled.
 */

export async function getInstallationStatus(
  shop?: string
): Promise<InstallationStatus> {

  const params =
    shop
      ? {
          shop:
            normalizeShopDomain(
              shop
            ),
        }
      : undefined;


  return await apiService.get<InstallationStatus>(
    '/install/status',
    {
      params,
    }
  );
}


// ============================================================================
// CALLBACK HELPERS
// ============================================================================

export interface InstallCallbackParams {
  shop?: string;

  success?: string;

  error?: string;

  errorDescription?: string;

  trial?: string;
}


/**
 * Reads Shopify/backend callback parameters from the browser URL.
 */

export function getInstallCallbackParams():
  InstallCallbackParams {

  if (
    typeof window === 'undefined'
  ) {

    return {};
  }


  const params =
    new URLSearchParams(
      window.location.search
    );


  return {

    shop:
      params.get('shop') ||
      undefined,

    success:
      params.get('success') ||
      undefined,

    error:
      params.get('error') ||
      undefined,

    errorDescription:
      params.get('error_description') ||
      undefined,

    trial:
      params.get('trial') ||
      undefined,
  };
}


// ============================================================================
// CALLBACK ERROR
// ============================================================================

export function getInstallErrorMessage(
  params:
    InstallCallbackParams
): string | null {

  if (
    !params.error
  ) {

    return null;
  }


  return (
    params.errorDescription ||
    params.error ||
    'Shopify installation could not be completed.'
  );
}


// ============================================================================
// EXPORT DEFAULT
// ============================================================================

const installService = {

  normalizeShopDomain,

  isShopifyDomain,

  startShopifyInstall,

  redirectToShopify,

  getInstallUrl,

  getInstallationStatus,

  getInstallCallbackParams,

  getInstallErrorMessage,
};


export default installService;

