/**
 * ============================================================================
 * Layboka AI - V1
 * AI Sales Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/v1.ai.service.js
 *
 * Purpose:
 * - Generate natural AI sales responses
 * - Use V1 sales context
 * - Use real Shopify product data
 * - Handle recommendations / upsells / cross-sells
 * - Answer product questions
 * - Handle objections
 * - Assist cart / checkout conversations
 *
 * Important:
 * - OpenAI generates language and sales reasoning.
 * - Shopify/V1 database remains the source of truth for products,
 *   prices, availability and URLs.
 * ============================================================================
 */

'use strict';

const OpenAI = require('openai');

const { V1_CONFIG } = require('../config/v1.config');
const {
  buildSalesContext
} = require('./v1.sales.service');


// ============================================================================
// OPENAI CLIENT
// ============================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_MESSAGE_LENGTH =
  V1_CONFIG.AI.MAX_MESSAGE_LENGTH || 4000;

const MAX_HISTORY =
  V1_CONFIG.AI.MAX_HISTORY || 20;

const TEMPERATURE =
  V1_CONFIG.AI.TEMPERATURE ?? 0.4;


// ============================================================================
// MAIN AI RESPONSE
// ============================================================================

/**
 * Generate an AI sales response.
 *
 * @param {Object} params
 * @param {Object} params.shop
 * @param {String} params.message
 * @param {Array} params.conversation
 * @param {String|null} params.selectedProductId
 *
 * @returns {Promise<Object>}
 */
async function generateSalesResponse({
  shop,
  message,
  conversation = [],
  selectedProductId = null
}) {
  validateInput(message);

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // --------------------------------------------------------------------------
  // Build deterministic sales context
  // --------------------------------------------------------------------------

  const salesContext = await buildSalesContext({
    shop,
    message,
    conversation,
    selectedProduct: selectedProductId
  });

  // --------------------------------------------------------------------------
  // Build system instructions
  // --------------------------------------------------------------------------

  const systemPrompt = buildSystemPrompt({
    shop,
    salesContext
  });

  // --------------------------------------------------------------------------
  // Build conversation history
  // --------------------------------------------------------------------------

  const messages = buildConversationMessages({
    conversation,
    message
  });

  // --------------------------------------------------------------------------
  // Call OpenAI
  // --------------------------------------------------------------------------

  const response = await openai.responses.create({
    model: V1_CONFIG.AI.MODEL,

    instructions: systemPrompt,

    input: messages,

    temperature: TEMPERATURE,

    max_output_tokens:
      V1_CONFIG.AI.MAX_OUTPUT_TOKENS || 500
  });

  const text = extractResponseText(response);

  if (!text) {
    throw new Error('OpenAI returned an empty response');
  }

  // --------------------------------------------------------------------------
  // Return structured response
  // --------------------------------------------------------------------------

  return {
    message: text,

    intent: salesContext.intent,

    buyingStage: salesContext.buyingStage,

    salesGoal: salesContext.salesGoal,

    products: salesContext.products || [],

    upsells: salesContext.upsells || [],

    crossSells: salesContext.crossSells || [],

    checkout: salesContext.checkout || null,

    metadata: {
      model: V1_CONFIG.AI.MODEL,
      generatedAt: new Date()
    }
  };
}


// ============================================================================
// SYSTEM PROMPT
// ============================================================================

function buildSystemPrompt({
  shop,
  salesContext
}) {
  const storeName =
    shop?.shopName ||
    shop?.name ||
    'the store';

  const productContext =
    formatProductsForAI(salesContext.products);

  const upsellContext =
    formatProductsForAI(salesContext.upsells);

  const crossSellContext =
    formatProductsForAI(salesContext.crossSells);

  const objectionStrategy =
    salesContext.objectionStrategy
      ? JSON.stringify(salesContext.objectionStrategy)
      : 'None';

  const checkoutStrategy =
    salesContext.checkout
      ? JSON.stringify(salesContext.checkout)
      : 'None';

  return `
You are Layboka, an AI Sales Executive working for "${storeName}".

Your job is NOT to behave like a generic customer-support chatbot.

Your primary objective is to help the shopper confidently find and purchase
the right product.

You should behave like an excellent human sales representative:

1. Understand what the shopper wants.
2. Ask a short clarification question when necessary.
3. Recommend relevant products.
4. Explain why a product fits the shopper.
5. Handle objections naturally.
6. Compare products when useful.
7. Upsell only when genuinely relevant.
8. Cross-sell complementary products when appropriate.
9. Help the shopper move toward checkout.
10. Never pressure or manipulate the shopper.

===============================================================================
STORE / PRODUCT RULES
===============================================================================

The supplied product data is the source of truth.

NEVER invent:

- Product names
- Prices
- Discounts
- Inventory
- Product URLs
- Variants
- Shipping promises
- Return policies
- Payment methods
- Product specifications

If the supplied data does not contain the answer, say that you do not have
that information and avoid guessing.

Never claim a product is available unless the supplied data says it is
available.

Never create fake product links.

===============================================================================
SALES STYLE
===============================================================================

Sound like a helpful human sales representative.

Use:

- Short responses
- Natural language
- Clear recommendations
- Simple explanations
- Helpful questions
- Confidence without pressure

Avoid:

- Long essays
- Robotic wording
- Excessive emojis
- Fake urgency
- Aggressive sales pressure
- Repeating the same recommendation
- "As an AI..."
- "I am just a chatbot..."

Use the shopper's language when practical.

===============================================================================
BUYING STAGE
===============================================================================

Current buying stage:

${salesContext.buyingStage || 'discovery'}

Current intent:

${salesContext.intent || 'unknown'}

Current sales goal:

${salesContext.salesGoal || 'understand the shopper'}

===============================================================================
PRODUCTS
===============================================================================

Primary product context:

${productContext || 'No specific products were found.'}

Potential upsells:

${upsellContext || 'No relevant upsells found.'}

Potential cross-sells:

${crossSellContext || 'No relevant cross-sells found.'}

===============================================================================
OBJECTION STRATEGY
===============================================================================

${objectionStrategy}

===============================================================================
CHECKOUT STRATEGY
===============================================================================

${checkoutStrategy}

===============================================================================
RESPONSE RULES
===============================================================================

When recommending products:

- Recommend the most relevant product first.
- Explain the reason briefly.
- Mention price only when available.
- Do not overwhelm the shopper with many choices.
- Prefer 1-3 strong recommendations.

When the shopper asks for a product:

- Give the most relevant available product.
- If several products are genuinely suitable, compare them briefly.

When handling price objections:

- Do not invent discounts.
- Explain value.
- If a cheaper relevant product exists in the supplied data, offer it.

When upselling:

- Only upsell if the higher-priced product genuinely provides relevant
  additional value.

When cross-selling:

- Only suggest products that logically complement the shopper's interest.

When the shopper appears ready to buy:

- Stop over-explaining.
- Help them proceed toward cart or checkout.

When information is missing:

- Ask a useful question or clearly state that the information is unavailable.

===============================================================================
IMPORTANT
===============================================================================

The database and Shopify are the source of truth.

You are responsible for communicating and reasoning about the supplied data,
not inventing store data.
`;
}


// ============================================================================
// CONVERSATION HISTORY
// ============================================================================

function buildConversationMessages({
  conversation = [],
  message
}) {
  const history = Array.isArray(conversation)
    ? conversation.slice(-MAX_HISTORY)
    : [];

  const messages = [];

  for (const item of history) {
    if (!item) {
      continue;
    }

    const role = normalizeRole(item.role);

    if (!role) {
      continue;
    }

    const content =
      typeof item.content === 'string'
        ? item.content.trim()
        : '';

    if (!content) {
      continue;
    }

    messages.push({
      role,
      content
    });
  }

  messages.push({
    role: 'user',
    content: message.trim()
  });

  return messages;
}


// ============================================================================
// PRODUCT FORMATTER
// ============================================================================

function formatProductsForAI(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return '';
  }

  return products
    .slice(0, 10)
    .map((product, index) => {
      const price =
        formatPrice(
          product.minPrice ?? product.price
        );

      const maxPrice =
        product.maxPrice !== undefined &&
        product.maxPrice !== product.minPrice
          ? ` - ${formatPrice(product.maxPrice)}`
          : '';

      return `
Product ${index + 1}
ID: ${product._id || product.id || 'unknown'}
Shopify ID: ${product.shopifyProductId || 'unknown'}
Name: ${product.title || 'Unknown'}
Price: ${price || 'Unknown'}${maxPrice}
Vendor: ${product.vendor || 'Unknown'}
Type: ${product.productType || 'Unknown'}
Available: ${product.available ? 'Yes' : 'No'}
URL: ${product.url || 'Unavailable'}
Description: ${cleanDescription(product.description)}
`;
    })
    .join('\n');
}


// ============================================================================
// RESPONSE EXTRACTION
// ============================================================================

function extractResponseText(response) {
  if (!response) {
    return '';
  }

  if (typeof response.output_text === 'string') {
    return response.output_text.trim();
  }

  // Defensive fallback for SDK response structures.
  if (Array.isArray(response.output)) {
    const parts = [];

    for (const item of response.output) {
      if (!Array.isArray(item.content)) {
        continue;
      }

      for (const content of item.content) {
        if (
          content &&
          content.type === 'output_text' &&
          typeof content.text === 'string'
        ) {
          parts.push(content.text);
        }
      }
    }

    return parts.join('\n').trim();
  }

  return '';
}


// ============================================================================
// INPUT VALIDATION
// ============================================================================

function validateInput(message) {
  if (typeof message !== 'string') {
    throw new Error('Message must be a string');
  }

  const trimmed = message.trim();

  if (!trimmed) {
    throw new Error('Message cannot be empty');
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(
      `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`
    );
  }
}


// ============================================================================
// ROLE NORMALIZATION
// ============================================================================

function normalizeRole(role) {
  if (role === 'user') {
    return 'user';
  }

  if (role === 'assistant') {
    return 'assistant';
  }

  return null;
}


// ============================================================================
// DESCRIPTION CLEANUP
// ============================================================================

function cleanDescription(description) {
  if (!description) {
    return '';
  }

  return String(description)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800);
}


// ============================================================================
// PRICE FORMATTER
// ============================================================================

function formatPrice(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  return `$${numeric.toFixed(2)}`;
}


// ============================================================================
// SIMPLE HEALTH CHECK
// ============================================================================

function isConfigured() {
  return Boolean(
    process.env.OPENAI_API_KEY
  );
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateSalesResponse,
  buildSystemPrompt,
  buildConversationMessages,
  formatProductsForAI,
  extractResponseText,
  isConfigured
};
