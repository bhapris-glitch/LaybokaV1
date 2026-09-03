'use strict';

/**
 * ============================================================================
 * Layboka AI — V1 Analytics Service
 * ============================================================================
 *
 * File:
 * backend/src/v1/services/v1.analytics.service.js
 *
 * Purpose:
 * - Aggregate V1 funnel events
 * - Calculate conversion metrics
 * - Calculate product performance
 * - Calculate session-level funnel metrics
 * - Keep analytics logic separate from controllers
 *
 * IMPORTANT:
 * - Browser purchase events are NOT treated as verified revenue.
 * - Verified purchases must come from Shopify webhook processing.
 * - This service only reads analytics data.
 * ============================================================================
 */

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
  'purchase'
]);


// ============================================================================
// HELPERS
// ============================================================================

function normalizeShop(shop) {
  if (!shop || typeof shop !== 'string') {
    throw new Error('Shop domain is required.');
  }

  return shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0];
}


function getDateRange(options = {}) {
  const now = new Date();

  const endDate = options.endDate
    ? new Date(options.endDate)
    : now;

  const startDate = options.startDate
    ? new Date(options.startDate)
    : new Date(
        endDate.getTime() - (30 * 24 * 60 * 60 * 1000)
      );

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    throw new Error('Invalid analytics date range.');
  }

  if (startDate > endDate) {
    throw new Error('Analytics start date cannot be after end date.');
  }

  return {
    startDate,
    endDate
  };
}


function buildDateFilter(startDate, endDate) {
  return {
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  };
}


function calculateRate(numerator, denominator) {
  if (!denominator || denominator <= 0) {
    return 0;
  }

  return Number(
    ((numerator / denominator) * 100).toFixed(2)
  );
}


function calculateRevenue(events) {
  return events.reduce((total, event) => {
    const revenue = Number(event.revenue);

    if (!Number.isFinite(revenue) || revenue < 0) {
      return total;
    }

    return total + revenue;
  }, 0);
}


function roundMoney(value) {
  return Number(
    Number(value || 0).toFixed(2)
  );
}


// ============================================================================
// GET RAW FUNNEL COUNTS
// ============================================================================

/**
 * Returns event counts for the selected period.
 *
 * Example:
 *
 * {
 *   widget_open: 1000,
 *   conversation: 700,
 *   product_view: 450,
 *   product_click: 300,
 *   add_to_cart: 120,
 *   checkout: 80,
 *   purchase: 45
 * }
 */
async function getFunnelCounts(shop, options = {}) {
  const normalizedShop = normalizeShop(shop);
  const { startDate, endDate } = getDateRange(options);

  const filter = {
    shop: normalizedShop,
    event: {
      $in: FUNNEL_EVENTS
    },
    ...buildDateFilter(startDate, endDate)
  };

  const results = await V1AnalyticsEvent.aggregate([
    {
      $match: filter
    },
    {
      $group: {
        _id: '$event',
        count: {
          $sum: 1
        }
      }
    }
  ]);

  const counts = {};

  for (const event of FUNNEL_EVENTS) {
    counts[event] = 0;
  }

  for (const result of results) {
    counts[result._id] = result.count;
  }

  return {
    shop: normalizedShop,
    startDate,
    endDate,
    counts
  };
}


// ============================================================================
// UNIQUE SESSION FUNNEL
// ============================================================================

/**
 * Counts unique sessions that reached each funnel stage.
 *
 * This is more useful than raw event counts because one customer
 * may trigger the same event multiple times.
 */
async function getUniqueSessionFunnel(shop, options = {}) {
  const normalizedShop = normalizeShop(shop);
  const { startDate, endDate } = getDateRange(options);

  const results = await V1AnalyticsEvent.aggregate([
    {
      $match: {
        shop: normalizedShop,
        event: {
          $in: FUNNEL_EVENTS
        },
        ...buildDateFilter(startDate, endDate)
      }
    },
    {
      $group: {
        _id: {
          event: '$event',
          sessionId: '$sessionId'
        }
      }
    },
    {
      $group: {
        _id: '$_id.event',
        sessions: {
          $sum: 1
        }
      }
    }
  ]);

  const funnel = {};

  for (const event of FUNNEL_EVENTS) {
    funnel[event] = 0;
  }

  for (const result of results) {
    funnel[result._id] = result.sessions;
  }

  return {
    shop: normalizedShop,
    startDate,
    endDate,
    funnel
  };
}


// ============================================================================
// VERIFIED SALES
// ============================================================================

/**
 * Returns VERIFIED Shopify purchase revenue only.
 *
 * Browser-generated purchase events are deliberately excluded.
 */
async function getVerifiedSales(shop, options = {}) {
  const normalizedShop = normalizeShop(shop);
  const { startDate, endDate } = getDateRange(options);

  const purchases = await V1AnalyticsEvent
    .find({
      shop: normalizedShop,
      event: 'purchase',
      verified: true,
      attributionSource: 'shopify_webhook',
      ...buildDateFilter(startDate, endDate)
    })
    .select({
      orderId: 1,
      orderNumber: 1,
      revenue: 1,
      currency: 1,
      sessionId: 1,
      createdAt: 1
    })
    .sort({
      createdAt: -1
    })
    .lean();

  const revenue = calculateRevenue(purchases);

  return {
    shop: normalizedShop,
    startDate,
    endDate,
    purchaseCount: purchases.length,
    revenue: roundMoney(revenue),
    currency: purchases[0]?.currency || 'USD',
    purchases
  };
}


// ============================================================================
// COMPLETE SALES FUNNEL
// ============================================================================

/**
 * Main dashboard funnel.
 */
async function getSalesFunnel(shop, options = {}) {
  const normalizedShop = normalizeShop(shop);

  const [
    eventFunnel,
    sessionFunnel,
    verifiedSales
  ] = await Promise.all([
    getFunnelCounts(normalizedShop, options),
    getUniqueSessionFunnel(normalizedShop, options),
    getVerifiedSales(normalizedShop, options)
  ]);

  const sessions = sessionFunnel.funnel;

  return {
    shop: normalizedShop,

    period: {
      startDate: eventFunnel.startDate,
      endDate: eventFunnel.endDate
    },

    events: eventFunnel.counts,

    uniqueSessions: sessions,

    conversion: {
      conversationRate: calculateRate(
        sessions.conversation,
        sessions.widget_open
      ),

      productViewRate: calculateRate(
        sessions.product_view,
        sessions.conversation
      ),

      productClickRate: calculateRate(
        sessions.product_click,
        sessions.product_view
      ),

      addToCartRate: calculateRate(
        sessions.add_to_cart,
        sessions.product_click
      ),

      checkoutRate: calculateRate(
        sessions.checkout,
        sessions.add_to_cart
      ),

      purchaseRate: calculateRate(
        sessions.purchase,
        sessions.checkout
      ),

      overallConversionRate: calculateRate(
        sessions.purchase,
        sessions.widget_open
      )
    },

    sales: {
      verifiedOrders: verifiedSales.purchaseCount,
      verifiedRevenue: verifiedSales.revenue,
      currency: verifiedSales.currency
    }
  };
}


// ============================================================================
// PRODUCT PERFORMANCE
// ============================================================================

/**
 * Shows which products are receiving attention and generating actions.
 */
async function getProductPerformance(shop, options = {}) {
  const normalizedShop = normalizeShop(shop);
  const { startDate, endDate } = getDateRange(options);

  const results = await V1AnalyticsEvent.aggregate([
    {
      $match: {
        shop: normalizedShop,
        ...buildDateFilter(startDate, endDate),
        event: {
          $in: [
            'product_view',
            'product_click',
            'add_to_cart',
            'checkout',
            'purchase'
          ]
        },
        $or: [
          {
            productId: {
              $exists: true,
              $ne: null
            }
          },
          {
            shopifyProductId: {
              $exists: true,
              $ne: null
            }
          }
        ]
      }
    },
    {
      $group: {
        _id: {
          productId: '$productId',
          shopifyProductId: '$shopifyProductId'
        },

        views: {
          $sum: {
            $cond: [
              {
                $eq: ['$event', 'product_view']
              },
              1,
              0
            ]
          }
        },

        clicks: {
          $sum: {
            $cond: [
              {
                $eq: ['$event', 'product_click']
              },
              1,
              0
            ]
          }
        },

        addToCart: {
          $sum: {
            $cond: [
              {
                $eq: ['$event', 'add_to_cart']
              },
              1,
              0
            ]
          }
        },

        checkout: {
          $sum: {
            $cond: [
              {
                $eq: ['$event', 'checkout']
              },
              1,
              0
            ]
          }
        },

        purchases: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $eq: ['$event', 'purchase']
                  },
                  {
                    $eq: ['$verified', true]
                  }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },

    {
      $sort: {
        purchases: -1,
        addToCart: -1,
        clicks: -1,
        views: -1
      }
    },

    {
      $limit: 100
    }
  ]);

  return results.map((item) => ({
    productId: item._id.productId || null,
    shopifyProductId: item._id.shopifyProductId || null,

    views: item.views,
    clicks: item.clicks,
    addToCart: item.addToCart,
    checkout: item.checkout,
    verifiedPurchases: item.purchases,

    clickRate: calculateRate(
      item.clicks,
      item.views
    ),

    addToCartRate: calculateRate(
      item.addToCart,
      item.clicks
    ),

    purchaseRate: calculateRate(
      item.purchases,
      item.views
    )
  }));
}


// ============================================================================
// DAILY PERFORMANCE
// ============================================================================

/**
 * Returns daily funnel activity.
 *
 * Useful for a small dashboard chart.
 */
async function getDailyPerformance(shop, options = {}) {
  const normalizedShop = normalizeShop(shop);
  const { startDate, endDate } = getDateRange(options);

  const results = await V1AnalyticsEvent.aggregate([
    {
      $match: {
        shop: normalizedShop,
        ...buildDateFilter(startDate, endDate),
        event: {
          $in: FUNNEL_EVENTS
        }
      }
    },

    {
      $group: {
        _id: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          event: '$event'
        },

        count: {
          $sum: 1
        }
      }
    },

    {
      $sort: {
        '_id.date': 1
      }
    }
  ]);

  const days = {};

  for (const result of results) {
    const date = result._id.date;

    if (!days[date]) {
      days[date] = {};

      for (const event of FUNNEL_EVENTS) {
        days[date][event] = 0;
      }
    }

    days[date][result._id.event] = result.count;
  }

  return Object.entries(days).map(
    ([date, metrics]) => ({
      date,
      ...metrics
    })
  );
}


// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

/**
 * Small summary designed for the merchant dashboard.
 */
async function getDashboardSummary(shop, options = {}) {
  const funnel = await getSalesFunnel(
    shop,
    options
  );

  return {
    period: funnel.period,

    visitors: funnel.uniqueSessions.widget_open,

    conversations:
      funnel.uniqueSessions.conversation,

    productsViewed:
      funnel.uniqueSessions.product_view,

    addToCarts:
      funnel.uniqueSessions.add_to_cart,

    checkouts:
      funnel.uniqueSessions.checkout,

    orders:
      funnel.sales.verifiedOrders,

    revenue:
      funnel.sales.verifiedRevenue,

    currency:
      funnel.sales.currency,

    conversionRate:
      funnel.conversion.overallConversionRate
  };
}


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  FUNNEL_EVENTS,

  getDateRange,

  getFunnelCounts,

  getUniqueSessionFunnel,

  getVerifiedSales,

  getSalesFunnel,

  getProductPerformance,

  getDailyPerformance,

  getDashboardSummary
};
