/**
 * ============================================================================
 * Layboka AI — V1
 * Next.js Production Configuration
 * ============================================================================
 *
 * File:
 * frontend/next.config.ts
 *
 * Purpose:
 * - Production-ready Next.js configuration
 * - Vercel deployment compatibility
 * - Strict TypeScript/ESLint handling during builds
 * - Remote image configuration
 *
 * ============================================================================
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /*
   * --------------------------------------------------------------------------
   * React
   * --------------------------------------------------------------------------
   */

  reactStrictMode: true,


  /*
   * --------------------------------------------------------------------------
   * Image Optimization
   * --------------------------------------------------------------------------
   *
   * V1 can use local images from /public without configuration.
   *
   * Remote images can be added later when we know the exact production
   * image providers/domains.
   */

  images: {
    formats: [
      'image/avif',
      'image/webp',
    ],
  },


  /*
   * --------------------------------------------------------------------------
   * Security / Headers
   * --------------------------------------------------------------------------
   *
   * Basic security headers are applied to every frontend response.
   */

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
    ];
  },


  /*
   * --------------------------------------------------------------------------
   * Powered By Header
   * --------------------------------------------------------------------------
   */

  poweredByHeader: false,
};


export default nextConfig;
