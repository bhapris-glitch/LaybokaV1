/**
 * ============================================================================
 * LaybokaV1 — V1
 * Shopify Installation Service
 * ============================================================================
 *
 * File:
 * frontend/src/services/install.service.ts
 *
 * Purpose:
 * - Validate Shopify store input
 * - Normalize Shopify store domains
 * - Build the V1 Shopify OAuth installation URL
 * - Redirect merchant to Shopify
 * - Read installation callback parameters
 * - Provide safe installation-status helpers
 *
 * Backend V1:
 *
 * GET /v1/install?shop=store.myshopify.com
 * GET /v1/install/callback
 *
 * IMPORTANT:
 * Shopify OAuth is intentionally handled by the backend.
 *
 * NEVER expose:
 * - Shopify API secret
 * - Shopify access token
 * - OpenAI API key
 * - Stripe secret
 * - MongoDB credentials
 *
 * ============================================================================
 */

'use client';

import {
  API_ENDPOINTS,
  getInstallApiUrl,
} from '@/lib/config';

import {
  apiService,
} from './api.service';


// ============================================================================
// TYPES
// ============================================================================

export interface InstallationStatus {
  success?: boolean;

  installed?: boolean;

  shop?: string;

  status?: string;

  message?: string;

  trial?: {
    active?: boolean;
    daysRemaining?: number;
    expiresAt?: string;
  };

  [key: string]: unknown;
}


export interface InstallCallbackParams {
  shop?: string;

  installed?: string;

  success?: string;

  trial?: string;

  error?: string;

  errorDescription?: string;
}


export interface ShopifyInstallResult {
  shop: string;

  installUrl: string;
}


// ============================================================================
// CONSTANTS
// ============================================================================

const SHOPIFY_HOST_SUFFIX =
  '.myshopify.com';

const MAX_SHOP_LENGTH =
  253;


// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function removeTrailingSlash(
  value: string
): string {

  return value.replace(
    /\/+$/,
    ''
  );
}


function stripProtocol(
  value: string
): string {

  return value
    .replace(
      /^https?:\/\//i,
      ''
    )
    .trim();
}


function stripPathAndQuery(
  value: string
): string {

  return value
    .split('/')[0]
    .split('?')[0]
    .split('#')[0]
    .trim();
}


// ============================================================================
// SHOP DOMAIN NORMALIZATION
// ============================================================================

/**
 * Normalize a merchant's Shopify store input.
 *
 * Accepted examples:
 *
 * store-name.myshopify.com
 * https://store-name.myshopify.com
 * http://store-name.myshopify.com/
 * https://www.store-name.com
 * store-name.com
 *
 * Returns hostname only.
 *
 * NOTE:
 * A custom Shopify domain can be entered.
 * The backend/Shopify OAuth flow remains responsible for determining
 * whether the domain is actually valid for the Shopify installation.
 */

export function normalizeShopDomain(
  value: string
): string {

  if (
    typeof value !== 'string'
  ) {

    throw new Error(
      'Shopify store domain is required.'
    );
  }


  let input =
    value.trim();


  if (!input) {

    throw new Error(
      'Please enter your Shopify store URL.'
    );
  }


  if (
    input.length >
    MAX_SHOP_LENGTH
  ) {

    throw new Error(
      'The store domain is too long.'
    );
  }


  /*
   * Remove whitespace around the value.
   */

  input =
    input.trim();


  /*
   * If protocol is present, parse it normally.
   */

  let hostname: string;


  try {

    const valueWithProtocol =
      /^https?:\/\//i.test(input)
        ? input
        : `https://${input}`;


    const parsed =
      new URL(
        valueWithProtocol
      );


    hostname =
      parsed.hostname
        .toLowerCase()
        .trim();

  } catch {

    /*
     * Fallback for malformed URL-like input.
     */

    hostname =
      stripPathAndQuery(
        stripProtocol(
          input
        )
      )
      .toLowerCase();
  }


  /*
   * Remove www.
   *
   * This is useful for custom domains.
   */

  if (
    hostname.startsWith('www.')
  ) {

    hostname =
      hostname.substring(4);
  }


  /*
   * Remove accidental trailing dot.
   */

  hostname =
    hostname.replace(
      /\.$/,
      ''
    );


  /*
   * Reject obviously invalid values.
   */

  if (
    !hostname ||
    hostname.length < 3 ||
    hostname.length > MAX_SHOP_LENGTH
  ) {

    throw new Error(
      'Please enter a valid Shopify store domain.'
    );
  }


  /*
   * Hostname must not contain:
   *
   * spaces
   * protocol
   * paths
   * query strings
   * fragments
   */

  if (
    /[\s/:?#]/.test(
      hostname
    )
  ) {

    throw new Error(
      'Please enter only your Shopify store domain.'
    );
  }


  /*
   * Basic hostname validation.
   */

  const hostnameRegex =
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;


  if (
    !hostnameRegex.test(
      hostname
    )
  ) {

    throw new Error(
      'Please enter a valid Shopify store domain.'
    );
  }


  return hostname;
}


// ============================================================================
// SHOPIFY DOMAIN HELPERS
// ============================================================================

/**
 * Returns true when the supplied domain is a Shopify-hosted
 * *.myshopify.com domain.
 */

export function isShopifyHostedDomain(
  value: string
): boolean {

  try {

    const domain =
      normalizeShopDomain(
        value
      );


    return (
      domain.endsWith(
        SHOPIFY_HOST_SUFFIX
      ) &&
      domain.length >
        SHOPIFY_HOST_SUFFIX.length
    );

  } catch {

    return false;
  }
}


/**
 * Backward-compatible helper.
 *
 * Custom Shopify domains are also valid Shopify installation inputs,
 * therefore this function should not be used to reject custom domains.
 */

export function isShopifyDomain(
  value: string
): boolean {

  try {

    normalizeShopDomain(
      value
    );

    return true;

  } catch {

    return false;
  }
}


// ============================================================================
// INSTALL URL
// ============================================================================

/**
 * Build the backend Shopify installation URL.
 *
 * Actual V1 backend endpoint:
 *
 * GET /v1/install?shop=store.myshopify.com
 *
 * The backend responds with a Shopify OAuth redirect.
 */

export function getInstallUrl(
  shopInput: string
): string {

  const shop =
    normalizeShopDomain(
      shopInput
    );


  return getInstallApiUrl(
    shop
  );
}


// ============================================================================
// START INSTALLATION
// ============================================================================

/**
 * Prepare the Shopify installation flow.
 *
 * IMPORTANT:
 *
 * We do NOT use Axios here.
 *
 * The backend installation endpoint returns an HTTP redirect to Shopify.
 * Using window.location.assign() lets the browser follow the complete
 * OAuth flow correctly.
 */

export function startShopifyInstall(
  shopInput: string
): ShopifyInstallResult {

  const shop =
    normalizeShopDomain(
      shopInput
    );


  const installUrl =
    getInstallUrl(
      shop
    );


  return {
    shop,

    installUrl,
  };
}


// ============================================================================
// REDIRECT TO SHOPIFY
// ============================================================================

/**
 * Redirect the merchant to the V1 backend installation endpoint.
 *
 * The backend then:
 *
 * 1. Validates the shop
 * 2. Creates OAuth state
 * 3. Builds Shopify authorization URL
 * 4. Redirects merchant to Shopify
 */

export function redirectToShopify(
  shopInput: string
): void {

  const {
    installUrl,
  } =
    startShopifyInstall(
      shopInput
    );


  /*
   * Save only the non-sensitive shop domain.
   *
   * This can help the callback/success UI remember which store
   * the merchant was installing.
   */

  try {

    window.sessionStorage.setItem(
      'layboka_v1_install_shop',
      normalizeShopDomain(
        shopInput
      )
    );

  } catch {
    /*
     * Storage may be unavailable in privacy-restricted browsers.
     * Installation itself must still continue.
     */
  }


  window.location.assign(
    installUrl
  );
}


// ============================================================================
// INSTALLATION STATUS
// ============================================================================

/**
 * Check installation status.
 *
 * This helper is intentionally kept separate from the installation
 * redirect flow.
 *
 * If the backend does not expose a status endpoint in the current
 * V1 deployment, callers should handle the resulting 404 gracefully.
 */

export async function getInstallationStatus(
  shopInput?: string
): Promise<InstallationStatus> {

  const shop =
    shopInput
      ? normalizeShopDomain(
          shopInput
        )
      : undefined;


  const params =
    shop
      ? {
          shop,
        }
      : undefined;


  return apiService.get<InstallationStatus>(
    API_ENDPOINTS.installStatus,
    {
      params,
    }
  );
}


// ============================================================================
// CALLBACK PARAMETERS
// ============================================================================

/**
 * Read installation callback parameters from the current browser URL.
 *
 * Example success URL:
 *
 * /success?shop=store.myshopify.com&installed=true
 *
 * Example error:
 *
 * /install?error=access_denied
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
      params.get(
        'shop'
      ) ||
      undefined,

    installed:
      params.get(
        'installed'
      ) ||
      undefined,

    success:
      params.get(
        'success'
      ) ||
      undefined,

    trial:
      params.get(
        'trial'
      ) ||
      undefined,

    error:
      params.get(
        'error'
      ) ||
      undefined,

    errorDescription:
      params.get(
        'error_description'
      ) ||
      params.get(
        'errorDescription'
      ) ||
      undefined,
  };
}


// ============================================================================
// CALLBACK SUCCESS
// ============================================================================

export function isInstallSuccessful(
  params?: InstallCallbackParams
): boolean {

  const callback =
    params ||
    getInstallCallbackParams();


  return (
    callback.installed ===
      'true' ||
    callback.success ===
      'true'
  );
}


// ============================================================================
// CALLBACK ERROR
// ============================================================================

export function getInstallErrorMessage(
  params?:
    InstallCallbackParams
): string | null {

  const callback =
    params ||
    getInstallCallbackParams();


  if (
    !callback.error
  ) {

    return null;
  }


  /*
   * Decode common URL-encoded error text safely.
   */

  const rawMessage =
    callback.errorDescription ||
    callback.error;


  try {

    return decodeURIComponent(
      rawMessage
    );

  } catch {

    return rawMessage;
  }
}


// ============================================================================
// STORED SHOP
// ============================================================================

/**
 * Return the shop saved before installation.
 */

export function getStoredInstallShop():
  string | null {

  if (
    typeof window === 'undefined'
  ) {

    return null;
  }


  try {

    return (
      window.sessionStorage.getItem(
        'layboka_v1_install_shop'
      ) ||
      null
    );

  } catch {

    return null;
  }
}


/**
 * Remove the temporary installation shop value.
 */

export function clearStoredInstallShop():
  void {

  if (
    typeof window === 'undefined'
  ) {

    return;
  }


  try {

    window.sessionStorage.removeItem(
      'layboka_v1_install_shop'
    );

  } catch {
    // Ignore storage failures.
  }
}


// ============================================================================
// DEFAULT EXPORT
// ============================================================================

const installService = {

  normalizeShopDomain,

  isShopifyHostedDomain,

  isShopifyDomain,

  getInstallUrl,

  startShopifyInstall,

  redirectToShopify,

  getInstallationStatus,

  getInstallCallbackParams,

  isInstallSuccessful,

  getInstallErrorMessage,

  getStoredInstallShop,

  clearStoredInstallShop,
};


export default installService;
