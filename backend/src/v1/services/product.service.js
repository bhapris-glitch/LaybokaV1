/**
 * ============================================================================
 * Layboka AI — V1
 * Product Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/product.service.js
 *
 * Purpose:
 * - Fetch Shopify products
 * - Synchronize products into MongoDB
 * - Search products
 * - Build AI product context
 * - Generate deterministic recommendations
 *
 * ============================================================================
 */

'use strict';

const V1Shop =
  require('../models/V1Shop');

const V1Product =
  require('../models/V1Product');

const {
  getValidAccessToken,
} = require('./v1.shopify-token.service');


// ============================================================================
// CONFIG
// ============================================================================

const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_API_VERSION ||
  '2026-07';

const DEFAULT_PAGE_SIZE = 250;

const MAX_PRODUCTS =
  Number(
    process.env.V1_MAX_PRODUCTS ||
    10000
  );


// ============================================================================
// HELPERS
// ============================================================================

function normalizeShop(shop) {

  if (!shop || typeof shop !== 'string') {
    throw new Error(
      'Shop domain is required'
    );
  }

  return shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
}


async function resolveShop(shopOrDomain) {

  if (
    shopOrDomain &&
    typeof shopOrDomain === 'object' &&
    shopOrDomain._id
  ) {
    return shopOrDomain;
  }

  const shop =
    normalizeShop(
      shopOrDomain
    );

  return V1Shop
    .findOne({
      shop,
    })
    .select(
      '+accessToken +refreshToken'
    );
}


// ============================================================================
// SHOPIFY REQUEST
// ============================================================================

async function shopifyRequest(
  shopOrDomain,
  path,
  options = {}
) {

  const shopDoc =
    await resolveShop(
      shopOrDomain
    );

  if (!shopDoc) {
    throw new Error(
      'Shop not found'
    );
  }


  const accessToken =
    await getValidAccessToken(
      shopDoc
    );


  const response =
    await fetch(
      `https://${shopDoc.shop}/admin/api/${SHOPIFY_API_VERSION}${path}`,
      {
        method:
          options.method || 'GET',

        headers: {
          Accept:
            'application/json',

          'Content-Type':
            'application/json',

          'X-Shopify-Access-Token':
            accessToken,

          ...(options.headers || {}),
        },

        body:
          options.body
            ? JSON.stringify(
                options.body
              )
            : undefined,
      }
    );


  const text =
    await response.text();

  let data = null;

  try {
    data =
      text
        ? JSON.parse(text)
        : null;
  } catch {
    data = text;
  }


  if (!response.ok) {

    const message =
      data?.errors
        ? JSON.stringify(
            data.errors
          )
        : `Shopify request failed with status ${response.status}`;

    throw new Error(message);
  }


  return data;
}


// ============================================================================
// TEXT HELPERS
// ============================================================================

function stripHtml(value) {

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


function normalizeTags(tags) {

  if (Array.isArray(tags)) {
    return tags
      .map(String)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (!tags) {
    return [];
  }

  return String(tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}


function parsePrice(value) {

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return number;
}


// ============================================================================
// NORMALIZE SHOPIFY PRODUCT
// ============================================================================

function normalizeProduct(
  shop,
  product
) {

  const variants =
    Array.isArray(product.variants)
      ? product.variants
      : [];


  const normalizedVariants =
    variants.map(
      (variant) => ({
        id:
          String(
            variant.id
          ),

        title:
          variant.title ||
          '',

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


  const image =
    product.image?.src ||
    product.images?.[0]?.src ||
    null;


  return {
    shop,

    shopifyProductId:
      String(product.id),

    title:
      product.title ||
      '',

    handle:
      product.handle ||
      '',

    description:
      stripHtml(
        product.body_html
      ),

    vendor:
      product.vendor ||
      '',

    productType:
      product.product_type ||
      '',

    tags:
      normalizeTags(
        product.tags
      ),

    status:
      product.status ||
      'active',

    url:
      `https://${shop}/products/${product.handle}`,

    image,

    minPrice,

    maxPrice,

    available:
      normalizedVariants.some(
        (variant) =>
          variant.available
      ),

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
// PAGINATION
// ============================================================================

function getNextPageFromLinkHeader(
  linkHeader
) {

  if (!linkHeader) {
    return null;
  }

  const nextMatch =
    linkHeader.match(
      /<([^>]+)>;\s*rel="next"/
    );

  if (!nextMatch) {
    return null;
  }

  const url =
    new URL(
      nextMatch[1]
    );

  return (
    url.searchParams.get(
      'page_info'
    ) || null
  );
}


// ============================================================================
// FETCH SHOPIFY PRODUCTS
// ============================================================================

async function fetchShopifyProducts(
  shopOrDomain
) {

  const shopDoc =
    await resolveShop(
      shopOrDomain
    );

  if (!shopDoc) {
    throw new Error(
      'Shop not found'
    );
  }


  const products = [];

  let pageInfo = null;


  while (
    products.length <
    MAX_PRODUCTS
  ) {

    const params =
      new URLSearchParams();

    params.set(
      'limit',
      String(
        DEFAULT_PAGE_SIZE
      )
    );

    params.set(
      'status',
      'active'
    );


    if (pageInfo) {
      params.set(
        'page_info',
        pageInfo
      );
    }


    const accessToken =
      await getValidAccessToken(
        shopDoc
      );


    const response =
      await fetch(
        `https://${shopDoc.shop}/admin/api/${SHOPIFY_API_VERSION}/products.json?${params.toString()}`,
        {
          method: 'GET',

          headers: {
            Accept:
              'application/json',

            'X-Shopify-Access-Token':
              accessToken,
          },
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data?.errors
          ? JSON.stringify(
              data.errors
            )
          : `Shopify product request failed with status ${response.status}`
      );
    }


    const pageProducts =
      Array.isArray(
        data.products
      )
        ? data.products
        : [];


    products.push(
      ...pageProducts
    );


    const linkHeader =
      response.headers.get(
        'link'
      );


    pageInfo =
      getNextPageFromLinkHeader(
        linkHeader
      );


    if (
      !pageInfo ||
      pageProducts.length === 0
    ) {
      break;
    }
  }


  return products.slice(
    0,
    MAX_PRODUCTS
  );
}


// ============================================================================
// SYNC PRODUCTS
// ============================================================================

async function syncProducts(
  shopOrDomain
) {

  const shopDoc =
    await resolveShop(
      shopOrDomain
    );

  if (!shopDoc) {
    throw new Error(
      'Shop not found'
    );
  }


  await V1Shop.updateOne(
    {
      _id:
        shopDoc._id,
    },

    {
      $set: {
        productSyncStatus:
          'syncing',

        productSyncStartedAt:
          new Date(),

        productSyncError:
          null,
      },
    }
  );


  try {

    const shopifyProducts =
      await fetchShopifyProducts(
        shopDoc
      );


    const normalizedProducts =
      shopifyProducts.map(
        (product) =>
          normalizeProduct(
            shopDoc.shop,
            product
          )
      );


    if (
      normalizedProducts.length
    ) {

      const operations =
        normalizedProducts.map(
          (product) => ({
            updateOne: {
              filter: {
                shop:
                  shopDoc.shop,

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


      await V1Product.bulkWrite(
        operations,
        {
          ordered: false,
        }
      );
    }


    // ------------------------------------------------------------------------
    // REMOVE PRODUCTS THAT NO LONGER EXIST
    // ------------------------------------------------------------------------

    const ids =
      normalizedProducts.map(
        (product) =>
          product.shopifyProductId
      );


    await V1Product.deleteMany({
      shop:
        shopDoc.shop,

      shopifyProductId: {
        $nin:
          ids,
      },
    });


    await V1Shop.updateOne(
      {
        _id:
          shopDoc._id,
      },

      {
        $set: {
          productSyncStatus:
            'completed',

          productSyncCompletedAt:
            new Date(),

          productSyncError:
            null,
        },
      }
    );


    return {
      success: true,

      count:
        normalizedProducts.length,
    };

  } catch (error) {

    await V1Shop.updateOne(
      {
        _id:
          shopDoc._id,
      },

      {
        $set: {
          productSyncStatus:
            'failed',

          productSyncError:
            error.message,

          productSyncCompletedAt:
            new Date(),
        },
      }
    );


    throw error;
  }
}


// ============================================================================
// UPSERT ONE PRODUCT
// ============================================================================

async function upsertProduct(
  shopOrDomain,
  product
) {

  const shopDoc =
    await resolveShop(
      shopOrDomain
    );

  if (!shopDoc) {
    throw new Error(
      'Shop not found'
    );
  }


  const normalized =
    normalizeProduct(
      shopDoc.shop,
      product
    );


  return V1Product.findOneAndUpdate(
    {
      shop:
        shopDoc.shop,

      shopifyProductId:
        normalized.shopifyProductId,
    },

    {
      $set:
        normalized,
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

  const shop =
    normalizeShop(
      typeof shopOrDomain === 'object'
        ? shopOrDomain.shop
        : shopOrDomain
    );


  return V1Product.deleteOne({
    shop,

    shopifyProductId:
      String(
        shopifyProductId
      ),
  });
}


// ============================================================================
// GET PRODUCTS
// ============================================================================

async function getProducts(
  shopOrDomain,
  options = {}
) {

  const shop =
    normalizeShop(
      typeof shopOrDomain === 'object'
        ? shopOrDomain.shop
        : shopOrDomain
    );


  const query = {
    shop,
  };


  if (options.status) {
    query.status =
      options.status;
  }


  if (
    options.available !== undefined
  ) {
    query.available =
      Boolean(
        options.available
      );
  }


  return V1Product
    .find(query)
    .sort({
      title: 1,
    })
    .limit(
      Math.min(
        Number(
          options.limit
        ) || 100,
        500
      )
    );
}


// ============================================================================
// GET PRODUCT
// ============================================================================

async function getProduct(
  shopOrDomain,
  productId
) {

  const shop =
    normalizeShop(
      typeof shopOrDomain === 'object'
        ? shopOrDomain.shop
        : shopOrDomain
    );


  return V1Product.findOne({
    shop,

    $or: [
      {
        _id:
          /^[a-f\d]{24}$/i.test(
            String(productId)
          )
            ? productId
            : null,
      },

      {
        shopifyProductId:
          String(productId),
      },
    ],
  });
}


// ============================================================================
// SEARCH PRODUCTS
// ============================================================================

async function searchProducts(
  shopOrDomain,
  query,
  options = {}
) {

  const shop =
    normalizeShop(
      typeof shopOrDomain === 'object'
        ? shopOrDomain.shop
        : shopOrDomain
    );


  const search =
    String(
      query || ''
    ).trim();


  if (!search) {
    return [];
  }


  const regex =
    new RegExp(
      escapeRegex(search),
      'i'
    );


  return V1Product
    .find({
      shop,

      status:
        'active',

      $or: [
        {
          title:
            regex,
        },

        {
          vendor:
            regex,
        },

        {
          productType:
            regex,
        },

        {
          tags:
            regex,
        },

        {
          description:
            regex,
        },
      ],
    })
    .limit(
      Math.min(
        Number(
          options.limit
        ) || 10,
        50
      )
    );
}


// ============================================================================
// AI PRODUCT CONTEXT
// ============================================================================

async function getAIProductContext(
  shopOrDomain,
  query,
  options = {}
) {

  const products =
    await searchProducts(
      shopOrDomain,
      query,
      options
    );


  return products.map(
    (product) =>
      typeof product.toAIContext === 'function'
        ? product.toAIContext()
        : {
            id:
              String(
                product._id
              ),

            shopifyProductId:
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

            url:
              product.url,

            image:
              product.image,

            minPrice:
              product.minPrice,

            maxPrice:
              product.maxPrice,

            available:
              product.available,
          }
  );
}


// ============================================================================
// RECOMMENDATIONS
// ============================================================================

async function getRecommendations(
  shopOrDomain,
  productId,
  options = {}
) {

  const shopDoc =
    await resolveShop(
      shopOrDomain
    );

  if (!shopDoc) {
    throw new Error(
      'Shop not found'
    );
  }


  const source =
    await getProduct(
      shopDoc,
      productId
    );


  if (!source) {
    return [];
  }


  const candidates =
    await V1Product.find({
      shop:
        shopDoc.shop,

      status:
        'active',

      available:
        true,

      shopifyProductId: {
        $ne:
          source.shopifyProductId,
      },
    }).limit(200);


  const sourceTags =
    new Set(
      (source.tags || [])
        .map(
          (tag) =>
            String(
              tag
            ).toLowerCase()
        )
    );


  const scored =
    candidates.map(
      (product) => {

        let score = 0;


        if (
          source.productType &&
          product.productType &&
          source.productType.toLowerCase() ===
            product.productType.toLowerCase()
        ) {
          score += 5;
        }


        if (
          source.vendor &&
          product.vendor &&
          source.vendor.toLowerCase() ===
            product.vendor.toLowerCase()
        ) {
          score += 3;
        }


        for (
          const tag of
            product.tags || []
        ) {

          if (
            sourceTags.has(
              String(
                tag
              ).toLowerCase()
            )
          ) {
            score += 2;
          }
        }


        return {
          product,
          score,
        };
      }
    );


  return scored
    .filter(
      (item) =>
        item.score > 0
    )
    .sort(
      (a, b) =>
        b.score -
        a.score
    )
    .slice(
      0,
      Number(
        options.limit
      ) || 5
    )
    .map(
      (item) =>
        item.product
    );
}


// ============================================================================
// REGEX ESCAPE
// ============================================================================

function escapeRegex(
  value
) {

  return String(
    value
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  SHOPIFY_API_VERSION,

  normalizeShop,
  resolveShop,

  shopifyRequest,

  fetchShopifyProducts,
  syncProducts,

  upsertProduct,
  deleteProduct,

  getProducts,
  getProduct,
  searchProducts,

  getAIProductContext,
  getRecommendations,

  normalizeProduct,
};
