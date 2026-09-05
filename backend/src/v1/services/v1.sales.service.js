/**
 * ============================================================================
 * Layboka AI — V1
 * Sales Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/v1.sales.service.js
 *
 * Purpose:
 * - Detect basic buying stage
 * - Build sales context
 * - Recommend products
 * - Generate upsell opportunities
 * - Generate cross-sell opportunities
 * - Handle common objections
 * - Assist with cart/checkout intent
 *
 * IMPORTANT:
 * This is the SALES DECISION LAYER.
 *
 * OpenAI should generate the natural-language response later.
 * This service decides WHAT the AI should sell and WHY.
 * ============================================================================
 */

'use strict';

const {
  searchProducts,
  getProducts,
  getProduct,
  getRecommendations,
} = require('./v1.product.service');


// ============================================================================
// BUYING STAGES
// ============================================================================

const BUYING_STAGE = Object.freeze({
  DISCOVERY: 'discovery',
  CONSIDERATION: 'consideration',
  EVALUATION: 'evaluation',
  PURCHASE: 'purchase',
  POST_PURCHASE: 'post_purchase',
});


// ============================================================================
// SALES INTENTS
// ============================================================================

const SALES_INTENT = Object.freeze({
  GREETING: 'greeting',

  PRODUCT_SEARCH: 'product_search',

  PRODUCT_INFO: 'product_info',

  PRODUCT_COMPARISON: 'product_comparison',

  PRICE: 'price',

  AVAILABILITY: 'availability',

  SHIPPING: 'shipping',

  RETURNS: 'returns',

  PAYMENT: 'payment',

  DISCOUNT: 'discount',

  OBJECTION: 'objection',

  RECOMMENDATION: 'recommendation',

  UPSELL: 'upsell',

  CROSS_SELL: 'cross_sell',

  CART: 'cart',

  CHECKOUT: 'checkout',

  PURCHASE: 'purchase',

  UNKNOWN: 'unknown',
});


// ============================================================================
// INTENT DETECTION
// ============================================================================

/**
 * Detect the most likely sales intent from the customer's message.
 *
 * This is intentionally lightweight.
 * The main AI model will perform deeper understanding later.
 *
 * @param {String} message
 * @returns {String}
 */
function detectSalesIntent(message) {
  const text =
    normalizeText(message);


  if (!text) {
    return SALES_INTENT.UNKNOWN;
  }


  // --------------------------------------------------------------------------
  // Greeting
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'hello',
        'hi',
        'hey',
        'good morning',
        'good afternoon',
        'good evening',
        'namaste',
      ]
    )
  ) {
    return SALES_INTENT.GREETING;
  }


  // --------------------------------------------------------------------------
  // Checkout
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'checkout',
        'check out',
        'buy now',
        'purchase now',
        'where do i buy',
        'how do i buy',
        'place order',
        'place my order',
      ]
    )
  ) {
    return SALES_INTENT.CHECKOUT;
  }


  // --------------------------------------------------------------------------
  // Cart
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'cart',
        'shopping cart',
        'add this',
        'add to cart',
        'remove from cart',
        'my items',
      ]
    )
  ) {
    return SALES_INTENT.CART;
  }


  // --------------------------------------------------------------------------
  // Shipping
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'shipping',
        'delivery',
        'deliver',
        'how long',
        'when will it arrive',
        'arrival',
        'dispatch',
      ]
    )
  ) {
    return SALES_INTENT.SHIPPING;
  }


  // --------------------------------------------------------------------------
  // Returns
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'return',
        'returns',
        'refund',
        'exchange',
        'money back',
      ]
    )
  ) {
    return SALES_INTENT.RETURNS;
  }


  // --------------------------------------------------------------------------
  // Payment
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'payment',
        'pay',
        'credit card',
        'debit card',
        'paypal',
        'cash on delivery',
        'cod',
      ]
    )
  ) {
    return SALES_INTENT.PAYMENT;
  }


  // --------------------------------------------------------------------------
  // Discount
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'discount',
        'coupon',
        'promo code',
        'promotion',
        'offer',
        'deal',
        'cheaper',
        'sale price',
      ]
    )
  ) {
    return SALES_INTENT.DISCOUNT;
  }


  // --------------------------------------------------------------------------
  // Price
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'price',
        'cost',
        'how much',
        'how much is',
        'expensive',
        'cheap',
      ]
    )
  ) {
    return SALES_INTENT.PRICE;
  }


  // --------------------------------------------------------------------------
  // Comparison
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'compare',
        'comparison',
        'difference between',
        'which is better',
        'which one is better',
        'versus',
        'vs',
      ]
    )
  ) {
    return SALES_INTENT.PRODUCT_COMPARISON;
  }


  // --------------------------------------------------------------------------
  // Availability
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'available',
        'in stock',
        'stock',
        'sold out',
        'out of stock',
      ]
    )
  ) {
    return SALES_INTENT.AVAILABILITY;
  }


  // --------------------------------------------------------------------------
  // Objection
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'too expensive',
        'too costly',
        'not worth',
        'not sure',
        'i am not sure',
        'i need to think',
        'let me think',
        'i do not know',
        "i don't know",
        'why should i buy',
        'why buy',
      ]
    )
  ) {
    return SALES_INTENT.OBJECTION;
  }


  // --------------------------------------------------------------------------
  // Recommendation
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'recommend',
        'recommendation',
        'suggest',
        'suggestion',
        'what do you recommend',
        'what should i buy',
        'help me choose',
        'which should i buy',
        'best one',
      ]
    )
  ) {
    return SALES_INTENT.RECOMMENDATION;
  }


  // --------------------------------------------------------------------------
  // Upsell
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'upgrade',
        'better version',
        'premium version',
        'more expensive',
        'higher quality',
        'better option',
      ]
    )
  ) {
    return SALES_INTENT.UPSELL;
  }


  // --------------------------------------------------------------------------
  // Cross-sell
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'goes with',
        'go with',
        'accessory',
        'accessories',
        'also need',
        'what else',
        'add something',
        'complete the look',
        'bundle',
      ]
    )
  ) {
    return SALES_INTENT.CROSS_SELL;
  }


  // --------------------------------------------------------------------------
  // Product search
  // --------------------------------------------------------------------------

  if (
    matchesAny(
      text,
      [
        'looking for',
        'find',
        'show me',
        'do you have',
        'i need',
        'i want',
        'looking to buy',
      ]
    )
  ) {
    return SALES_INTENT.PRODUCT_SEARCH;
  }


  return SALES_INTENT.UNKNOWN;
}


// ============================================================================
// BUYING STAGE
// ============================================================================

/**
 * Determine customer's approximate buying stage.
 *
 * @param {Object} context
 * @returns {String}
 */
function determineBuyingStage(
  context = {}
) {
  const intent =
    context.intent ||
    SALES_INTENT.UNKNOWN;


  if (
    intent === SALES_INTENT.CHECKOUT ||
    intent === SALES_INTENT.PURCHASE
  ) {
    return BUYING_STAGE.PURCHASE;
  }


  if (
    intent === SALES_INTENT.OBJECTION ||
    intent === SALES_INTENT.PRODUCT_COMPARISON ||
    intent === SALES_INTENT.PRICE ||
    intent === SALES_INTENT.AVAILABILITY
  ) {
    return BUYING_STAGE.EVALUATION;
  }


  if (
    intent === SALES_INTENT.PRODUCT_INFO ||
    intent === SALES_INTENT.RECOMMENDATION ||
    intent === SALES_INTENT.UPSELL ||
    intent === SALES_INTENT.CROSS_SELL
  ) {
    return BUYING_STAGE.CONSIDERATION;
  }


  if (
    intent === SALES_INTENT.PRODUCT_SEARCH ||
    intent === SALES_INTENT.UNKNOWN
  ) {
    return BUYING_STAGE.DISCOVERY;
  }


  return BUYING_STAGE.DISCOVERY;
}


// ============================================================================
// SALES CONTEXT
// ============================================================================

/**
 * Build the sales decision context.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
async function buildSalesContext({
  shop,
  message,
  conversation = {},
  selectedProduct = null,
}) {
  const intent =
    detectSalesIntent(
      message
    );


  const buyingStage =
    determineBuyingStage({
      intent,
      conversation,
    });


  let products = [];


  // --------------------------------------------------------------------------
  // Product search / recommendation
  // --------------------------------------------------------------------------

  if (
    intent === SALES_INTENT.PRODUCT_SEARCH ||
    intent === SALES_INTENT.RECOMMENDATION
  ) {
    products =
      await searchProducts(
        shop,
        message,
        {
          limit: 8,
        }
      );
  }


  // --------------------------------------------------------------------------
  // Existing selected product
  // --------------------------------------------------------------------------

  if (
    selectedProduct &&
    products.length === 0
  ) {
    products = [
      selectedProduct,
    ];
  }


  // --------------------------------------------------------------------------
  // General product context
  // --------------------------------------------------------------------------

  if (
    products.length === 0 &&
    (
      intent === SALES_INTENT.GREETING ||
      intent === SALES_INTENT.UNKNOWN
    )
  ) {
    products =
      await getProducts(
        shop,
        {
          limit: 6,
        }
      );
  }


  // --------------------------------------------------------------------------
  // Upsell
  // --------------------------------------------------------------------------

  let upsells = [];


  if (
    selectedProduct &&
    (
      intent === SALES_INTENT.UPSELL ||
      intent === SALES_INTENT.OBJECTION ||
      buyingStage ===
        BUYING_STAGE.EVALUATION
    )
  ) {
    upsells =
      await buildUpsellOptions(
        shop,
        selectedProduct
      );
  }


  // --------------------------------------------------------------------------
  // Cross-sell
  // --------------------------------------------------------------------------

  let crossSells = [];


  if (
    selectedProduct &&
    (
      intent === SALES_INTENT.CROSS_SELL ||
      intent === SALES_INTENT.RECOMMENDATION
    )
  ) {
    crossSells =
      await buildCrossSellOptions(
        shop,
        selectedProduct
      );
  }


  // --------------------------------------------------------------------------
  // Objection
  // --------------------------------------------------------------------------

  const objection =
    getObjectionResponseStrategy(
      message
    );


  // --------------------------------------------------------------------------
  // Checkout intent
  // --------------------------------------------------------------------------

  const checkout =
    buildCheckoutStrategy(
      intent,
      conversation
    );


  return {
    intent,

    buyingStage,

    customerMessage:
      message,

    selectedProduct,

    products,

    upsells,

    crossSells,

    objection,

    checkout,

    salesGoal:
      determineSalesGoal(
        intent,
        buyingStage
      ),
  };
}


// ============================================================================
// UPSELL
// ============================================================================

/**
 * Find more premium alternatives.
 *
 * V1 uses price + product similarity.
 *
 * @param {String} shop
 * @param {Object} product
 * @returns {Promise<Array>}
 */
async function buildUpsellOptions(
  shop,
  product
) {
  const recommendations =
    await getRecommendations(
      shop,
      product,
      {
        limit: 10,
      }
    );


  const currentPrice =
    Number(
      product.minPrice ||
      product.price?.min ||
      0
    );


  return recommendations
    .filter(
      (candidate) => {
        const price =
          Number(
            candidate.minPrice ||
            candidate.price?.min ||
            0
          );

        return (
          price > currentPrice
        );
      }
    )
    .slice(
      0,
      3
    );
}


// ============================================================================
// CROSS-SELL
// ============================================================================

/**
 * Find related products.
 *
 * V1 uses tags, product type and vendor similarity.
 *
 * @param {String} shop
 * @param {Object} product
 * @returns {Promise<Array>}
 */
async function buildCrossSellOptions(
  shop,
  product
) {
  const recommendations =
    await getRecommendations(
      shop,
      product,
      {
        limit: 10,
      }
    );


  const currentId =
    String(
      product.shopifyProductId ||
      product.id ||
      ''
    );


  return recommendations
    .filter(
      (candidate) =>
        String(
          candidate.shopifyProductId ||
          candidate.id ||
          ''
        ) !== currentId
    )
    .slice(
      0,
      4
    );
}


// ============================================================================
// OBJECTION STRATEGY
// ============================================================================

/**
 * Determine how the Sales Agent should respond to an objection.
 *
 * IMPORTANT:
 * This does NOT generate the final customer-facing response.
 *
 * It gives OpenAI a sales strategy.
 *
 * @param {String} message
 * @returns {Object}
 */
function getObjectionResponseStrategy(
  message
) {
  const text =
    normalizeText(
      message
    );


  if (
    matchesAny(
      text,
      [
        'too expensive',
        'too costly',
        'expensive',
        'costly',
      ]
    )
  ) {
    return {
      detected: true,

      type:
        'price_objection',

      strategy: [
        'Acknowledge the concern.',
        'Explain the product value using only known product facts.',
        'Avoid inventing features or guarantees.',
        'If appropriate, offer a lower-priced relevant product.',
        'Do not create an unauthorized discount.',
      ],
    };
  }


  if (
    matchesAny(
      text,
      [
        'not sure',
        'i am not sure',
        "i don't know",
        'i do not know',
      ]
    )
  ) {
    return {
      detected: true,

      type:
        'uncertainty',

      strategy: [
        'Ask one useful qualification question.',
        'Clarify the customers primary need.',
        'Recommend the most relevant product.',
        'Keep the choice simple.',
      ],
    };
  }


  if (
    matchesAny(
      text,
      [
        'need to think',
        'let me think',
        'i will think',
      ]
    )
  ) {
    return {
      detected: true,

      type:
        'hesitation',

      strategy: [
        'Do not pressure the customer.',
        'Summarize the strongest product benefit.',
        'Answer any remaining concern.',
        'Offer an easy path back to the product.',
      ],
    };
  }


  return {
    detected: false,

    type: null,

    strategy: [],
  };
}


// ============================================================================
// CHECKOUT STRATEGY
// ============================================================================

function buildCheckoutStrategy(
  intent,
  conversation
) {
  if (
    intent ===
    SALES_INTENT.CHECKOUT
  ) {
    return {
      ready: true,

      action:
        'send_customer_to_checkout',

      strategy: [
        'Confirm the selected product.',
        'Confirm variant if necessary.',
        'Provide the product/cart action.',
        'Avoid unnecessary sales friction.',
      ],
    };
  }


  if (
    intent ===
    SALES_INTENT.CART
  ) {
    return {
      ready: false,

      action:
        'assist_cart',

      strategy: [
        'Identify the products in the cart.',
        'Check whether the customer needs help.',
        'Offer one relevant cross-sell when appropriate.',
        'Offer checkout assistance.',
      ],
    };
  }


  return {
    ready: false,

    action: null,

    strategy: [],
  };
}


// ============================================================================
// SALES GOAL
// ============================================================================

function determineSalesGoal(
  intent,
  buyingStage
) {
  switch (intent) {
    case SALES_INTENT.GREETING:
      return 'understand_customer_need';

    case SALES_INTENT.PRODUCT_SEARCH:
      return 'find_relevant_product';

    case SALES_INTENT.RECOMMENDATION:
      return 'recommend_best_fit';

    case SALES_INTENT.PRODUCT_COMPARISON:
      return 'help_customer_choose';

    case SALES_INTENT.OBJECTION:
      return 'remove_purchase_friction';

    case SALES_INTENT.UPSELL:
      return 'increase_order_value';

    case SALES_INTENT.CROSS_SELL:
      return 'increase_order_value';

    case SALES_INTENT.CHECKOUT:
      return 'complete_purchase';

    case SALES_INTENT.CART:
      return 'recover_or_progress_cart';

    default:
      break;
  }


  if (
    buyingStage ===
    BUYING_STAGE.EVALUATION
  ) {
    return 'remove_purchase_friction';
  }


  if (
    buyingStage ===
    BUYING_STAGE.CONSIDERATION
  ) {
    return 'move_customer_toward_purchase';
  }


  return 'understand_customer_need';
}


// ============================================================================
// PRODUCT SELECTION
// ============================================================================

/**
 * Resolve a product supplied by the widget.
 *
 * @param {String} shop
 * @param {String|Number} productId
 * @returns {Promise<Object|null>}
 */
async function resolveSelectedProduct(
  shop,
  productId
) {
  if (!productId) {
    return null;
  }


  return getProduct(
    shop,
    productId
  );
}


// ============================================================================
// PRODUCT RECOMMENDATION
// ============================================================================

/**
 * Return recommendations for a specific product.
 *
 * @param {String} shop
 * @param {String|Number} productId
 * @returns {Promise<Array>}
 */
async function recommendProducts(
  shop,
  productId
) {
  const product =
    await resolveSelectedProduct(
      shop,
      productId
    );


  if (!product) {
    return [];
  }


  return getRecommendations(
    shop,
    product,
    {
      limit: 5,
    }
  );
}


// ============================================================================
// NORMALIZE MESSAGE
// ============================================================================

function normalizeText(
  value
) {
  return String(
    value || ''
  )
    .toLowerCase()
    .trim();
}


// ============================================================================
// KEYWORD MATCHING
// ============================================================================

function matchesAny(
  text,
  phrases
) {
  return phrases.some(
    (phrase) =>
      text.includes(
        phrase
      )
  );
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  BUYING_STAGE,

  SALES_INTENT,

  detectSalesIntent,

  determineBuyingStage,

  buildSalesContext,

  buildUpsellOptions,

  buildCrossSellOptions,

  getObjectionResponseStrategy,

  buildCheckoutStrategy,

  determineSalesGoal,

  resolveSelectedProduct,

  recommendProducts,
};
