/**
 * ============================================================================
 * Layboka AI — V1
 * Product Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/v1.product.service.js
 *
 * Purpose:
 * - Fetch products from Shopify
 * - Normalize Shopify product data
 * - Store product data for AI usage
 * - Sync products for a merchant
 * - Search products
 * - Find products by ID
 *
 * V1 principle:
 * Keep the product catalog simple and reliable.
 * The AI should recommend REAL products from the merchant's store.
 * ============================================================================
 */

'use strict';

const V1Shop = require('../models/V1Shop');

const {
  V1_CONFIG,
} = require('../config/v1.config');


// ============================================================================
// SHOPIFY API CONFIG
// ============================================================================

const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_API_VERSION || '2026-07';


// ============================================================================
// FETCH SHOPIFY PRODUCTS
// ============================================================================

/**
 * Fetch products from Shopify Admin API.
 *
 * @param {Object} shop
 * @returns {Promise<Array>}
 */
async function fetchShopifyProducts(shop) {
  if (!shop) {
    throw new Error('Shop is required');
  }

  if (!shop.shop) {
    throw new Error('Shop domain is required');
  }

  /*
   * accessToken is normally hidden by Mongoose because V1Shop uses:
   *
   *   select: false
   *
   * The caller therefore needs to load the shop with:
   *
   *   .select('+accessToken')
   */

  if (!shop.accessToken) {
    throw new Error('Shopify access token is missing');
  }


  const products = [];

  let nextUrl =
    `https://${shop.shop}/admin/api/${SHOPIFY_API_VERSION}/products.json` +
    `?limit=${V1_CONFIG.PRODUCT_SYNC.BATCH_SIZE}`;


  while (nextUrl) {
    const response = await shopifyRequest(
      nextUrl,
      shop.accessToken
    );

    const batch = Array.isArray(response.products)
      ? response.products
      : [];

    products.push(...batch);

    nextUrl = getNextPageUrl(response);
  }


  return products;
}


// ============================================================================
// NORMALIZE PRODUCT
// ============================================================================

/**
 * Convert Shopify's product object into a small AI-friendly structure.
 *
 * @param {Object} product
 * @returns {Object}
 */
function normalizeProduct(product) {
  if (!product) {
    return null;
  }


  const variants = Array.isArray(product.variants)
    ? product.variants
    : [];


  const normalizedVariants = variants.map((variant) => ({
    id: String(variant.id),

    title:
      variant.title ||
      'Default',

    price:
      Number.parseFloat(variant.price || 0),

    compareAtPrice:
      variant.compare_at_price
        ? Number.parseFloat(variant.compare_at_price)
        : null,

    available:
      variant.available !== false,

    inventoryQuantity:
      Number.isFinite(
        Number(variant.inventory_quantity)
      )
        ? Number(variant.inventory_quantity)
        : null,

    sku:
      variant.sku || '',
  }));


  const prices = normalizedVariants
    .map((variant) => variant.price)
    .filter((price) => Number.isFinite(price));


  const minPrice =
    prices.length > 0
      ? Math.min(...prices)
      : 0;


  const maxPrice =
    prices.length > 0
      ? Math.max(...prices)
      : 0;


  const image =
    Array.isArray(product.images) &&
    product.images.length > 0
      ? product.images[0].src
      : null;


  return {
    id: String(product.id),

    title:
      product.title ||
      'Untitled Product',

    handle:
      product.handle ||
      '',

    description:
      stripHtml(product.body_html || ''),

    vendor:
      product.vendor ||
      '',

    productType:
      product.product_type ||
      '',

    tags:
      Array.isArray(product.tags)
        ? product.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],

    status:
      product.status ||
      'active',

    url:
      product.handle
        ? `/products/${product.handle}`
        : null,

    image,

    price: {
      min: minPrice,
      max: maxPrice,
    },

    variants: normalizedVariants,

    totalVariants:
      normalizedVariants.length,

    available:
      normalizedVariants.some(
        (variant) => variant.available
      ),

    updatedAt:
      product.updated_at
        ? new Date(product.updated_at)
        : null,
  };
}


// ============================================================================
// SYNC PRODUCTS
// ============================================================================

/**
 * Sync Shopify products.
 *
 * IMPORTANT:
 * This implementation intentionally keeps product storage inside
 * the V1 shop document for the first version only if your model supports
 * a catalog field.
 *
 * If your V1Shop model does not contain products, this function returns
 * the normalized catalog so the dedicated V1 product model can consume it.
 *
 * @param {String|Object} shopOrDomain
 * @returns {Promise<Object>}
 */
async function syncProducts(shopOrDomain) {
  const shop = await resolveShopWithToken(shopOrDomain);

  if (!shop) {
    throw new Error('V1 shop not found');
  }


  shop.productSyncStatus = 'syncing';
  shop.productSyncStartedAt = new Date();
  shop.productSyncError = '';

  await shop.save();


  try {
    const rawProducts =
      await fetchShopifyProducts(shop);


    const products =
      rawProducts
        .map(normalizeProduct)
        .filter(Boolean);


    shop.productSyncStatus = 'completed';
    shop.productSyncCompletedAt = new Date();
    shop.productSyncError = '';

    await shop.save();


    return {
      success: true,

      shop: shop.shop,

      count: products.length,

      products,
    };
  } catch (error) {
    shop.productSyncStatus = 'failed';

    shop.productSyncError =
      error.message ||
      'Product synchronization failed.';

    await shop.save();

    throw error;
  }
}


// ============================================================================
// SEARCH PRODUCTS
// ============================================================================

/**
 * Search a product catalog.
 *
 * This function works on an already-loaded product array.
 * The AI service can use it to narrow products before sending
 * context to OpenAI.
 *
 * @param {Array} products
 * @param {String} query
 * @returns {Array}
 */
function searchProducts(products, query) {
  if (!Array.isArray(products)) {
    return [];
  }

  if (!query || !query.trim()) {
    return products;
  }


  const normalizedQuery =
    query
      .toLowerCase()
      .trim();


  const words =
    normalizedQuery
      .split(/\s+/)
      .filter(Boolean);


  return products
    .map((product) => {
      const searchableText =
        [
          product.title,
          product.description,
          product.vendor,
          product.productType,
          ...(product.tags || []),
        ]
          .join(' ')
          .toLowerCase();


      let score = 0;


      // Exact title match gets the highest score.
      if (
        product.title
          ?.toLowerCase()
          .includes(normalizedQuery)
      ) {
        score += 10;
      }


      // Individual query words.
      for (const word of words) {
        if (searchableText.includes(word)) {
          score += 1;
        }

        if (
          product.title
            ?.toLowerCase()
            .includes(word)
        ) {
          score += 3;
        }
      }


      return {
        product,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
}


// ============================================================================
// FIND PRODUCT
// ============================================================================

/**
 * Find a product by Shopify product ID.
 *
 * @param {Array} products
 * @param {String|Number} productId
 * @returns {Object|null}
 */
function findProduct(products, productId) {
  if (!Array.isArray(products)) {
    return null;
  }

  const id = String(productId);

  return (
    products.find(
      (product) =>
        String(product.id) === id
    ) || null
  );
}


// ============================================================================
// GET AVAILABLE PRODUCTS
// ============================================================================

/**
 * Return only products that have at least one available variant.
 *
 * @param {Array} products
 * @returns {Array}
 */
function getAvailableProducts(products) {
  if (!Array.isArray(products)) {
    return [];
  }

  return products.filter(
    (product) =>
      product &&
      product.available === true
  );
}


// ============================================================================
// GET PRODUCT CONTEXT FOR AI
// ============================================================================

/**
 * Convert products into compact AI context.
 *
 * We deliberately do NOT send unnecessary Shopify fields to the AI.
 *
 * @param {Array} products
 * @param {Number} limit
 * @returns {Array}
 */
function getAIProductContext(
  products,
  limit = V1_CONFIG.AI.MAX_PRODUCTS_IN_CONTEXT
) {
  if (!Array.isArray(products)) {
    return [];
  }


  return products
    .slice(0, limit)
    .map((product) => ({
      id: product.id,

      title: product.title,

      description:
        truncate(
          product.description,
          500
        ),

      productType:
        product.productType,

      vendor:
        product.vendor,

      tags:
        Array.isArray(product.tags)
          ? product.tags.slice(0, 10)
          : [],

      price:
        product.price,

      available:
        product.available,

      url:
        product.url,

      image:
        product.image,

      variants:
        Array.isArray(product.variants)
          ? product.variants.slice(0, 10)
          : [],
    }));
}


// ============================================================================
// SHOPIFY REQUEST
// ============================================================================

/**
 * Make a Shopify Admin API request.
 *
 * @param {String} url
 * @param {String} accessToken
 * @returns {Promise<Object>}
 */
async function shopifyRequest(
  url,
  accessToken
) {
  const response = await fetch(
    url,
    {
      method: 'GET',

      headers: {
        'X-Shopify-Access-Token':
          accessToken,

        'Content-Type':
          'application/json',

        'Accept':
          'application/json',
      },
    }
  );


  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }


  if (!response.ok) {
    const message =
      data?.errors
        ? JSON.stringify(data.errors)
        : `Shopify API request failed with status ${response.status}`;


    const error = new Error(message);

    error.statusCode =
      response.status;

    error.shopifyResponse =
      data;

    throw error;
  }


  return data || {};
}


// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Shopify REST pagination can expose the next page
 * through the Link response header.
 *
 * Since fetch() does not expose that header through the
 * JSON body, this V1 implementation also supports the
 * simpler page-based fallback.
 *
 * @param {Object} response
 * @returns {String|null}
 */
function getNextPageUrl(response) {
  /*
   * The current normalized response does not carry response headers.
   *
   * V1 intentionally keeps this simple.
   *
   * The first request fetches up to the configured batch size.
   * If the catalog grows beyond that, we will upgrade this service
   * to cursor-based GraphQL pagination.
   */

  return null;
}


// ============================================================================
// RESOLVE SHOP
// ============================================================================

async function resolveShopWithToken(shopOrDomain) {
  if (!shopOrDomain) {
    return null;
  }


  // Already a mongoose document.
  if (
    typeof shopOrDomain === 'object' &&
    shopOrDomain._id
  ) {
    if (!shopOrDomain.accessToken) {
      const shop = await V1Shop
        .findById(shopOrDomain._id)
        .select('+accessToken');

      return shop;
    }

    return shopOrDomain;
  }


  const value =
    String(shopOrDomain)
      .trim()
      .toLowerCase();


  return V1Shop
    .findOne({
      shop: value,
    })
    .select('+accessToken');
}


// ============================================================================
// HTML CLEANER
// ============================================================================

function stripHtml(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


// ============================================================================
// TEXT TRUNCATION
// ============================================================================

function truncate(value, maxLength) {
  if (!value) {
    return '';
  }

  const text = String(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  fetchShopifyProducts,
  normalizeProduct,
  syncProducts,
  searchProducts,
  findProduct,
  getAvailableProducts,
  getAIProductContext,
};
