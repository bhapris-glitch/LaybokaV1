/**
 * ============================================================================
 * Layboka AI — V1
 * Shopify Product Model
 * ============================================================================
 *
 * File:
 * backend/src/v1/models/V1Product.js
 *
 * Purpose:
 * - Store synced Shopify products
 * - Give the AI Sales Agent real product information
 * - Support recommendations
 * - Support upsells and cross-sells
 * - Support product search
 * - Keep product data separate from V1Shop
 *
 * ============================================================================
 */

'use strict';

const mongoose = require('mongoose');


// ============================================================================
// VARIANT SCHEMA
// ============================================================================

const V1ProductVariantSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      default: '',
      trim: true,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    compareAtPrice: {
      type: Number,
      default: null,
      min: 0,
    },

    available: {
      type: Boolean,
      default: true,
    },

    inventoryQuantity: {
      type: Number,
      default: null,
    },

    sku: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: false,
  }
);


// ============================================================================
// PRODUCT SCHEMA
// ============================================================================

const V1ProductSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------------------
    // SHOP OWNER
    // ------------------------------------------------------------------------

    shop: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },


    // ------------------------------------------------------------------------
    // SHOPIFY PRODUCT ID
    // ------------------------------------------------------------------------

    shopifyProductId: {
      type: String,
      required: true,
      trim: true,
    },


    // ------------------------------------------------------------------------
    // BASIC PRODUCT INFORMATION
    // ------------------------------------------------------------------------

    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    handle: {
      type: String,
      default: '',
      trim: true,
    },

    description: {
      type: String,
      default: '',
    },

    vendor: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    productType: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },


    // ------------------------------------------------------------------------
    // PRODUCT STATUS
    // ------------------------------------------------------------------------

    status: {
      type: String,
      enum: [
        'active',
        'draft',
        'archived',
      ],
      default: 'active',
      index: true,
    },


    // ------------------------------------------------------------------------
    // PRODUCT URL
    // ------------------------------------------------------------------------

    url: {
      type: String,
      default: '',
    },


    // ------------------------------------------------------------------------
    // IMAGE
    // ------------------------------------------------------------------------

    image: {
      type: String,
      default: '',
    },


    // ------------------------------------------------------------------------
    // PRICING
    // ------------------------------------------------------------------------

    minPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxPrice: {
      type: Number,
      default: 0,
      min: 0,
    },


    // ------------------------------------------------------------------------
    // AVAILABILITY
    // ------------------------------------------------------------------------

    available: {
      type: Boolean,
      default: true,
      index: true,
    },


    // ------------------------------------------------------------------------
    // VARIANTS
    // ------------------------------------------------------------------------

    variants: {
      type: [V1ProductVariantSchema],
      default: [],
    },


    // ------------------------------------------------------------------------
    // SHOPIFY TIMESTAMPS
    // ------------------------------------------------------------------------

    shopifyUpdatedAt: {
      type: Date,
      default: null,
      index: true,
    },


    // ------------------------------------------------------------------------
    // SYNC INFORMATION
    // ------------------------------------------------------------------------

    lastSyncedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },

  {
    timestamps: true,

    collection: 'v1_products',
  }
);


// ============================================================================
// UNIQUE PRODUCT PER SHOP
// ============================================================================

/**
 * The same Shopify product ID can exist in different stores.
 *
 * Therefore uniqueness must be:
 *
 *   shop + shopifyProductId
 *
 * rather than shopifyProductId alone.
 */
V1ProductSchema.index(
  {
    shop: 1,
    shopifyProductId: 1,
  },
  {
    unique: true,
  }
);


// ============================================================================
// SEARCH INDEXES
// ============================================================================

V1ProductSchema.index({
  shop: 1,
  title: 1,
});

V1ProductSchema.index({
  shop: 1,
  productType: 1,
});

V1ProductSchema.index({
  shop: 1,
  vendor: 1,
});

V1ProductSchema.index({
  shop: 1,
  status: 1,
  available: 1,
});

V1ProductSchema.index({
  shop: 1,
  lastSyncedAt: -1,
});


// ============================================================================
// INSTANCE HELPERS
// ============================================================================

/**
 * Return whether this product can currently be recommended.
 */
V1ProductSchema.methods.isRecommendable = function () {
  return (
    this.status === 'active' &&
    this.available === true
  );
};


/**
 * Return the product price.
 *
 * For products with multiple variants, the minimum price
 * is used as the starting price.
 */
V1ProductSchema.methods.getStartingPrice = function () {
  return Number(this.minPrice || 0);
};


/**
 * Return a compact object suitable for the AI service.
 *
 * This prevents unnecessary MongoDB fields from being
 * sent to the AI model.
 */
V1ProductSchema.methods.toAIContext = function () {
  return {
    id: this.shopifyProductId,

    title: this.title,

    description:
      this.description
        ? this.description.slice(0, 500)
        : '',

    vendor: this.vendor,

    productType: this.productType,

    tags: Array.isArray(this.tags)
      ? this.tags.slice(0, 10)
      : [],

    price: {
      min: this.minPrice,
      max: this.maxPrice,
    },

    available: this.available,

    url: this.url,

    image: this.image,

    variants: Array.isArray(this.variants)
      ? this.variants.slice(0, 10).map(
          (variant) => ({
            id: variant.id,
            title: variant.title,
            price: variant.price,
            compareAtPrice:
              variant.compareAtPrice,
            available: variant.available,
          })
        )
      : [],
  };
};


// ============================================================================
// STATIC HELPERS
// ============================================================================

/**
 * Find all active products for a shop.
 */
V1ProductSchema.statics.findActiveForShop =
  function (shop, options = {}) {
    const limit =
      Math.min(
        Number(options.limit) || 100,
        500
      );

    return this.find({
      shop: String(shop).toLowerCase(),
      status: 'active',
      available: true,
    })
      .sort({
        updatedAt: -1,
      })
      .limit(limit);
  };


/**
 * Find one product belonging to a specific shop.
 *
 * The shop condition is mandatory so a product from
 * another merchant can never accidentally be returned.
 */
V1ProductSchema.statics.findForShop =
  function (shop, shopifyProductId) {
    return this.findOne({
      shop: String(shop).toLowerCase(),

      shopifyProductId:
        String(shopifyProductId),
    });
  };


// ============================================================================
// MODEL
// ============================================================================

const V1Product =
  mongoose.models.V1Product ||
  mongoose.model(
    'V1Product',
    V1ProductSchema
  );


// ============================================================================
// EXPORT
// ============================================================================

module.exports = V1Product;
