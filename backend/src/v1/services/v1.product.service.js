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
 * - Sync Shopify products
 * - Keep V1Product collection updated
 * - Search products
 * - Build AI product context
 * - Generate product recommendations
 *
 * Shopify access tokens are obtained through:
 * v1.shopify-token.service.js
 *
 * ============================================================================
 */

'use strict';

const V1Shop = require('../models/V1Shop');
const V1Product = require('../models/V1Product');
const { V1_CONFIG } = require('../config/v1.config');

const {
  getValidAccessToken,
  normalizeShop,
} = require('./v1.shopify-token.service');


// ============================================================================
// CONFIG
// ============================================================================

const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_API_VERSION || '2026-07';

const DEFAULT_PAGE_SIZE =
  Number(V1_CONFIG.PRODUCT_SYNC?.PAGE_SIZE) || 250;

const MAX_PRODUCTS =
  Number(V1_CONFIG.PRODUCT_SYNC?.MAX_PRODUCTS) || 10000;


// ============================================================================
// SHOPIFY REQUEST
// ============================================================================

async function shopifyRequest(shopOrDomain, path, options = {}) {
  const shopDomain = normalizeShop(
    typeof shopOrDomain === 'string'
      ? shopOrDomain
      : shopOrDomain.shop
  );

  if (!shopDomain) {
    throw new Error('Shopify shop domain is required');
  }

  const {
    accessToken,
  } = await getValidAccessToken(shopDomain);

  const url =
    `https://${shopDomain}/admin/api/` +
    `${SHOPIFY_API_VERSION}${path}`;

  const response = await fetch(url, {
    method: options.method || 'GET',

    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },

    body: options.body
      ? JSON.stringify(options.body)
      : undefined,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage =
      data?.errors?.message ||
      data?.errors ||
      data?.error ||
      `Shopify API request failed (${response.status})`;

    throw new Error(
      typeof errorMessage === 'string'
        ? errorMessage
        : JSON.stringify(errorMessage)
    );
  }

  return {
    data,
    headers: response.headers,
  };
}


// ============================================================================
// SHOP RESOLUTION
// ============================================================================

async function resolveShop(shopOrDomain) {
  if (!shopOrDomain) {
    throw new Error('Shop is required');
  }

  if (
    typeof shopOrDomain === 'object' &&
    shopOrDomain._id
  ) {
    return shopOrDomain;
  }

  const shopDomain =
    normalizeShop(shopOrDomain);

  const shop = await V1Shop.findOne({
    shop: shopDomain,
  });

  if (!shop) {
    throw new Error(
      `V1 shop not found: ${shopDomain}`
    );
  }

  return shop;
}


// ============================================================================
// HTML / TEXT HELPERS
// ============================================================================

function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}


function normalizeTags(tags) {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags
      .map(tag => String(tag).trim())
      .filter(Boolean);
  }

  return String(tags)
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}


function parsePrice(value) {
  const price = Number(value);

  return Number.isFinite(price)
    ? price
    : 0;
}


// ============================================================================
// NORMALIZE SHOPIFY PRODUCT
// ============================================================================

function normalizeProduct(product, shopDomain) {
  if (!product?.id) {
    throw new Error(
      'Invalid Shopify product'
    );
  }

  const variants = Array.isArray(product.variants)
    ? product.variants.map(variant => ({
        id: String(variant.id),

        title:
          variant.title ||
          'Default',

        price:
          parsePrice(variant.price),

        compareAtPrice:
          variant.compare_at_price
            ? parsePrice(variant.compare_at_price)
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
          variant.sku || null,
      }))
    : [];

  const prices = variants
    .map(variant => variant.price)
    .filter(price => price > 0);

  const minPrice =
    prices.length
      ? Math.min(...prices)
      : 0;

  const maxPrice =
    prices.length
      ? Math.max(...prices)
      : minPrice;

  const image =
    product.image?.src ||
    product.images?.[0]?.src ||
    null;

  const available =
    variants.some(
      variant => variant.available
    );

  const status =
    product.status === 'draft'
      ? 'draft'
      : product.status === 'archived'
        ? 'archived'
        : 'active';

  return {
    shop: shopDomain,

    shopifyProductId:
      String(product.id),

    title:
      String(product.title || '').trim(),

    handle:
      product.handle || null,

    description:
      stripHtml(
        product.body_html ||
        product.body ||
        ''
      ),

    vendor:
      product.vendor || null,

    productType:
      product.product_type || null,

    tags:
      normalizeTags(product.tags),

    status,

    url:
      product.handle
        ? `https://${shopDomain}/products/${product.handle}`
        : null,

    image,

    minPrice,

    maxPrice,

    available,

    variants,

    shopifyUpdatedAt:
      product.updated_at
        ? new Date(product.updated_at)
        : null,

    lastSyncedAt:
      new Date(),
  };
}


// ============================================================================
// FETCH SHOPIFY PRODUCTS
// ============================================================================

async function fetchShopifyProducts(shopOrDomain) {
  const shop = await resolveShop(shopOrDomain);

  const products = [];

  let nextPath =
    `/products.json?limit=${Math.min(
      DEFAULT_PAGE_SIZE,
      250
    )}`;

  while (
    nextPath &&
    products.length < MAX_PRODUCTS
  ) {
    const result =
      await shopifyRequest(
        shop.shop,
        nextPath
      );

    const pageProducts =
      result.data?.products || [];

    products.push(
      ...pageProducts
    );

    if (
      products.length >= MAX_PRODUCTS
    ) {
      break;
    }

    nextPath =
      getNextPageFromLinkHeader(
        result.headers
      );
  }

  return products.slice(
    0,
    MAX_PRODUCTS
  );
}


// ============================================================================
// SHOPIFY PAGINATION
// ============================================================================

function getNextPageFromLinkHeader(headers) {
  const link =
    headers?.get?.('link');

  if (!link) {
    return null;
  }

  const nextPart =
    link
      .split(',')
      .find(part =>
        part.includes('rel="next"')
      );

  if (!nextPart) {
    return null;
  }

  const match =
    nextPart.match(/<([^>]+)>/);

  if (!match) {
    return null;
  }

  try {
    const url =
      new URL(match[1]);

    return (
      url.pathname +
      url.search
    );
  } catch {
    return null;
  }
}


// ============================================================================
// SYNC PRODUCTS
// ============================================================================

async function syncProducts(shopOrDomain) {
  const shop =
    await resolveShop(shopOrDomain);

  const shopDomain =
    normalizeShop(shop.shop);

  await V1Shop.updateOne(
    { _id: shop._id },
    {
      $set: {
        productSyncStatus: 'syncing',
        productSyncError: null,
      },
    }
  );

  try {
    const shopifyProducts =
      await fetchShopifyProducts(
        shopDomain
      );

    const normalizedProducts =
      shopifyProducts.map(product =>
        normalizeProduct(
          product,
          shopDomain
        )
      );

    if (normalizedProducts.length) {
      const operations =
        normalizedProducts.map(product => ({
          updateOne: {
            filter: {
              shop: shopDomain,
              shopifyProductId:
                product.shopifyProductId,
            },

            update: {
              $set: product,
            },

            upsert: true,
          },
        }));

      await V1Product.bulkWrite(
        operations,
        {
          ordered: false,
        }
      );
    }

    /*
     * Remove products that no longer exist
     * in Shopify.
     */
    const currentIds =
      normalizedProducts.map(
        product =>
          product.shopifyProductId
      );

    if (currentIds.length) {
      await V1Product.deleteMany({
        shop: shopDomain,

        shopifyProductId: {
          $nin: currentIds,
        },
      });
    } else {
      /*
       * If Shopify currently has zero products,
       * clear the V1 catalog.
       */
      await V1Product.deleteMany({
        shop: shopDomain,
      });
    }

    await V1Shop.updateOne(
      { _id: shop._id },
      {
        $set: {
          productSyncStatus: 'completed',
          productSyncError: null,
          lastProductSyncAt: new Date(),
        },
      }
    );

    return {
      success: true,
      count: normalizedProducts.length,
    };
  } catch (error) {
    await V1Shop.updateOne(
      { _id: shop._id },
      {
        $set: {
          productSyncStatus: 'failed',
          productSyncError:
            error.message,
        },
      }
    );

    throw error;
  }
}


// ============================================================================
// UPSERT SINGLE PRODUCT
// ============================================================================

async function upsertProduct(
  shopOrDomain,
  shopifyProduct
) {
  const shopDomain =
    normalizeShop(
      typeof shopOrDomain === 'string'
        ? shopOrDomain
        : shopOrDomain.shop
    );

  const normalized =
    normalizeProduct(
      shopifyProduct,
      shopDomain
    );

  return V1Product.findOneAndUpdate(
    {
      shop: shopDomain,

      shopifyProductId:
        normalized.shopifyProductId,
    },

    {
      $set: normalized,
    },

    {
      new: true,
      upsert: true,
    }
  );
}


// ============================================================================
// DELETE PRODUCT
// ============================================================================

async function deleteProduct(
  shopOrDomain,
  shopifyProductId
) {
  const shopDomain =
    normalizeShop(
      typeof shopOrDomain === 'string'
        ? shopOrDomain
        : shopOrDomain.shop
    );

  return V1Product.deleteOne({
    shop: shopDomain,

    shopifyProductId:
      String(shopifyProductId),
  });
}


// ============================================================================
// GET PRODUCTS
// ============================================================================

async function getProducts(
  shopOrDomain,
  options = {}
) {
  const shopDomain =
    normalizeShop(
      typeof shopOrDomain === 'string'
        ? shopOrDomain
        : shopOrDomain.shop
    );

  const limit =
    Math.min(
      Number(options.limit) || 20,
      100
    );

  const skip =
    Math.max(
      Number(options.skip) || 0,
      0
    );

  const filter = {
    shop: shopDomain,
  };

  if (options.activeOnly !== false) {
    filter.status = 'active';
  }

  return V1Product.find(filter)
    .sort({
      lastSyncedAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
}


// ============================================================================
// GET PRODUCT
// ============================================================================

async function getProduct(
  shopOrDomain,
  productId
) {
  const shopDomain =
    normalizeShop(
      typeof shopOrDomain === 'string'
        ? shopOrDomain
        : shopOrDomain.shop
    );

  return V1Product.findOne({
    shop: shopDomain,

    $or: [
      {
        _id: productId,
      },
      {
        shopifyProductId:
          String(productId),
      },
    ],
  }).lean();
}


// ============================================================================
// SEARCH PRODUCTS
// ============================================================================

async function searchProducts(
  shopOrDomain,
  query,
  options = {}
) {
  const shopDomain =
    normalizeShop(
      typeof shopOrDomain === 'string'
        ? shopOrDomain
        : shopOrDomain.shop
    );

  const limit =
    Math.min(
      Number(options.limit) || 10,
      50
    );

  const search =
    String(query || '')
      .trim();

  if (!search) {
    return getProducts(
      shopDomain,
      {
        limit,
      }
    );
  }

  const regex =
    new RegExp(
      escapeRegex(search),
      'i'
    );

  return V1Product.find({
    shop: shopDomain,

    status: 'active',

    $or: [
      {
        title: regex,
      },
      {
        description: regex,
      },
      {
        vendor: regex,
      },
      {
        productType: regex,
      },
      {
        tags: regex,
      },
    ],
  })
    .limit(limit)
    .lean();
}


// ============================================================================
// AI PRODUCT CONTEXT
// ============================================================================

async function getAIProductContext(
  shopOrDomain,
  options = {}
) {
  const products =
    options.query
      ? await searchProducts(
          shopOrDomain,
          options.query,
          options
        )
      : await getProducts(
          shopOrDomain,
          {
            limit:
              options.limit || 20,
          }
        );

  return products.map(
    product => ({
      id:
        product.shopifyProductId,

      title:
        product.title,

      description:
        product.description,

      vendor:
        product.vendor,

      productType:
        product.productType,

      tags:
        product.tags,

      price:
        product.minPrice,

      maxPrice:
        product.maxPrice,

      available:
        product.available,

      url:
        product.url,

      image:
        product.image,

      variants:
        product.variants,
    })
  );
}


// ============================================================================
// RECOMMENDATIONS
// ============================================================================

async function getRecommendations(
  shopOrDomain,
  product,
  options = {}
) {
  const shopDomain =
    normalizeShop(
      typeof shopOrDomain === 'string'
        ? shopOrDomain
        : shopOrDomain.shop
    );

  const currentProduct =
    typeof product === 'object'
      ? product
      : await getProduct(
          shopDomain,
          product
        );

  if (!currentProduct) {
    return [];
  }

  const limit =
    Math.min(
      Number(options.limit) || 4,
      10
    );

  const candidates =
    await V1Product.find({
      shop: shopDomain,

      status: 'active',

      available: true,

      shopifyProductId: {
        $ne:
          currentProduct.shopifyProductId,
      },

      $or: [
        ...(currentProduct.productType
          ? [
              {
                productType:
                  currentProduct.productType,
              },
            ]
          : []),

        ...(currentProduct.vendor
          ? [
              {
                vendor:
                  currentProduct.vendor,
              },
            ]
          : []),

        ...(Array.isArray(
          currentProduct.tags
        ) &&
        currentProduct.tags.length
          ? [
              {
                tags: {
                  $in:
                    currentProduct.tags,
                },
              },
            ]
          : []),
      ],
    })
      .limit(30)
      .lean();

  /*
   * Simple deterministic relevance score.
   * OpenAI does not decide which products exist.
   */
  const scored =
    candidates.map(candidate => {
      let score = 0;

      if (
        currentProduct.productType &&
        candidate.productType ===
          currentProduct.productType
      ) {
        score += 5;
      }

      if (
        currentProduct.vendor &&
        candidate.vendor ===
          currentProduct.vendor
      ) {
        score += 3;
      }

      const currentTags =
        new Set(
          currentProduct.tags || []
        );

      const sharedTags =
        (candidate.tags || [])
          .filter(tag =>
            currentTags.has(tag)
          ).length;

      score +=
        Math.min(
          sharedTags * 2,
          6
        );

      return {
        ...candidate,
        _score: score,
      };
    });

  return scored
    .sort(
      (a, b) =>
        b._score - a._score
    )
    .slice(0, limit)
    .map(
      ({
        _score,
        ...product
      }) => product
    );
}


// ============================================================================
// REGEX SAFETY
// ============================================================================

function escapeRegex(value) {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  shopifyRequest,
  resolveShop,
  fetchShopifyProducts,
  normalizeProduct,
  syncProducts,
  upsertProduct,
  deleteProduct,
  getProducts,
  getProduct,
  searchProducts,
  getAIProductContext,
  getRecommendations,
};
