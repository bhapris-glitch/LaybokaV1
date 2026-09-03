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
 * - Upsert products into V1Product
 * - Remove products deleted from Shopify
 * - Search merchant products
 * - Retrieve AI-ready product context
 *
 * IMPORTANT:
 * Every product query is scoped to the merchant's shop domain.
 * ============================================================================
 */

'use strict';

const V1Shop = require('../models/V1Shop');
const V1Product = require('../models/V1Product');

const {
  V1_CONFIG,
} = require('../config/v1.config');


// ============================================================================
// CONFIG
// ============================================================================

const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_API_VERSION || '2026-07';

const DEFAULT_PAGE_SIZE =
  Number(
    V1_CONFIG?.PRODUCT_SYNC?.BATCH_SIZE
  ) || 100;


// ============================================================================
// FETCH ALL SHOPIFY PRODUCTS
// ============================================================================

/**
 * Fetch all products from Shopify Admin REST API.
 *
 * Uses cursor pagination through the Link response header.
 *
 * @param {Object} shop
 * @returns {Promise<Array>}
 */
async function fetchShopifyProducts(shop) {
  if (!shop) {
    throw new Error('Shop is required.');
  }

  if (!shop.shop) {
    throw new Error('Shop domain is required.');
  }

  if (!shop.accessToken) {
    throw new Error(
      'Shopify access token is missing.'
    );
  }


  const products = [];

  let url =
    `https://${shop.shop}` +
    `/admin/api/${SHOPIFY_API_VERSION}` +
    `/products.json` +
    `?limit=${Math.min(DEFAULT_PAGE_SIZE, 250)}`;


  while (url) {
    const result =
      await shopifyRequest(
        url,
        shop.accessToken
      );

    const batch =
      Array.isArray(result.data?.products)
        ? result.data.products
        : [];


    products.push(...batch);


    url =
      getNextPageUrl(
        result.linkHeader
      );


    /*
     * Safety protection.
     *
     * A corrupted pagination header should never
     * cause an infinite synchronization loop.
     */
    if (
      products.length >
      getMaximumSyncProducts()
    ) {
      throw new Error(
        `Product synchronization exceeded the maximum configured limit of ${getMaximumSyncProducts()} products.`
      );
    }
  }


  return products;
}


// ============================================================================
// NORMALIZE SHOPIFY PRODUCT
// ============================================================================

/**
 * Convert Shopify product data into V1Product format.
 *
 * @param {Object} product
 * @param {String} shopDomain
 * @returns {Object|null}
 */
function normalizeProduct(
  product,
  shopDomain
) {
  if (!product) {
    return null;
  }


  if (!product.id) {
    return null;
  }


  const variants =
    Array.isArray(product.variants)
      ? product.variants
      : [];


  const normalizedVariants =
    variants.map(
      (variant) => ({
        id:
          String(variant.id),

        title:
          variant.title ||
          'Default',

        price:
          parsePrice(
            variant.price
          ),

        compareAtPrice:
          variant.compare_at_price
            ? parsePrice(
                variant.compare_at_price
              )
            : null,

        available:
          variant.available !== false,

        inventoryQuantity:
          Number.isFinite(
            Number(
              variant.inventory_quantity
            )
          )
            ? Number(
                variant.inventory_quantity
              )
            : null,

        sku:
          variant.sku ||
          '',
      })
    );


  const prices =
    normalizedVariants
      .map(
        (variant) =>
          variant.price
      )
      .filter(
        (price) =>
          Number.isFinite(price)
      );


  const minPrice =
    prices.length
      ? Math.min(...prices)
      : 0;


  const maxPrice =
    prices.length
      ? Math.max(...prices)
      : 0;


  const images =
    Array.isArray(product.images)
      ? product.images
      : [];


  const image =
    images.length
      ? images[0]?.src || ''
      : '';


  const tags =
    typeof product.tags === 'string'
      ? product.tags
          .split(',')
          .map(
            (tag) =>
              tag.trim()
          )
          .filter(Boolean)
      : Array.isArray(product.tags)
        ? product.tags
        : [];


  const available =
    normalizedVariants.some(
      (variant) =>
        variant.available === true
    );


  return {
    shop:
      String(shopDomain)
        .trim()
        .toLowerCase(),

    shopifyProductId:
      String(product.id),

    title:
      product.title ||
      'Untitled Product',

    handle:
      product.handle ||
      '',

    description:
      stripHtml(
        product.body_html ||
        ''
      ),

    vendor:
      product.vendor ||
      '',

    productType:
      product.product_type ||
      '',

    tags,

    status:
      normalizeStatus(
        product.status
      ),

    url:
      product.handle
        ? `/products/${product.handle}`
        : '',

    image,

    minPrice,

    maxPrice,

    available,

    variants:
      normalizedVariants,

    shopifyUpdatedAt:
      product.updated_at
        ? new Date(
            product.updated_at
          )
        : null,

    lastSyncedAt:
      new Date(),
  };
}


// ============================================================================
// SYNC PRODUCTS
// ============================================================================

/**
 * Complete merchant product synchronization.
 *
 * Process:
 *
 * 1. Load merchant
 * 2. Mark sync as running
 * 3. Fetch Shopify products
 * 4. Normalize products
 * 5. Upsert every product
 * 6. Remove products no longer present in Shopify
 * 7. Mark sync complete
 *
 * @param {String|Object} shopOrDomain
 * @returns {Promise<Object>}
 */
async function syncProducts(
  shopOrDomain
) {
  const shop =
    await resolveShopWithToken(
      shopOrDomain
    );


  if (!shop) {
    throw new Error(
      'V1 shop not found.'
    );
  }


  const syncStartedAt =
    new Date();


  shop.productSyncStatus =
    'syncing';

  shop.productSyncStartedAt =
    syncStartedAt;

  shop.productSyncError =
    '';


  await shop.save();


  try {
    // ------------------------------------------------------------------------
    // Fetch Shopify catalog
    // ------------------------------------------------------------------------

    const rawProducts =
      await fetchShopifyProducts(
        shop
      );


    // ------------------------------------------------------------------------
    // Normalize
    // ------------------------------------------------------------------------

    const products =
      rawProducts
        .map(
          (product) =>
            normalizeProduct(
              product,
              shop.shop
            )
        )
        .filter(Boolean);


    // ------------------------------------------------------------------------
    // Upsert products
    // ------------------------------------------------------------------------

    let created = 0;
    let updated = 0;


    if (products.length > 0) {
      const operations =
        products.map(
          (product) => ({
            updateOne: {
              filter: {
                shop:
                  product.shop,

                shopifyProductId:
                  product.shopifyProductId,
              },

              update: {
                $set:
                  product,
              },

              upsert: true,
            },
          })
        );


      const result =
        await V1Product.bulkWrite(
          operations,
          {
            ordered: false,
          }
        );


      created =
        result.upsertedCount || 0;

      updated =
        result.modifiedCount || 0;
    }


    // ------------------------------------------------------------------------
    // Remove products no longer present in Shopify
    // ------------------------------------------------------------------------

    const shopifyIds =
      products.map(
        (product) =>
          product.shopifyProductId
      );


    const deleteFilter =
      shopifyIds.length
        ? {
            shop:
              shop.shop,

            shopifyProductId: {
              $nin:
                shopifyIds,
            },
          }
        : {
            shop:
              shop.shop,
          };


    const deleteResult =
      await V1Product.deleteMany(
        deleteFilter
      );


    // ------------------------------------------------------------------------
    // Update shop sync status
    // ------------------------------------------------------------------------

    shop.productSyncStatus =
      'completed';

    shop.productSyncCompletedAt =
      new Date();

    shop.productSyncError =
      '';

    await shop.save();


    return {
      success: true,

      shop:
        shop.shop,

      count:
        products.length,

      created,

      updated,

      removed:
        deleteResult.deletedCount || 0,

      completedAt:
        shop.productSyncCompletedAt,
    };
  } catch (error) {
    // ------------------------------------------------------------------------
    // Sync failed
    // ------------------------------------------------------------------------

    shop.productSyncStatus =
      'failed';

    shop.productSyncError =
      error.message ||
      'Product synchronization failed.';

    await shop.save();


    throw error;
  }
}


// ============================================================================
// UPSERT SINGLE PRODUCT
// ============================================================================

/**
 * Used later by Shopify product webhooks.
 *
 * This allows us to update one product without performing
 * a complete catalog synchronization.
 *
 * @param {String} shopDomain
 * @param {Object} shopifyProduct
 * @returns {Promise<Object>}
 */
async function upsertProduct(
  shopDomain,
  shopifyProduct
) {
  const normalized =
    normalizeProduct(
      shopifyProduct,
      shopDomain
    );


  if (!normalized) {
    throw new Error(
      'Invalid Shopify product.'
    );
  }


  return V1Product.findOneAndUpdate(
    {
      shop:
        normalized.shop,

      shopifyProductId:
        normalized.shopifyProductId,
    },

    {
      $set:
        normalized,
    },

    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );
}


// ============================================================================
// DELETE PRODUCT
// ============================================================================

/**
 * Delete one product from the V1 catalog.
 *
 * @param {String} shopDomain
 * @param {String|Number} shopifyProductId
 * @returns {Promise<Object>}
 */
async function deleteProduct(
  shopDomain,
  shopifyProductId
) {
  if (
    !shopDomain ||
    !shopifyProductId
  ) {
    throw new Error(
      'Shop domain and product ID are required.'
    );
  }


  return V1Product.deleteOne({
    shop:
      String(shopDomain)
        .trim()
        .toLowerCase(),

    shopifyProductId:
      String(shopifyProductId),
  });
}


// ============================================================================
// GET PRODUCTS
// ============================================================================

/**
 * Get active products for one merchant.
 *
 * @param {String} shopDomain
 * @param {Object} options
 * @returns {Promise<Array>}
 */
async function getProducts(
  shopDomain,
  options = {}
) {
  const shop =
    normalizeShopDomain(
      shopDomain
    );


  const limit =
    Math.min(
      Math.max(
        Number(
          options.limit
        ) || 100,
        1
      ),
      500
    );


  const filter = {
    shop,
  };


  if (
    options.activeOnly !== false
  ) {
    filter.status =
      'active';

    filter.available =
      true;
  }


  return V1Product
    .find(filter)
    .sort({
      updatedAt: -1,
    })
    .limit(limit)
    .lean();
}


// ============================================================================
// GET PRODUCT
// ============================================================================

/**
 * Find one merchant product.
 *
 * @param {String} shopDomain
 * @param {String|Number} productId
 * @returns {Promise<Object|null>}
 */
async function getProduct(
  shopDomain,
  productId
) {
  return V1Product.findForShop(
    normalizeShopDomain(
      shopDomain
    ),
    productId
  ).lean();
}


// ============================================================================
// SEARCH PRODUCTS
// ============================================================================

/**
 * Search products using MongoDB text-like matching.
 *
 * This is deliberately simple for V1.
 * We can introduce vector/semantic search later if required.
 *
 * @param {String} shopDomain
 * @param {String} query
 * @param {Object} options
 * @returns {Promise<Array>}
 */
async function searchProducts(
  shopDomain,
  query,
  options = {}
) {
  const shop =
    normalizeShopDomain(
      shopDomain
    );


  const limit =
    Math.min(
      Math.max(
        Number(
          options.limit
        ) || 10,
        1
      ),
      50
    );


  const cleanQuery =
    String(
      query || ''
    )
      .trim();


  if (!cleanQuery) {
    return getProducts(
      shop,
      {
        limit,
      }
    );
  }


  const words =
    cleanQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 10);


  const regex =
    words
      .map(
        (word) =>
          escapeRegex(word)
      )
      .join('|');


  return V1Product
    .find({
      shop,

      status:
        'active',

      available:
        true,

      $or: [
        {
          title: {
            $regex:
              regex,
            $options:
              'i',
          },
        },

        {
          description: {
            $regex:
              regex,
            $options:
              'i',
          },
        },

        {
          vendor: {
            $regex:
              regex,
            $options:
              'i',
          },
        },

        {
          productType: {
            $regex:
              regex,
            $options:
              'i',
          },
        },

        {
          tags: {
            $regex:
              regex,
            $options:
              'i',
          },
        },
      ],
    })
    .limit(limit)
    .lean();
}


// ============================================================================
// FIND PRODUCTS FOR AI
// ============================================================================

/**
 * Get a compact product catalog for the AI.
 *
 * The AI should receive only the information it actually needs.
 *
 * @param {String} shopDomain
 * @param {Object} options
 * @returns {Promise<Array>}
 */
async function getAIProductContext(
  shopDomain,
  options = {}
) {
  const limit =
    Math.min(
      Math.max(
        Number(
          options.limit
        ) ||
          Number(
            V1_CONFIG?.AI
              ?.MAX_PRODUCTS_IN_CONTEXT
          ) ||
          20,
        1
      ),
      100
    );


  const products =
    options.query
      ? await searchProducts(
          shopDomain,
          options.query,
          {
            limit,
          }
        )
      : await getProducts(
          shopDomain,
          {
            limit,
          }
        );


  return products.map(
    (product) =>
      toAIContext(
        product
      )
  );
}


// ============================================================================
// PRODUCT RECOMMENDATIONS
// ============================================================================

/**
 * Basic V1 recommendation engine.
 *
 * Matching priority:
 *
 * 1. Product type
 * 2. Tags
 * 3. Vendor
 * 4. Text relevance
 *
 * @param {String} shopDomain
 * @param {Object} product
 * @param {Object} options
 * @returns {Promise<Array>}
 */
async function getRecommendations(
  shopDomain,
  product,
  options = {}
) {
  const shop =
    normalizeShopDomain(
      shopDomain
    );


  const limit =
    Math.min(
      Math.max(
        Number(
          options.limit
        ) || 4,
        1
      ),
      20
    );


  if (!product) {
    return getProducts(
      shop,
      {
        limit,
      }
    );
  }


  const productId =
    String(
      product.shopifyProductId ||
      product.id ||
      ''
    );


  const productType =
    String(
      product.productType ||
      ''
    ).trim();


  const vendor =
    String(
      product.vendor ||
      ''
    ).trim();


  const tags =
    Array.isArray(product.tags)
      ? product.tags
      : [];


  const filters = [
    {
      shop,
      status: 'active',
      available: true,

      shopifyProductId: {
        $ne:
          productId,
      },

      productType: {
        $regex:
          escapeRegex(
            productType
          ),
        $options:
          'i',
      },
    },
  ];


  if (vendor) {
    filters.push({
      shop,
      status: 'active',
      available: true,

      shopifyProductId: {
        $ne:
          productId,
      },

      vendor: {
        $regex:
          escapeRegex(
            vendor
          ),
        $options:
          'i',
      },
    });
  }


  const candidates =
    await V1Product
      .find({
        $or:
          filters,
      })
      .limit(
        limit * 5
      )
      .lean();


  const scored =
    candidates.map(
      (candidate) => {
        let score = 0;


        if (
          productType &&
          candidate.productType
            ?.toLowerCase() ===
            productType
              .toLowerCase()
        ) {
          score += 5;
        }


        if (
          vendor &&
          candidate.vendor
            ?.toLowerCase() ===
            vendor
              .toLowerCase()
        ) {
          score += 3;
        }


        const candidateTags =
          Array.isArray(
            candidate.tags
          )
            ? candidate.tags
            : [];


        const matchingTags =
          tags.filter(
            (tag) =>
              candidateTags.some(
                (candidateTag) =>
                  candidateTag
                    .toLowerCase() ===
                  String(tag)
                    .toLowerCase()
              )
          );


        score +=
          matchingTags.length * 2;


        return {
          product:
            candidate,

          score,
        };
      }
    );


  return scored
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .slice(
      0,
      limit
    )
    .map(
      (item) =>
        item.product
    );
}


// ============================================================================
// AI CONTEXT
// ============================================================================

function toAIContext(
  product
) {
  return {
    id:
      product.shopifyProductId,

    title:
      product.title,

    description:
      truncate(
        product.description,
        500
      ),

    vendor:
      product.vendor,

    productType:
      product.productType,

    tags:
      Array.isArray(product.tags)
        ? product.tags.slice(
            0,
            10
          )
        : [],

    price: {
      min:
        product.minPrice,

      max:
        product.maxPrice,
    },

    available:
      product.available,

    url:
      product.url,

    image:
      product.image,

    variants:
      Array.isArray(
        product.variants
      )
        ? product.variants
            .slice(
              0,
              10
            )
            .map(
              (variant) => ({
                id:
                  variant.id,

                title:
                  variant.title,

                price:
                  variant.price,

                compareAtPrice:
                  variant.compareAtPrice,

                available:
                  variant.available,
              })
            )
        : [],
  };
}


// ============================================================================
// SHOPIFY API REQUEST
// ============================================================================

/**
 * Shopify request wrapper.
 *
 * @param {String} url
 * @param {String} accessToken
 * @returns {Promise<Object>}
 */
async function shopifyRequest(
  url,
  accessToken
) {
  const response =
    await fetch(
      url,
      {
        method:
          'GET',

        headers: {
          'X-Shopify-Access-Token':
            accessToken,

          'Content-Type':
            'application/json',

          Accept:
            'application/json',
        },
      }
    );


  const data =
    await parseJson(
      response
    );


  if (!response.ok) {
    const errorMessage =
      data?.errors
        ? typeof data.errors ===
          'string'
          ? data.errors
          : JSON.stringify(
              data.errors
            )
        : `Shopify API request failed with status ${response.status}.`;


    const error =
      new Error(
        errorMessage
      );


    error.statusCode =
      response.status;


    error.shopifyResponse =
      data;


    throw error;
  }


  return {
    data,
    linkHeader:
      response.headers.get(
        'link'
      ),
  };
}


// ============================================================================
// PARSE JSON
// ============================================================================

async function parseJson(
  response
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}


// ============================================================================
// SHOPIFY PAGINATION
// ============================================================================

/**
 * Extract rel="next" from Shopify's Link header.
 *
 * Example:
 *
 * <https://example.myshopify.com/...page_info=abc>; rel="next"
 *
 * @param {String|null} linkHeader
 * @returns {String|null}
 */
function getNextPageUrl(
  linkHeader
) {
  if (!linkHeader) {
    return null;
  }


  const links =
    linkHeader.split(',');


  for (const link of links) {
    const match =
      link.match(
        /<([^>]+)>;\s*rel="next"/i
      );


    if (match) {
      return match[1];
    }
  }


  return null;
}


// ============================================================================
// SHOP RESOLUTION
// ============================================================================

async function resolveShopWithToken(
  shopOrDomain
) {
  if (!shopOrDomain) {
    return null;
  }


  // Existing mongoose document.
  if (
    typeof shopOrDomain ===
      'object' &&
    shopOrDomain._id
  ) {
    if (
      shopOrDomain.accessToken
    ) {
      return shopOrDomain;
    }


    return V1Shop
      .findById(
        shopOrDomain._id
      )
      .select(
        '+accessToken'
      );
  }


  const shopDomain =
    normalizeShopDomain(
      shopOrDomain
    );


  return V1Shop
    .findOne({
      shop:
        shopDomain,
    })
    .select(
      '+accessToken'
    );
}


// ============================================================================
// SHOP DOMAIN
// ============================================================================

function normalizeShopDomain(
  value
) {
  if (!value) {
    throw new Error(
      'Shop domain is required.'
    );
  }


  let domain =
    String(value)
      .trim()
      .toLowerCase();


  domain =
    domain
      .replace(
        /^https?:\/\//,
        ''
      )
      .replace(
        /^www\./,
        ''
      )
      .split('/')[0]
      .split('?')[0]
      .split('#')[0];


  return domain;
}


// ============================================================================
// STATUS
// ============================================================================

function normalizeStatus(
  status
) {
  const allowed = [
    'active',
    'draft',
    'archived',
  ];


  return allowed.includes(
    status
  )
    ? status
    : 'active';
}


// ============================================================================
// PRICE
// ============================================================================

function parsePrice(
  value
) {
  const price =
    Number.parseFloat(
      value
    );


  return Number.isFinite(
    price
  )
    ? price
    : 0;
}


// ============================================================================
// HTML CLEANER
// ============================================================================

function stripHtml(
  value
) {
  if (!value) {
    return '';
  }


  return String(value)
    .replace(
      /<[^>]*>/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}


// ============================================================================
// TRUNCATE
// ============================================================================

function truncate(
  value,
  maxLength
) {
  if (!value) {
    return '';
  }


  const text =
    String(value);


  if (
    text.length <=
    maxLength
  ) {
    return text;
  }


  return (
    text.slice(
      0,
      maxLength
    ) + '...'
  );
}


// ============================================================================
// ESCAPE REGEX
// ============================================================================

function escapeRegex(
  value
) {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );
}


// ============================================================================
// MAXIMUM SYNC SIZE
// ============================================================================

function getMaximumSyncProducts() {
  return (
    Number(
      V1_CONFIG
        ?.PRODUCT_SYNC
        ?.MAX_PRODUCTS
    ) ||
    10000
  );
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
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
