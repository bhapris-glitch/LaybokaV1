/**
 * ============================================================================
 * Layboka AI — V1
 * API Service
 * ============================================================================
 *
 * File:
 * frontend/src/services/api.service.ts
 *
 * Purpose:
 * - Provide a clean API service layer
 * - Keep Axios implementation out of UI components
 * - Standardize GET / POST / PUT / PATCH / DELETE requests
 * - Provide consistent error handling
 *
 * ============================================================================
 */

'use client';

import {
  AxiosRequestConfig,
} from 'axios';

import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  getApiErrorMessage,
} from '@/lib/api';


// ============================================================================
// TYPES
// ============================================================================

export interface ApiRequestOptions
  extends AxiosRequestConfig {
  signal?: AbortSignal;
}


// ============================================================================
// API SERVICE
// ============================================================================

class ApiService {

  // ==========================================================================
  // GET
  // ==========================================================================

  async get<T = unknown>(
    endpoint: string,
    config?: ApiRequestOptions
  ): Promise<T> {

    try {

      return await apiGet<T>(
        endpoint,
        config
      );

    } catch (error) {

      throw this.normalizeError(
        error
      );
    }
  }


  // ==========================================================================
  // POST
  // ==========================================================================

  async post<
    T = unknown,
    D = unknown
  >(
    endpoint: string,
    data?: D,
    config?: ApiRequestOptions
  ): Promise<T> {

    try {

      return await apiPost<T, D>(
        endpoint,
        data,
        config
      );

    } catch (error) {

      throw this.normalizeError(
        error
      );
    }
  }


  // ==========================================================================
  // PUT
  // ==========================================================================

  async put<
    T = unknown,
    D = unknown
  >(
    endpoint: string,
    data?: D,
    config?: ApiRequestOptions
  ): Promise<T> {

    try {

      return await apiPut<T, D>(
        endpoint,
        data,
        config
      );

    } catch (error) {

      throw this.normalizeError(
        error
      );
    }
  }


  // ==========================================================================
  // PATCH
  // ==========================================================================

  async patch<
    T = unknown,
    D = unknown
  >(
    endpoint: string,
    data?: D,
    config?: ApiRequestOptions
  ): Promise<T> {

    try {

      return await apiPatch<T, D>(
        endpoint,
        data,
        config
      );

    } catch (error) {

      throw this.normalizeError(
        error
      );
    }
  }


  // ==========================================================================
  // DELETE
  // ==========================================================================

  async delete<T = unknown>(
    endpoint: string,
    config?: ApiRequestOptions
  ): Promise<T> {

    try {

      return await apiDelete<T>(
        endpoint,
        config
      );

    } catch (error) {

      throw this.normalizeError(
        error
      );
    }
  }


  // ==========================================================================
  // ERROR NORMALIZATION
  // ==========================================================================

  private normalizeError(
    error: unknown
  ): Error {

    const message =
      getApiErrorMessage(
        error
      );

    return new Error(
      message
    );
  }
}


// ============================================================================
// SINGLETON
// ============================================================================

export const apiService =
  new ApiService();


// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default apiService;

