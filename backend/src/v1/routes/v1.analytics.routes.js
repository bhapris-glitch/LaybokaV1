'use strict';

const express = require('express');

const {
  trackEvent,
  trackEvents
} = require('../controllers/v1.analytics.controller');

const router = express.Router();

// Track a single analytics event
router.post('/analytics/event', trackEvent);

// Track multiple analytics events in one request
router.post('/analytics/events', trackEvents);

module.exports = router;
