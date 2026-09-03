/**
 * ============================================================================
 * Layboka AI — V1
 * Analytics Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/v1.analytics.service.js
 *
 * Purpose:
 * - Aggregate merchant funnel analytics
 * - Calculate conversion metrics
 * - Calculate verified sales
 * - Track product performance
 * - Generate daily performance data
 * - Power the V1 merchant dashboard
 *
 * ============================================================================
 */

'use strict';

const V1AnalyticsEvent = require('../models/V1AnalyticsEvent');


// ============================================================================
// CONSTANTS
// ============================================================================

const FUNNEL_EVENTS = Object.freeze([
  'widget_open',
  'conversation',
  'product_view',
  'product_click',
  'add_to_cart',
  'checkout',
  'purchase',
]);

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;


// ============================================================================
// HELPERS
// ============================================================================

function normalizeShop(shop) {
  if (!shop || typeof shop !== 'string') {
    throw new Error('Shop domain is required');
  }

  return shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
}


function parseDate(value, fallback) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date;
}


function getDateRange(options = {}) {
  const now = new Date();

  let endDate = parseDate(
    options.endDate,
    now
  );

  let startDate;

  if (options.startDate) {
    startDate = parseDate(
      options.startDate,
      new Date(now.getTime() - DEFAULT_DAYS * 24 * 60 * 60 * 1000)
    );
  } else {
    const days = Math.min(
      Math.max(
        Number(options.days) || DEFAULT_DAYS,
        1
      ),
      MAX_DAYS
    );

    startDate = new Date(
      endDate.getTime() -
      days * 24 * 60 * 60 * 1000
    );
  }

  if (startDate > endDate) {
    const temp = startDate;
    startDate = endDate;
    endDate = temp;
  }

  return {
    startDate,
    endDate,
  };
}


function buildDateMatch(shop, startDate, endDate) {
  return {
    shop,
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };
}


function safePercentage(numerator, denominator) {
  if (!denominator || denominator <= 0) {
    return 0;
  }

  return Number(
    ((numerator / denominator) * 100).toFixed(2)
  );
}


// ============================================================================
// FUNNEL
// ============================================================================

/**
 * Get raw event counts for the funnel.
 */
async function getFunnel(shopOrDomain, options = {}) {
  const shop = normalizeShop(shopOrDomain);

  const {
    startDate,
    endDate,
  } = getDateRange(options);

  const rows = await V1AnalyticsEvent.aggregate([
    {
      $match: buildDateMatch(
        shop,
        startDate,
        endDate
      ),
    },

    {
      $match: {
        event: {
          $in: FUNNEL_EVENTS,
        },
      },
    },

    {
      $group: {
        _id: '$event',
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const counts = {};

  for (const event of FUNNEL_EVENTS) {
    counts[event] = 0;
  }

  for (const row of rows) {
    counts[row._id] = row.count;
  }

  return {
    shop,
    startDate,
    endDate,
    counts,
  };
}


// ============================================================================
// UNIQUE SESSION FUNNEL
// ============================================================================

/**
 * Calculate funnel using unique visitor sessions.
 *
 * This is more useful than raw event counts because one visitor
 * may generate multiple events.
 */
async function getUniqueSessionFunnel(
  shopOrDomain,
  options = {}
) {
  const shop = normalizeShop(shopOrDomain);

  const {
    startDate,
    endDate,
  } = getDateRange(options);

  const rows = await V1AnalyticsEvent.aggregate([
    {
      $match: buildDateMatch(
        shop,
        startDate,
        endDate
      ),
    },

    {
      $group: {
        _id: '$sessionId',

        events: {
          $addToSet: '$event',
        },
      },
    },
  ]);

  const counts = {};

  for (const event of FUNNEL_EVENTS) {
    counts[event] = 0;
  }

  for (const row of rows) {
    for (const event of FUNNEL_EVENTS) {
      if (row.events.includes(event)) {
        counts[event] += 1;
      }
    }
  }

  return {
    shop,
    startDate,
    endDate,
    counts,
  };
}


// ============================================================================
// SALES
// ============================================================================

/**
 * Get verified Shopify sales only.
 *
 * Browser-side purchase events are intentionally excluded.
 */
async function getVerifiedSales(
  shopOrDomain,
  options = {}
) {
  const shop = normalizeShop(shopOrDomain);

  const {
    startDate,
    endDate,
  } = getDateRange(options);

  const match = {
    ...buildDateMatch(
      shop,
      startDate,
      endDate
    ),

    event: 'purchase',
    verified: true,
    attributionSource: 'shopify_webhook',
  };

  const result = await V1AnalyticsEvent.aggregate([
    {
      $match: match,
    },

    {
      $group: {
        _id: null,

        orders: {
          $sum: 1,
        },

        revenue: {
          $sum: {
            $ifNull: ['$revenue', 0],
          },
        },
      },
    },
  ]);

  const row = result[0] || {
    orders: 0,
    revenue: 0,
  };

  return {
    shop,
    startDate,
    endDate,
    orders: row.orders,
    revenue: Number(
      Number(row.revenue || 0).toFixed(2)
    ),
  };
}


// ============================================================================
// SALES FUNNEL
// ============================================================================

async function getSalesFunnel(
  shopOrDomain,
  options = {}
) {
  const funnel = await getUniqueSessionFunnel(
    shopOrDomain,
    options
  );

  const sales = await getVerifiedSales(
    shopOrDomain,
    options
  );

  const widgetOpens = funnel.counts.widget_open;
  const conversations = funnel.counts.conversation;
  const productViews = funnel.counts.product_view;
  const productClicks = funnel.counts.product_click;
  const addToCarts = funnel.counts.add_to_cart;
  const checkouts = funnel.counts.checkout;

  return {
    ...funnel,

    verifiedOrders: sales.orders,
    verifiedRevenue: sales.revenue,

    conversionRates: {
      conversationFromWidget: safePercentage(
        conversations,
        widgetOpens
      ),

      productViewFromConversation: safePercentage(
        productViews,
        conversations
      ),

      productClickFromView: safePercentage(
        productClicks,
        productViews
      ),

      addToCartFromClick: safePercentage(
        addToCarts,
        productClicks
      ),

      checkoutFromCart: safePercentage(
        checkouts,
        addToCarts
      ),

      orderFromCheckout: safePercentage(
        sales.orders,
        checkouts
      ),

      overallPurchaseRate: safePercentage(
        sales.orders,
        widgetOpens
      ),
    },
  };
}


// ============================================================================
// PRODUCT PERFORMANCE
// ============================================================================

async function getProductPerformance(
  shopOrDomain,
  options = {}
) {
  const shop = normalizeShop(shopOrDomain);

  const {
    startDate,
    endDate,
  } = getDateRange(options);

  const rows = await V1AnalyticsEvent.aggregate([
    {
      $match: {
        ...buildDateMatch(
          shop,
          startDate,
          endDate
        ),

        shopifyProductId: {
          $exists: true,
          $ne: null,
        },

        event: {
          $in: [
            'product_view',
            'product_click',
            'add_to_cart',
          ],
        },
      },
    },

    {
      $group: {
        _id: {
          productId: '$shopifyProductId',
          event: '$event',
        },

        count: {
          $sum: 1,
        },
      },
    },

    {
      $group: {
        _id: '$_id.productId',

        events: {
          $push: {
            event: '$_id.event',
            count: '$count',
          },
        },

        totalInteractions: {
          $sum: '$count',
        },
      },
    },

    {
      $sort: {
        totalInteractions: -1,
      },
    },

    {
      $limit: 100,
    },
  ]);

  return rows.map((row) => {
    const metrics = {
      productViews: 0,
      productClicks: 0,
      addToCarts: 0,
    };

    for (const item of row.events) {
      if (item.event === 'product_view') {
        metrics.productViews = item.count;
      }

      if (item.event === 'product_click') {
        metrics.productClicks = item.count;
      }

      if (item.event === 'add_to_cart') {
        metrics.addToCarts = item.count;
      }
    }

    return {
      shopifyProductId: row._id,
      ...metrics,
      totalInteractions: row.totalInteractions,

      clickRate: safePercentage(
        metrics.productClicks,
        metrics.productViews
      ),

      addToCartRate: safePercentage(
        metrics.addToCarts,
        metrics.productClicks
      ),
    };
  });
}


// ============================================================================
// DAILY PERFORMANCE
// ============================================================================

async function getDailyPerformance(
  shopOrDomain,
  options = {}
) {
  const shop = normalizeShop(shopOrDomain);

  const {
    startDate,
    endDate,
  } = getDateRange(options);

  const rows = await V1AnalyticsEvent.aggregate([
    {
      $match: buildDateMatch(
        shop,
        startDate,
        endDate
      ),
    },

    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
          },
        },

        widgetOpens: {
          $sum: {
            $cond: [
              { $eq: ['$event', 'widget_open'] },
              1,
              0,
            ],
          },
        },

        conversations: {
          $sum: {
            $cond: [
              { $eq: ['$event', 'conversation'] },
              1,
              0,
            ],
          },
        },

        productViews: {
          $sum: {
            $cond: [
              { $eq: ['$event', 'product_view'] },
              1,
              0,
            ],
          },
        },

        productClicks: {
          $sum: {
            $cond: [
              { $eq: ['$event', 'product_click'] },
              1,
              0,
            ],
          },
        },

        addToCarts: {
          $sum: {
            $cond: [
              { $eq: ['$event', 'add_to_cart'] },
              1,
              0,
            ],
          },
        },

        checkouts: {
          $sum: {
            $cond: [
              { $eq: ['$event', 'checkout'] },
              1,
              0,
            ],
          },
        },

        verifiedOrders: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$event', 'purchase'] },
                  { $eq: ['$verified', true] },
                  {
                    $eq: [
                      '$attributionSource',
                      'shopify_webhook',
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },

        verifiedRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$event', 'purchase'] },
                  { $eq: ['$verified', true] },
                  {
                    $eq: [
                      '$attributionSource',
                      'shopify_webhook',
                    ],
                  },
                ],
              },
              {
                $ifNull: ['$revenue', 0],
              },
              0,
            ],
          },
        },
      },
    },

    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  return rows.map((row) => ({
    date: row._id,

    widgetOpens: row.widgetOpens,
    conversations: row.conversations,

    productViews: row.productViews,
    productClicks: row.productClicks,

    addToCarts: row.addToCarts,
    checkouts: row.checkouts,

    verifiedOrders: row.verifiedOrders,

    verifiedRevenue: Number(
      Number(row.verifiedRevenue || 0).toFixed(2)
    ),
  }));
}


// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

async function getDashboardSummary(
  shopOrDomain,
  options = {}
) {
  const shop = normalizeShop(shopOrDomain);

  const [
    salesFunnel,
    sales,
    products,
  ] = await Promise.all([
    getSalesFunnel(shop, options),
    getVerifiedSales(shop, options),
    getProductPerformance(shop, options),
  ]);

  return {
    shop,

    dateRange: {
      startDate: salesFunnel.startDate,
      endDate: salesFunnel.endDate,
    },

    funnel: salesFunnel.counts,

    conversionRates:
      salesFunnel.conversionRates,

    sales: {
      orders: sales.orders,
      revenue: sales.revenue,
    },

    products: {
      trackedProducts: products.length,
      topProducts: products.slice(0, 10),
    },
  };
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  FUNNEL_EVENTS,

  getDateRange,

  getFunnel,
  getUniqueSessionFunnel,
  getVerifiedSales,
  getSalesFunnel,
  getProductPerformance,
  getDailyPerformance,
  getDashboardSummary,
};
