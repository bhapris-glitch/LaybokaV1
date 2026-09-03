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
 * - Preserve raw Shopify webhook body
 * - Mount V1 API
 * - Provide health endpoints
 * - Gracefully shut down
 *
 * ============================================================================
 */

'use strict';


// ============================================================================
// ENVIRONMENT
// ============================================================================

require('dotenv').config();


// ============================================================================
// DEPENDENCIES
// ============================================================================

const express =
  require('express');

const cors =
  require('cors');

const helmet =
  require('helmet');

const cookieParser =
  require('cookie-parser');

const mongoose =
  require('mongoose');


// ============================================================================
// ROUTES
// ============================================================================
//
// IMPORTANT:
//
// Webhook routes and normal V1 routes are intentionally loaded separately.
//
// Shopify webhook:
//
//   v1.webhook.routes.js
//
// Normal V1 API:
//
//   v1.index.js
//
// This is necessary because Shopify webhook verification requires
// the original raw request body.
//

const v1Routes =
  require('./src/v1/routes/v1.index');

const v1WebhookRoutes =
  require('./src/v1/routes/v1.webhook.routes');


// ============================================================================
// APP
// ============================================================================

const app =
  express();


// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT =
  Number(
    process.env.PORT
  ) || 5000;

const NODE_ENV =
  process.env.NODE_ENV ||
  'development';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  '';


// ============================================================================
// STARTUP VALIDATION
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
//
// Required when running behind Railway, Render, Vercel proxy,
// Cloudflare, or another reverse proxy.
//

app.set(
  'trust proxy',
  1
);


// ============================================================================
// BASIC SECURITY
// ============================================================================

app.disable(
  'x-powered-by'
);


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

const allowedOrigins =
  FRONTEND_URL
    .split(',')
    .map(
      (origin) =>
        origin.trim()
    )
    .filter(Boolean);


app.use(
  cors({

    origin(
      origin,
      callback
    ) {

      // ----------------------------------------------------------------------
      // SERVER-TO-SERVER REQUEST
      // ----------------------------------------------------------------------

      if (!origin) {
        return callback(
          null,
          true
        );
      }


      // ----------------------------------------------------------------------
      // DEVELOPMENT
      // ----------------------------------------------------------------------

      if (
        NODE_ENV !== 'production' &&
        (
          origin.startsWith(
            'http://localhost:'
          ) ||
          origin.startsWith(
            'http://127.0.0.1:'
          )
        )
      ) {

        return callback(
          null,
          true
        );
      }


      // ----------------------------------------------------------------------
      // PRODUCTION WITHOUT CONFIGURED ORIGINS
      // ----------------------------------------------------------------------

      if (
        NODE_ENV === 'production' &&
        allowedOrigins.length === 0
      ) {

        return callback(
          new Error(
            'CORS origin not configured'
          )
        );
      }


      // ----------------------------------------------------------------------
      // ALLOWED ORIGIN
      // ----------------------------------------------------------------------

      if (
        allowedOrigins.includes(
          origin
        )
      ) {

        return callback(
          null,
          true
        );
      }


      // ----------------------------------------------------------------------
      // BLOCK
      // ----------------------------------------------------------------------

      return callback(
        new Error(
          'Not allowed by CORS'
        )
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

app.use(
  cookieParser()
);


// ============================================================================
// SHOPIFY WEBHOOK ROUTES
// ============================================================================
//
// VERY IMPORTANT:
//
// DO NOT MOVE THIS BELOW express.json().
//
// Shopify HMAC verification requires the original raw request body.
//
// The webhook route itself uses:
//
//   express.raw({
//     type: 'application/json'
//   })
//
// Therefore it must be registered before the global JSON parser.
//

app.use(
  '/v1',
  v1WebhookRoutes
);


// ============================================================================
// GLOBAL JSON BODY PARSER
// ============================================================================
//
// All normal V1 API requests use JSON.
//

app.use(
  express.json({
    limit: '2mb',
  })
);


// ============================================================================
// URL-ENCODED BODY PARSER
// ============================================================================

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

      service:
        'layboka-ai',

      version:
        'v1',

      status:
        'healthy',

      environment:
        NODE_ENV,

      timestamp:
        new Date().toISOString(),
    });
  }
);


// ============================================================================
// V1 API HEALTH
// ============================================================================

app.get(
  '/v1/health',
  (req, res) => {

    return res.status(200).json({

      success: true,

      service:
        'layboka-ai',

      version:
        'v1',

      status:
        'healthy',

      timestamp:
        new Date().toISOString(),
    });
  }
);


// ============================================================================
// NORMAL V1 API ROUTES
// ============================================================================
//
// v1.index.js contains:
//
// - install
// - chat
// - analytics
// - analytics dashboard
// - billing
// - webhook registration/status
//
// It intentionally does NOT contain the raw Shopify webhook receiver.
//

app.use(
  '/v1',
  v1Routes
);


// ============================================================================
// 404 HANDLER
// ============================================================================

app.use(
  (req, res) => {

    return res.status(404).json({

      success: false,

      error:
        'Route not found',

      path:
        req.originalUrl,
    });
  }
);


// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      '[Server Error]',
      error
    );


    // ------------------------------------------------------------------------
    // HEADERS ALREADY SENT
    // ------------------------------------------------------------------------

    if (
      res.headersSent
    ) {

      return next(
        error
      );
    }


    // ------------------------------------------------------------------------
    // CORS ERROR
    // ------------------------------------------------------------------------

    if (
      error.message ===
      'Not allowed by CORS'
    ) {

      return res.status(403).json({

        success: false,

        error:
          'CORS origin not allowed',
      });
    }


    if (
      error.message ===
      'CORS origin not configured'
    ) {

      return res.status(500).json({

        success: false,

        error:
          'CORS origin is not configured',
      });
    }


    // ------------------------------------------------------------------------
    // GENERIC ERROR
    // ------------------------------------------------------------------------

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
// DATABASE CONNECTION
// ============================================================================

async function connectDatabase() {

  await mongoose.connect(
    MONGODB_URI,
    {
      serverSelectionTimeoutMS:
        10000,
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

    // ------------------------------------------------------------------------
    // CONNECT DATABASE
    // ------------------------------------------------------------------------

    await connectDatabase();


    // ------------------------------------------------------------------------
    // START HTTP SERVER
    // ------------------------------------------------------------------------

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
            `API: /v1`
          );

          console.log(
            `Health: /health`
          );

          console.log(
            `V1 Health: /v1/health`
          );

          console.log(
            '=================================================='
          );
        }
      );


    // ========================================================================
    // GRACEFUL SHUTDOWN
    // ========================================================================

    async function shutdown(
      signal
    ) {

      console.log(
        `[Server] ${signal} received`
      );


      server.close(
        async () => {

          try {

            await mongoose
              .connection
              .close();


            console.log(
              '[MongoDB] Connection closed'
            );


            process.exit(
              0
            );

          } catch (error) {

            console.error(
              '[Shutdown] Error:',
              error.message
            );


            process.exit(
              1
            );
          }
        }
      );
    }


    process.once(
      'SIGTERM',
      () =>
        shutdown(
          'SIGTERM'
        )
    );


    process.once(
      'SIGINT',
      () =>
        shutdown(
          'SIGINT'
        )
    );

  } catch (error) {

    console.error(
      '[Server] Startup failed:',
      error
    );

    process.exit(
      1
    );
  }
}


// ============================================================================
// START
// ============================================================================

startServer();


// ============================================================================
// EXPORT
// ============================================================================

module.exports =
  app;
