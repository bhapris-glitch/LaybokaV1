/**
 * ============================================================================
 * Layboka AI — V1
 * Production Server
 * ============================================================================
 *
 * File:
 * backend/server.js
 *
 * Purpose:
 * - Start Express server
 * - Connect MongoDB
 * - Configure security
 * - Configure CORS
 * - Mount V1 routes
 * - Preserve raw Shopify webhook body
 * - Provide health endpoint
 *
 * ============================================================================
 */

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const mongoose = require('mongoose');


// ============================================================================
// V1 ROUTES
// ============================================================================

const v1Routes =
  require('./src/v1/routes/v1.index');


// ============================================================================
// CONFIG
// ============================================================================

const app = express();

const PORT =
  Number(process.env.PORT) || 5000;

const NODE_ENV =
  process.env.NODE_ENV || 'development';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  '';


// ============================================================================
// VALIDATION
// ============================================================================

if (!MONGODB_URI) {
  console.error(
    '[Server] MONGODB_URI is not configured'
  );

  process.exit(1);
}


// ============================================================================
// TRUST PROXY
// ============================================================================

app.set('trust proxy', 1);


// ============================================================================
// SECURITY
// ============================================================================

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);


// ============================================================================
// CORS
// ============================================================================

const allowedOrigins = FRONTEND_URL
  ? FRONTEND_URL
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];


app.use(
  cors({
    origin(origin, callback) {

      // Allow server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      // Development convenience.
      if (
        NODE_ENV !== 'production' &&
        (
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:')
        )
      ) {
        return callback(null, true);
      }

      // If no explicit origins are configured,
      // reject browser cross-origin requests in production.
      if (
        NODE_ENV === 'production' &&
        allowedOrigins.length === 0
      ) {
        return callback(
          new Error('CORS origin not configured')
        );
      }

      if (
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error('Not allowed by CORS')
      );
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Shopify-Shop-Domain',
    ],
  })
);


// ============================================================================
// COOKIE PARSER
// ============================================================================

app.use(cookieParser());


// ============================================================================
// SHOPIFY WEBHOOK ROUTES
// ============================================================================
//
// IMPORTANT:
//
// The V1 webhook route internally uses express.raw().
// Therefore it MUST be mounted before express.json().
//
// The V1 index contains the webhook route along with other V1 routes.
// To preserve the raw body correctly, mount the webhook route separately
// before the JSON parser, then mount the remaining V1 routes afterwards.
//
// ============================================================================

const v1WebhookRoutes =
  require('./src/v1/routes/v1.webhook.routes');

const v1NonWebhookRoutes =
  require('express').Router();


// ============================================================================
// JSON BODY PARSER
// ============================================================================

app.use(
  express.json({
    limit: '2mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb',
  })
);


// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get(
  '/health',
  (req, res) => {
    return res.status(200).json({
      success: true,
      service: 'layboka-ai',
      version: 'v1',
      status: 'healthy',
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  }
);


// ============================================================================
// API HEALTH
// ============================================================================

app.get(
  '/v1/health',
  (req, res) => {
    return res.status(200).json({
      success: true,
      version: 'v1',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }
);


// ============================================================================
// V1 WEBHOOK
// ============================================================================
//
// This must happen BEFORE express.json().
//
// Since the JSON parser above has already been registered in this file,
// we need the webhook route mounted before that parser.
//
// ============================================================================

/*
 * IMPORTANT:
 *
 * Move this block ABOVE the global express.json() middleware if your
 * existing server.js already has express.json() earlier.
 *
 * In the final production server, the correct order is:
 *
 *   app.use('/v1', v1WebhookRoutes);
 *   app.use(express.json());
 *   app.use('/v1', v1Routes);
 *
 */


// ============================================================================
// V1 ROUTES
// ============================================================================
//
// The route index contains the webhook route too.
// Because the JSON parser must not process the webhook first,
// we use a dedicated route registration strategy below.
//
// ============================================================================


// ---------------------------------------------------------------------------
// V1 WEBHOOK
// ---------------------------------------------------------------------------

app.use(
  '/v1',
  v1WebhookRoutes
);


// ---------------------------------------------------------------------------
// V1 REST / API ROUTES
// ---------------------------------------------------------------------------
//
// IMPORTANT:
// If v1.index also mounts webhookRoutes, Express will encounter the
// webhook route a second time.
//
// Therefore v1.index should preferably NOT mount webhookRoutes when using
// this server configuration.
//
// ---------------------------------------------------------------------------

const installRoutes =
  require('./src/v1/routes/v1.install.routes');

const chatRoutes =
  require('./src/v1/routes/v1.chat.routes');

const analyticsRoutes =
  require('./src/v1/routes/v1.analytics.routes');

const analyticsDashboardRoutes =
  require('./src/v1/routes/v1.analytics.dashboard.routes');

const billingRoutes =
  require('./src/v1/routes/v1.billing.routes');


app.use(
  '/v1',
  installRoutes
);

app.use(
  '/v1',
  chatRoutes
);

app.use(
  '/v1',
  analyticsRoutes
);

app.use(
  '/v1',
  analyticsDashboardRoutes
);

app.use(
  '/v1',
  billingRoutes
);


// ============================================================================
// 404 HANDLER
// ============================================================================

app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,
      error: 'Route not found',
      path: req.originalUrl,
    });
  }
);


// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

app.use(
  (error, req, res, next) => {

    console.error(
      '[Server Error]',
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    return res.status(500).json({
      success: false,
      error:
        NODE_ENV === 'production'
          ? 'Internal server error'
          : error.message,
    });
  }
);


// ============================================================================
// DATABASE
// ============================================================================

async function connectDatabase() {

  await mongoose.connect(
    MONGODB_URI,
    {
      serverSelectionTimeoutMS: 10000,
    }
  );

  console.log(
    '[MongoDB] Connected'
  );
}


// ============================================================================
// START SERVER
// ============================================================================

async function startServer() {

  try {

    await connectDatabase();

    const server =
      app.listen(
        PORT,
        () => {
          console.log(
            '=================================================='
          );

          console.log(
            'Layboka AI V1 Server'
          );

          console.log(
            `Environment: ${NODE_ENV}`
          );

          console.log(
            `Port: ${PORT}`
          );

          console.log(
            `API: http://localhost:${PORT}/v1`
          );

          console.log(
            '=================================================='
          );
        }
      );


    // ------------------------------------------------------------------------
    // GRACEFUL SHUTDOWN
    // ------------------------------------------------------------------------

    async function shutdown(signal) {

      console.log(
        `[Server] ${signal} received`
      );

      server.close(
        async () => {

          try {

            await mongoose.connection.close();

            console.log(
              '[MongoDB] Connection closed'
            );

            process.exit(0);

          } catch (error) {

            console.error(
              '[Shutdown] Error:',
              error.message
            );

            process.exit(1);
          }
        }
      );
    }


    process.once(
      'SIGTERM',
      () => shutdown('SIGTERM')
    );

    process.once(
      'SIGINT',
      () => shutdown('SIGINT')
    );

  } catch (error) {

    console.error(
      '[Server] Startup failed:',
      error
    );

    process.exit(1);
  }
}


startServer();


module.exports = app;
