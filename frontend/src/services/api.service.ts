/**
 * ============================================================================
 * LaybokaV1 — V1
 * API Service
 * ============================================================================
 *
 * File:
 * frontend/src/services/api.service.ts
 *
 * Purpose:
 * - Central HTTP client for the V1 frontend
 * - GET / POST / PATCH / PUT / DELETE
 * - JSON request/response handling
 * - Cookie/session support
 * - Request timeout
 * - Consistent API errors
 * - No dependency on Axios
 *
 * ============================================================================
 */

'use client';


// ============================================================================
// CONFIG
// ============================================================================

import {
  API_CONFIG,
} from '@/lib/config';


// ============================================================================
// TYPES
// ============================================================================

export interface ApiErrorResponse {

  success?: boolean;

  message?: string;

  error?: string;

  code?: string;

  statusCode?: number;

  details?: unknown;

}


export class ApiError
  extends Error {

  public readonly status: number;

  public readonly code?: string;

  public readonly details?: unknown;

  public readonly data?: unknown;


  constructor(
    message: string,
    status: number,
    options?: {
      code?: string;
      details?: unknown;
      data?: unknown;
    }
  ) {

    super(message);

    this.name = 'ApiError';

    this.status =
      status;

    this.code =
      options?.code;

    this.details =
      options?.details;

    this.data =
      options?.data;


    Object.setPrototypeOf(
      this,
      ApiError.prototype
    );
  }

}


export interface RequestOptions
  extends Omit<
    RequestInit,
    'body'
  > {

  body?: unknown;

  timeout?: number;

  /**
   * Prevent automatic JSON parsing.
   */
  responseType?:
    | 'json'
    | 'text';

}


export interface ApiResponse<T = unknown> {

  success?: boolean;

  message?: string;

  data?: T;

  [key: string]: unknown;

}


// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_TIMEOUT =
  20_000;


// ============================================================================
// HELPERS
// ============================================================================

function isBrowser():
  boolean {

  return (
    typeof window !==
    'undefined'
  );
}


function isAbortError(
  error: unknown
): boolean {

  return (
    error instanceof DOMException &&
    error.name === 'AbortError'
  );
}


function isFormData(
  value: unknown
): value is FormData {

  return (
    typeof FormData !==
      'undefined' &&
    value instanceof FormData
  );
}


function isBlob(
  value: unknown
): value is Blob {

  return (
    typeof Blob !==
      'undefined' &&
    value instanceof Blob
  );
}


function isURLSearchParams(
  value: unknown
): value is URLSearchParams {

  return (
    typeof URLSearchParams !==
      'undefined' &&
    value instanceof URLSearchParams
  );
}


// ============================================================================
// ERROR MESSAGE
// ============================================================================

function getErrorMessage(
  data: unknown,
  fallback: string
): string {

  if (
    typeof data ===
    'string' &&
    data.trim()
  ) {

    return data;
  }


  if (
    data &&
    typeof data === 'object'
  ) {

    const payload =
      data as ApiErrorResponse;


    if (
      typeof payload.message ===
      'string' &&
      payload.message.trim()
    ) {

      return payload.message;
    }


    if (
      typeof payload.error ===
      'string' &&
      payload.error.trim()
    ) {

      return payload.error;
    }

  }


  return fallback;
}


// ============================================================================
// QUERY STRING
// ============================================================================

export function buildQueryString(
  params?: Record<
    string,
    unknown
  >
): string {

  if (!params) {

    return '';
  }


  const searchParams =
    new URLSearchParams();


  Object.entries(
    params
  ).forEach(
    ([key, value]) => {

      if (
        value ===
        undefined ||
        value ===
        null
      ) {

        return;
      }


      if (
        Array.isArray(
          value
        )
      ) {

        value.forEach(
          (item) => {

            if (
              item !==
              undefined &&
              item !==
              null
            ) {

              searchParams.append(
                key,
                String(item)
              );
            }

          }
        );

        return;
      }


      searchParams.set(
        key,
        String(value)
      );

    }
  );


  const query =
    searchParams.toString();


  return query
    ? `?${query}`
    : '';
}


// ============================================================================
// URL BUILDER
// ============================================================================

export function appendQuery(
  url: string,
  params?: Record<
    string,
    unknown
  >
): string {

  const query =
    buildQueryString(
      params
    );


  if (!query) {

    return url;
  }


  return (
    url.includes('?')
      ? `${url}&${query.slice(1)}`
      : `${url}${query}`
  );
}


// ============================================================================
// REQUEST BODY
// ============================================================================

function prepareBody(
  body: unknown,
  headers: Headers
): BodyInit | undefined {

  if (
    body ===
    undefined ||
    body ===
    null
  ) {

    return undefined;
  }


  if (
    typeof body ===
    'string'
  ) {

    return body;
  }


  if (
    isFormData(body)
  ) {

    /*
     * Browser must set the multipart boundary automatically.
     */
    headers.delete(
      'Content-Type'
    );

    return body;
  }


  if (
    isBlob(body)
  ) {

    headers.delete(
      'Content-Type'
    );

    return body;
  }


  if (
    isURLSearchParams(body)
  ) {

    if (
      !headers.has(
        'Content-Type'
      )
    ) {

      headers.set(
        'Content-Type',
        'application/x-www-form-urlencoded;charset=UTF-8'
      );

    }

    return body;
  }


  if (
    typeof body ===
    'object'
  ) {

    if (
      !headers.has(
        'Content-Type'
      )
    ) {

      headers.set(
        'Content-Type',
        'application/json'
      );

    }


    return JSON.stringify(
      body
    );
  }


  return String(
    body
  );
}


// ============================================================================
// RESPONSE PARSER
// ============================================================================

async function parseResponse(
  response: Response,
  responseType:
    | 'json'
    | 'text'
): Promise<unknown> {

  if (
    responseType ===
    'text'
  ) {

    return response.text();
  }


  const contentType =
    response.headers.get(
      'content-type'
    ) || '';


  /*
   * Some backend errors can be returned as plain text.
   */
  if (
    !contentType.includes(
      'application/json'
    )
  ) {

    const text =
      await response.text();


    if (!text) {

      return null;
    }


    try {

      return JSON.parse(
        text
      );

    } catch {

      return text;
    }

  }


  const text =
    await response.text();


  if (!text) {

    return null;
  }


  try {

    return JSON.parse(
      text
    );

  } catch {

    return text;
  }

}


// ============================================================================
// API SERVICE
// ============================================================================

class ApiService {

  private readonly defaultHeaders:
    Record<string, string>;


  constructor() {

    this.defaultHeaders = {

      ...API_CONFIG.headers,

    };

  }


  // ==========================================================================
  // CORE REQUEST
  // ==========================================================================

  async request<T = unknown>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {

    if (!url) {

      throw new ApiError(
        'API URL is required.',
        0,
        {
          code:
            'INVALID_API_URL',
        }
      );

    }


    const controller =
      new AbortController();


    const timeout =
      options.timeout ??
      DEFAULT_TIMEOUT;


    const timeoutId =
      setTimeout(
        () => {
          controller.abort();
        },
        timeout
      );


    const headers =
      new Headers(
        this.defaultHeaders
      );


    /*
     * Allow individual requests to override headers.
     */
    if (
      options.headers
    ) {

      const customHeaders =
        new Headers(
          options.headers
        );


      customHeaders.forEach(
        (value, key) => {

          headers.set(
            key,
            value
          );

        }
      );

    }


    const body =
      prepareBody(
        options.body,
        headers
      );


    /*
     * Credentials are important for V1 if the backend uses
     * HTTP-only cookies/session cookies.
     */
    const credentials =
      options.credentials ??
      API_CONFIG.credentials;


    const requestInit:
      RequestInit = {

      ...options,

      body,

      headers,

      credentials,

      signal:
        controller.signal,

    };


    /*
     * Do not accidentally forward our custom options to fetch.
     */
    delete (
      requestInit as RequestInit &
        {
          timeout?: number;
          responseType?: string;
        }
    ).timeout;


    delete (
      requestInit as RequestInit &
        {
          timeout?: number;
          responseType?: string;
        }
    ).responseType;


    try {

      const response =
        await fetch(
          url,
          requestInit
        );


      const data =
        await parseResponse(
          response,
          options.responseType ??
            'json'
        );


      if (
        !response.ok
      ) {

        const payload =
          data as
            | ApiErrorResponse
            | string
            | null;


        throw new ApiError(
          getErrorMessage(
            payload,
            `Request failed with status ${response.status}.`
          ),
          response.status,
          {
            code:
              payload &&
              typeof payload ===
                'object'
                ? payload.code
                : undefined,

            details:
              payload &&
              typeof payload ===
                'object'
                ? payload.details
                : undefined,

            data:
              payload,
          }
        );

      }


      return data as T;

    } catch (error) {

      if (
        error instanceof ApiError
      ) {

        throw error;
      }


      if (
        isAbortError(
          error
        )
      ) {

        throw new ApiError(
          `Request timed out after ${timeout / 1000} seconds.`,
          408,
          {
            code:
              'REQUEST_TIMEOUT',
          }
        );

      }


      if (
        error instanceof TypeError
      ) {

        throw new ApiError(
          'Unable to connect to the LaybokaV1 backend.',
          0,
          {
            code:
              'NETWORK_ERROR',
            details:
              error.message,
          }
        );

      }


      throw new ApiError(
        'An unexpected API error occurred.',
        0,
        {
          code:
            'UNKNOWN_ERROR',
          details:
            error,
        }
      );

    } finally {

      clearTimeout(
        timeoutId
      );

    }

  }


  // ==========================================================================
  // GET
  // ==========================================================================

  async get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<T> {

    /*
     * Existing V1 services historically pass query parameters in either
     * of these forms:
     *
     *   apiService.get(url, { shop: '...' })
     *   apiService.get(url, { params: { shop: '...' } })
     *
     * Support both forms so existing services do not need to be rewritten.
     */
    const query =
      params &&
      typeof params === 'object' &&
      'params' in params &&
      params.params &&
      typeof params.params === 'object'
        ? params.params as Record<string, unknown>
        : params;

    return this.request<T>(
      appendQuery(url, query),
      {
        ...options,
        method: 'GET',
      }
    );

  }


  // ==========================================================================
  // POST
  // ==========================================================================

  async post<TResponse = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    options: RequestOptions = {}
  ): Promise<TResponse> {

    return this.request<TResponse>(
      url,
      {
        ...options,

        method:
          'POST',

        body,
      }
    );

  }


  // ==========================================================================
  // PUT
  // ==========================================================================

  async put<TResponse = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    options: RequestOptions = {}
  ): Promise<TResponse> {

    return this.request<TResponse>(
      url,
      {
        ...options,

        method:
          'PUT',

        body,
      }
    );

  }


  // ==========================================================================
  // PATCH
  // ==========================================================================

  async patch<TResponse = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    options: RequestOptions = {}
  ): Promise<TResponse> {

    return this.request<TResponse>(
      url,
      {
        ...options,

        method:
          'PATCH',

        body,
      }
    );

  }


  // ==========================================================================
  // DELETE
  // ==========================================================================

  async delete<T = unknown>(
    url: string,
    options: Omit<
      RequestOptions,
      'body'
    > = {}
  ): Promise<T> {

    return this.request<T>(
      url,
      {
        ...options,

        method:
          'DELETE',
      }
    );

  }


  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  async healthCheck<T = unknown>():
    Promise<T> {

    return this.get<T>(
      '/health'
    );

  }


  // ==========================================================================
  // IS ONLINE
  // ==========================================================================

  async isOnline():
    Promise<boolean> {

    try {

      await this.healthCheck();

      return true;

    } catch {

      return false;
    }

  }


  // ==========================================================================
  // ERROR HELPER
  // ==========================================================================

  isApiError(
    error: unknown
  ): error is ApiError {

    return (
      error instanceof
      ApiError
    );

  }


  // ==========================================================================
  // ERROR MESSAGE HELPER
  // ==========================================================================

  getErrorMessage(
    error: unknown,
    fallback =
      'Something went wrong. Please try again.'
  ): string {

    if (
      error instanceof
      ApiError
    ) {

      return (
        error.message ||
        fallback
      );

    }


    if (
      error instanceof
      Error
    ) {

      return (
        error.message ||
        fallback
      );

    }


    return fallback;
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
