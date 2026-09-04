/**
 * ============================================================================
 * LaybokaV1 — V1
 * Installation Service
 * ============================================================================
 *
 * File:
 * frontend/src/services/install.service.ts
 *
 * Purpose:
 * - Validate Shopify store URL
 * - Normalize Shopify store domain
 * - Start Shopify OAuth installation
 * - Check installation status
 * - Read installation result
 * - Handle installation errors
 *
 * V1 installation flow:
 *
 * Frontend
 *    ↓
 * GET /v1/install?shop=example.myshopify.com
 *    ↓
 * Backend Shopify OAuth
 *    ↓
 * Shopify
 *    ↓
 * GET /v1/install/callback
 *    ↓
 * Backend completes installation
 *    ↓
 * Frontend dashboard
 *
 * ============================================================================
 */

'use client';

import {
  API_ENDPOINTS,
  getInstallApiUrl,
} from '@/lib/config';

import apiService from './api.service';


// ============================================================================
// TYPES
// ============================================================================

export interface InstallResponse {

  success?: boolean;

  message?: string;

  shop?: string;

  installed?: boolean;

  token?: string;

  redirect?: string;

  [key: string]: unknown;
}


export interface InstallationStatus {

  success?: boolean;

  installed: boolean;

  installStatus:
    | 'pending'
    | 'installed'
    | 'uninstalled'
    | 'failed'
    | 'unknown';

  shop?: {

    id?: string;

    domain?: string;

    name?: string;

  };

  aiEnabled?: boolean;

  chatbotEnabled?: boolean;

  subscriptionStatus?: string;

  trialStartedAt?: string | null;

  trialEndsAt?: string | null;

  message?: string;

}


export interface InstallOptions {

  shop: string;

}


// ============================================================================
// NORMALIZE SHOP DOMAIN
// ============================================================================

export function normalizeShop(
  input: string
): string {

  let shop =
    input
      .trim()
      .toLowerCase();


  if (!shop) {

    return '';
  }


  /*
   * Remove protocol.
   */
  shop =
    shop.replace(
      /^https?:\/\//,
      ''
    );


  /*
   * Remove www.
   */
  shop =
    shop.replace(
      /^www\./,
      ''
    );


  /*
   * Remove path/query/hash.
   */
  shop =
    shop.split('/')[0];

  shop =
    shop.split('?')[0];

  shop =
    shop.split('#')[0];


  /*
   * Remove trailing dot.
   */
  shop =
    shop.replace(
      /\.+$/,
      ''
    );


  return shop;
}


// ============================================================================
// VALIDATE SHOP DOMAIN
// ============================================================================

export function isValidShopDomain(
  input: string
): boolean {

  const shop =
    normalizeShop(
      input
    );


  if (!shop) {

    return false;
  }


  /*
   * Shopify permanent domain.
   */
  if (
    /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(
      shop
    )
  ) {

    return true;
  }


  /*
   * Custom domain.
   *
   * The backend can resolve the store to its canonical
   * Shopify domain where supported.
   */
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(
    shop
  );

}


// ============================================================================
// GET INSTALL URL
// ============================================================================

export function getShopifyInstallUrl(
  input: string
): string {

  const shop =
    normalizeShop(
      input
    );


  if (
    !isValidShopDomain(
      shop
    )
  ) {

    throw new Error(
      'Please enter a valid Shopify store domain.'
    );

  }


  return getInstallApiUrl(
    shop
  );

}


// ============================================================================
// START INSTALLATION
// ============================================================================

export function startInstallation(
  options: InstallOptions
): void {

  const shop =
    normalizeShop(
      options.shop
    );


  if (
    !isValidShopDomain(
      shop
    )
  ) {

    throw new Error(
      'Please enter a valid Shopify store domain.'
    );

  }


  const url =
    getShopifyInstallUrl(
      shop
    );


  /*
   * OAuth must use browser navigation.
   *
   * Do not use fetch() here.
   */
  window.location.assign(
    url
  );

}


// ============================================================================
// INSTALL FROM URL
// ============================================================================

export function installFromUrl(
  storeUrl: string
): void {

  startInstallation({
    shop:
      storeUrl,
  });

}


// ============================================================================
// CHECK BACKEND
// ============================================================================

export async function checkBackend():
  Promise<boolean> {

  try {

    await apiService.get(
      API_ENDPOINTS.health,
      undefined,
      {
        timeout:
          8_000,
      }
    );


    return true;

  } catch {

    return false;
  }

}


// ============================================================================
// GET INSTALLATION STATUS
// ============================================================================

/**
 * Check whether a Shopify store is installed.
 *
 * Backend endpoint to establish:
 *
 * GET /v1/install/status?shop=example.myshopify.com
 *
 */

export async function getInstallationStatus(
  input: string
): Promise<InstallationStatus> {

  const shop =
    normalizeShop(
      input
    );


  if (
    !isValidShopDomain(
      shop
    )
  ) {

    throw new Error(
      'Please enter a valid Shopify store domain.'
    );

  }


  const response =
    await apiService.get<InstallationStatus>(
      API_ENDPOINTS.installStatus,
      {
        shop,
      },
      {
        timeout:
          10_000,
      }
    );


  return response;
}


// ============================================================================
// GET SHOP FROM CURRENT URL
// ============================================================================

export function getShopFromUrl(
  url?: string
): string | null {

  if (
    typeof window ===
      'undefined' &&
    !url
  ) {

    return null;
  }


  const source =
    url ||
    window.location.href;


  try {

    const parsed =
      new URL(
        source
      );


    const shop =
      parsed.searchParams.get(
        'shop'
      );


    if (!shop) {

      return null;
    }


    const normalized =
      normalizeShop(
        shop
      );


    return isValidShopDomain(
      normalized
    )
      ? normalized
      : null;

  } catch {

    return null;
  }

}


// ============================================================================
// GET INSTALL TOKEN
// ============================================================================

export function getInstallToken(
  url?: string
): string | null {

  if (
    typeof window ===
      'undefined' &&
    !url
  ) {

    return null;
  }


  const source =
    url ||
    window.location.href;


  try {

    const parsed =
      new URL(
        source
      );


    return (
      parsed.searchParams.get(
        'token'
      ) ||
      null
    );

  } catch {

    return null;
  }

}


// ============================================================================
// GET INSTALL ERROR
// ============================================================================

export function getInstallError(
  url?: string
): string | null {

  if (
    typeof window ===
      'undefined' &&
    !url
  ) {

    return null;
  }


  const source =
    url ||
    window.location.href;


  try {

    const parsed =
      new URL(
        source
      );


    return (
      parsed.searchParams.get(
        'error'
      ) ||
      parsed.searchParams.get(
        'error_description'
      )
    );

  } catch {

    return null;
  }

}


// ============================================================================
// CLEAR INSTALL PARAMETERS
// ============================================================================

export function clearInstallParameters():
  void {

  if (
    typeof window ===
    'undefined'
  ) {

    return;
  }


  const url =
    new URL(
      window.location.href
    );


  url.searchParams.delete(
    'shop'
  );

  url.searchParams.delete(
    'token'
  );

  url.searchParams.delete(
    'error'
  );

  url.searchParams.delete(
    'error_description'
  );


  window.history.replaceState(
    {},
    document.title,
    url.toString()
  );

}


// ============================================================================
// SERVICE OBJECT
// ============================================================================

export const installService = {

  normalizeShop,

  isValidShopDomain,

  getShopifyInstallUrl,

  startInstallation,

  installFromUrl,

  checkBackend,

  getInstallationStatus,

  getShopFromUrl,

  getInstallToken,

  getInstallError,

  clearInstallParameters,

};


// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default installService;
