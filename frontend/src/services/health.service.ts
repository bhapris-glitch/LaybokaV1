/**
 * ============================================================================
 * Layboka AI — V1
 * Backend Health Service
 * ============================================================================
 *
 * File:
 * frontend/src/services/health.service.ts
 *
 * Purpose:
 * - Check V1 backend availability
 * - Provide a simple health status for the frontend
 * - Support deployment/debugging
 *
 * IMPORTANT:
 * This endpoint does not expose secrets or internal infrastructure details.
 *
 * ============================================================================
 */

'use client';

import {
  apiService,
} from './api.service';

import {
  API_ENDPOINTS,
} from '@/lib/config';


// ============================================================================
// TYPES
// ============================================================================

export interface HealthResponse {

  success?: boolean;

  status?: string;

  message?: string;

  service?: string;

  version?: string;

  timestamp?: string;

  [key: string]: unknown;
}


export interface BackendHealth {

  online: boolean;

  response?: HealthResponse;

  error?: string;
}


// ============================================================================
// CHECK BACKEND
// ============================================================================

export async function checkBackendHealth(): Promise<HealthResponse> {

  return await apiService.get<HealthResponse>(
    API_ENDPOINTS.health
  );
}


// ============================================================================
// SAFE HEALTH CHECK
// ============================================================================
//
// This version never throws. Useful for dashboard indicators and startup
// checks where backend availability should not crash the application.
//

export async function safeCheckBackendHealth(): Promise<BackendHealth> {

  try {

    const response =
      await checkBackendHealth();


    return {

      online:
        true,

      response,
    };

  } catch (error) {

    return {

      online:
        false,

      error:
        error instanceof Error
          ? error.message
          : 'Backend is currently unavailable.',
    };
  }
}


// ============================================================================
// SIMPLE ONLINE CHECK
// ============================================================================

export async function isBackendOnline(): Promise<boolean> {

  const result =
    await safeCheckBackendHealth();


  return result.online;
}


// ============================================================================
// EXPORT DEFAULT
// ============================================================================

const healthService = {

  checkBackendHealth,

  safeCheckBackendHealth,

  isBackendOnline,
};


export default healthService;
