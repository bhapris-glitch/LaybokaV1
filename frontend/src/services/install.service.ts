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
 * - Build Shopify installation URL
 * - Start Shopify OAuth installation
 * - Validate Shopify store domains
 * - Extract shop parameter
 *
 * V1 flow:
 *
 * Frontend
 *    ↓
 * /v1/install?shop=store.myshopify.com
 *    ↓
 * Backend
 *    ↓
 * Shopify OAuth
 *    ↓
 * /v1/install/callback
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

  [key: string]: unknown;

}


export interface InstallOptions {

  /**
   * Shopify store domain.
   *
   * Examples:
   * - example.myshopify.com
   * - https://example.myshopify.com
   * - https://example.com
   */
  shop: string;

}


// ============================================================================
// SHOP DOMAIN NORMALIZATION
// ============================================================================

function normalizeShopDomain(
  shop: string
): string {

  let value =
    shop.trim().toLowerCase();


  /*
   * Remove protocol.
   */
  value =
    value.replace(
      /^https?:\/\//,
      ''
    );


  /*
   * Remove www.
   */
  value =
    value.replace(
      /^www\./,
      ''
    );


  /*
   * Remove path, query and hash.
   */
  value =
    value.split('/')[0];

  value =
    value.split('?')[0];

  value =
    value.split('#')[0];


  /*
   * Remove trailing dot.
   */
  value =
    value.replace(
      /\.+$/,
      ''
    );


  return value;
}


// ============================================================================
// VALIDATE SHOP DOMAIN
// ============================================================================

export function isValidShopDomain(
  shop: string
): boolean {

  const normalized =
    normalizeShopDomain(
      shop
    );


  if (!normalized) {

    return false;
  }


  /*
   * Standard Shopify permanent domain.
   */
  if (
    /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(
      normalized
    )
  ) {

    return true;
  }


  /*
   * Custom domains are accepted by the V1
   * installation form and resolved by the backend.
   *
   * We intentionally keep this validation broad.
   */
  return (
    /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(
      normalized
    )
  );

}


// ============================================================================
// NORMALIZE SHOP
// ============================================================================

export function normalizeShop(
  shop: string
): string {

  return normalizeShopDomain(
    shop
  );

}


// ============================================================================
// GET INSTALL URL
// ============================================================================

export function getShopifyInstallUrl(
  shop: string
): string {

  const normalized =
    normalizeShopDomain(
      shop
    );


  if (
    !isValidShopDomain(
      normalized
    )
  ) {

    throw new Error(
      'Please enter a valid Shopify store domain.'
    );

  }


  return getInstallApiUrl(
    normalized
  );

}


// ============================================================================
// START INSTALLATION
// ============================================================================

export function startInstallation(
  options: InstallOptions
): void {

  const shop =
    normalizeShopDomain(
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


  const installUrl =
    getShopifyInstallUrl(
      shop
    );


  /*
   * OAuth must be started by browser navigation.
   *
   * Do NOT use fetch() here.
   *
   * The backend responds with the Shopify OAuth redirect.
   */
  window.location.assign(
    installUrl
  );

}


// ============================================================================
// INSTALL USING STORE URL
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
      normalizeShopDomain(
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

  getShopFromUrl,

  getInstallError,

  clearInstallParameters,

};


// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default installService;
