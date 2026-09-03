'use strict';

const express = require('express');

const {
  trackEvent,
  trackEvents,
} = require('../controllers/v1.analytics.controller');

const router = express.Router();


// ============================================================================
// ANALYTICS EVENT ROUTES
// ============================================================================

// Track one event.
router.post(
  '/analytics/event',
  trackEvent
);


// Track multiple events in one request.
router.post(
  '/analytics/events',
  trackEvents
);


module.exports = router;
