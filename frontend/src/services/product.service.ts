/**
 * ============================================================================
 * Layboka AI — V1
 * Product Service
 * ============================================================================
 *
 * File:
 * frontend/src/services/product.service.ts
 *
 * Purpose:
 * - Retrieve Shopify products through the Layboka backend
 * - Search products
 * - Retrieve a single product
 * - Retrieve featured products
 *
 * IMPORTANT:
 * The frontend never connects directly to Shopify Admin API.
 * Shopify credentials and access tokens remain on the backend.
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


export interface ProductListResponse {

  success?: boolean;

  products?: Product[];

  data?: Product[];

  total?: number;

  page?: number;

  limit?: number;

  hasMore?: boolean;

  [key: string]: unknown;
}


export interface ProductResponse {

  success?: boolean;

  product?: Product;

  data?: Product;

  message?: string;

  [key: string]: unknown;
}


// ============================================================================
// GET PRODUCTS
// ============================================================================

export async function getProducts(
  params?: {
    shop?: string;

    page?: number;

    limit?: number;

    search?: string;

    query?: string;

    collection?: string;

    productType?: string;

    available?: boolean;
  }
): Promise<ProductListResponse> {

  return await apiService.get<ProductListResponse>(
    '/products',
    {
      params,
    }
  );
}


// ============================================================================
// SEARCH PRODUCTS
// ============================================================================

export async function searchProducts(
  query: string,
  options?: {
    shop?: string;

    limit?: number;

    page?: number;
  }
): Promise<ProductListResponse> {

  const search =
    query.trim();


  if (
    !search
  ) {

    return {
      success:
        true,

      products:
        [],

      total:
        0,
    };
  }


  return await getProducts({

    shop:
      options?.shop,

    search,

    limit:
      options?.limit ||
      20,

    page:
      options?.page ||
      1,
  });
}


// ============================================================================
// GET SINGLE PRODUCT
// ============================================================================

export async function getProduct(
  productId: string,
  shop?: string
): Promise<Product | null> {

  if (
    !productId
  ) {

    throw new Error(
      'Product ID is required.'
    );
  }


  const response =
    await apiService.get<ProductResponse>(
      `/products/${encodeURIComponent(productId)}`,
      {
        params:
          shop
            ? {
                shop,
              }
            : undefined,
      }
    );


  return (
    response.product ||
    response.data ||
    null
  );
}


// ============================================================================
// GET FEATURED PRODUCTS
// ============================================================================

export async function getFeaturedProducts(
  params?: {
    shop?: string;

    limit?: number;
  }
): Promise<Product[]> {

  const response =
    await apiService.get<ProductListResponse>(
      '/products/featured',
      {
        params,
      }
    );


  return (
    response.products ||
    response.data ||
    []
  );
}


// ============================================================================
// PRODUCT URL
// ============================================================================

export function getProductUrl(
  product: Product
): string | null {

  if (
    product.url
  ) {

    return product.url;
  }


  if (
    product.handle
  ) {

    /*
     * This is only a fallback.
     *
     * For the merchant's actual storefront domain,
     * the backend should ideally provide the canonical URL.
     */

    return `/products/${product.handle}`;
  }


  return null;
}


// ============================================================================
// DISPLAY PRICE
// ============================================================================

export function formatProductPrice(
  product: Product,
  fallbackCurrency = 'USD'
): string {

  const rawPrice =
    product.price;


  if (
    rawPrice === undefined ||
    rawPrice === null ||
    rawPrice === ''
  ) {

    return 'Price unavailable';
  }


  const numericPrice =
    Number(rawPrice);


  if (
    !Number.isFinite(numericPrice)
  ) {

    return String(rawPrice);
  }


  const currency =
    product.currency ||
    fallbackCurrency;


  try {

    return new Intl.NumberFormat(
      undefined,
      {
        style:
          'currency',

        currency,
      }
    ).format(
      numericPrice
    );

  } catch {

    return `${currency} ${numericPrice.toFixed(2)}`;
  }
}


// ============================================================================
// PRODUCT AVAILABILITY
// ============================================================================

export function isProductAvailable(
  product: Product
): boolean {

  if (
    product.available === false
  ) {

    return false;
  }


  if (
    typeof product.inventoryQuantity === 'number' &&
    product.inventoryQuantity <= 0
  ) {

    return false;
  }


  return true;
}


// ============================================================================
// IMAGE HELPER
// ============================================================================

export function getProductImage(
  product: Product
): string | null {

  if (
    product.image
  ) {

    return product.image;
  }


  if (
    product.imageUrl
  ) {

    return product.imageUrl;
  }


  if (
    Array.isArray(product.images) &&
    product.images.length > 0
  ) {

    return product.images[0];
  }


  return null;
}


// ============================================================================
// SAFE PRODUCT SEARCH
// ============================================================================
//
// Product loading should not crash the entire storefront/dashboard.
//

export async function safeSearchProducts(
  query: string,
  options?: {
    shop?: string;

    limit?: number;
  }
): Promise<Product[]> {

  try {

    const response =
      await searchProducts(
        query,
        options
      );


    return (
      response.products ||
      response.data ||
      []
    );

  } catch (error) {

    console.warn(
      '[Layboka Products] Search failed:',
      error
    );


    return [];
  }
}


// ============================================================================
// EXPORT DEFAULT
// ============================================================================

const productService = {

  getProducts,

  searchProducts,

  getProduct,

  getFeaturedProducts,

  getProductUrl,

  formatProductPrice,

  isProductAvailable,

  getProductImage,

  safeSearchProducts,
};


export default productService;
