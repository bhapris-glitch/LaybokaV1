/**
 * ============================================================================
 * Layboka AI — V1
 * API Client
 * ============================================================================
 *
 * File:
 * frontend/src/lib/api.ts
 *
 * Purpose:
 * - Central Axios client for the V1 backend
 * - Centralize API configuration
 * - Handle credentials/cookies
 * - Provide consistent timeout and error handling
 * - Keep frontend services simple
 *
 * Backend:
 * Railway production backend
 *
 * ============================================================================
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
} from 'axios';

import {
  API_CONFIG,
} from './config';


// ============================================================================
// TYPES
// ============================================================================

export interface ApiErrorResponse {
  success?: boolean;
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
}


export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
  response?: ApiErrorResponse;
}


// ============================================================================
// AXIOS INSTANCE
// ============================================================================

export const api: AxiosInstance = axios.create({

  baseURL:
    `${API_CONFIG.baseUrl}/v1`,

  timeout:
    API_CONFIG.timeout,

  headers: {
    'Content-Type':
      'application/json',

    Accept:
      'application/json',
  },

  /*
   * Allows authentication/session cookies to be sent
   * when the backend uses cookie-based authentication.
   */

  withCredentials:
    true,
});


// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

api.interceptors.request.use(

  (config) => {

    /*
     * Do not manually attach secrets here.
     *
     * Shopify secrets, OpenAI API keys, Stripe secrets,
     * MongoDB credentials, etc. NEVER belong in the browser.
     */

    return config;
  },


  (error) => {

    return Promise.reject(
      error
    );
  }
);


// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================

api.interceptors.response.use(

  (response) => {

    return response;
  },


  async (error: AxiosError<ApiErrorResponse>) => {

    const status =
      error.response?.status;


    const responseData =
      error.response?.data;


    // ------------------------------------------------------------------------
    // NETWORK ERROR
    // ------------------------------------------------------------------------

    if (!error.response) {

      const networkError =
        new Error(
          'Unable to connect to Layboka AI. Please check your internet connection and try again.'
        ) as ApiError;

      networkError.code =
        error.code;

      return Promise.reject(
        networkError
      );
    }


    // ------------------------------------------------------------------------
    // 401 — UNAUTHORIZED
    // ------------------------------------------------------------------------

    if (status === 401) {

      const authError =
        new Error(
          responseData?.message ||
          responseData?.error ||
          'Your session has expired. Please sign in again.'
        ) as ApiError;

      authError.status =
        401;

      authError.code =
        responseData?.code ||
        'UNAUTHORIZED';

      authError.response =
        responseData;

      return Promise.reject(
        authError
      );
    }


    // ------------------------------------------------------------------------
    // 403 — FORBIDDEN
    // ------------------------------------------------------------------------

    if (status === 403) {

      const forbiddenError =
        new Error(
          responseData?.message ||
          responseData?.error ||
          'You do not have permission to perform this action.'
        ) as ApiError;

      forbiddenError.status =
        403;

      forbiddenError.code =
        responseData?.code ||
        'FORBIDDEN';

      forbiddenError.response =
        responseData;

      return Promise.reject(
        forbiddenError
      );
    }


    // ------------------------------------------------------------------------
    // 404 — NOT FOUND
    // ------------------------------------------------------------------------

    if (status === 404) {

      const notFoundError =
        new Error(
          responseData?.message ||
          responseData?.error ||
          'The requested resource was not found.'
        ) as ApiError;

      notFoundError.status =
        404;

      notFoundError.code =
        responseData?.code ||
        'NOT_FOUND';

      notFoundError.response =
        responseData;

      return Promise.reject(
        notFoundError
      );
    }


    // ------------------------------------------------------------------------
    // 429 — RATE LIMITED
    // ------------------------------------------------------------------------

    if (status === 429) {

      const rateLimitError =
        new Error(
          responseData?.message ||
          responseData?.error ||
          'Too many requests. Please wait a moment and try again.'
        ) as ApiError;

      rateLimitError.status =
        429;

      rateLimitError.code =
        responseData?.code ||
        'RATE_LIMITED';

      rateLimitError.response =
        responseData;

      return Promise.reject(
        rateLimitError
      );
    }


    // ------------------------------------------------------------------------
    // 5XX — BACKEND ERROR
    // ------------------------------------------------------------------------

    if (
      status &&
      status >= 500
    ) {

      const serverError =
        new Error(
          responseData?.message ||
          responseData?.error ||
          'Layboka AI is temporarily unavailable. Please try again shortly.'
        ) as ApiError;

      serverError.status =
        status;

      serverError.code =
        responseData?.code ||
        'SERVER_ERROR';

      serverError.response =
        responseData;

      return Promise.reject(
        serverError
      );
    }


    // ------------------------------------------------------------------------
    // GENERIC API ERROR
    // ------------------------------------------------------------------------

    const genericError =
      new Error(
        responseData?.message ||
        responseData?.error ||
        error.message ||
        'Something went wrong. Please try again.'
      ) as ApiError;

    genericError.status =
      status;

    genericError.code =
      responseData?.code ||
      error.code;

    genericError.details =
      responseData?.details;

    genericError.response =
      responseData;

    return Promise.reject(
      genericError
    );
  }
);


// ============================================================================
// REQUEST HELPERS
// ============================================================================

export async function apiGet<
  T = unknown
>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {

  const response =
    await api.get<T>(
      url,
      config
    );

  return response.data;
}


export async function apiPost<
  T = unknown,
  D = unknown
>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {

  const response =
    await api.post<T>(
      url,
      data,
      config
    );

  return response.data;
}


export async function apiPut<
  T = unknown,
  D = unknown
>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {

  const response =
    await api.put<T>(
      url,
      data,
      config
    );

  return response.data;
}


export async function apiPatch<
  T = unknown,
  D = unknown
>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {

  const response =
    await api.patch<T>(
      url,
      data,
      config
    );

  return response.data;
}


export async function apiDelete<
  T = unknown
>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {

  const response =
    await api.delete<T>(
      url,
      config
    );

  return response.data;
}


// ============================================================================
// ERROR HELPER
// ============================================================================

export function getApiErrorMessage(
  error: unknown
): string {

  if (
    error &&
    typeof error === 'object' &&
    'message' in error
  ) {

    const message =
      (error as { message?: unknown })
        .message;

    if (
      typeof message === 'string' &&
      message.trim()
    ) {

      return message;
    }
  }


  if (
    error instanceof AxiosError
  ) {

    const message =
      error.response?.data?.message ||
      error.response?.data?.error;

    if (
      typeof message === 'string' &&
      message.trim()
    ) {

      return message;
    }
  }


  return 'Something went wrong. Please try again.';
}


// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default api;

