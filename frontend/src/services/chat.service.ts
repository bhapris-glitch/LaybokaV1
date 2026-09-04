/**
 * ============================================================================
 * Layboka AI — V1
 * Chat Service
 * ============================================================================
 *
 * File:
 * frontend/src/services/chat.service.ts
 *
 * Purpose:
 * - Communicate with the V1 AI Sales Agent
 * - Create / continue shopper chat sessions
 * - Send shopper messages
 * - Receive AI responses
 * - Receive product recommendations
 * - Send cart context
 *
 * IMPORTANT:
 * OpenAI credentials NEVER belong in this frontend.
 * All AI requests go through the Layboka backend.
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

export interface ChatProduct {
  id?: string;
  productId?: string;

  title: string;

  handle?: string;

  description?: string;

  price?: number | string;

  compareAtPrice?: number | string | null;

  currency?: string;

  image?: string | null;

  imageUrl?: string | null;

  url?: string | null;

  available?: boolean;

  inventory?: number | null;

  [key: string]: unknown;
}


export interface ChatMessage {
  id?: string;

  role:
    | 'user'
    | 'assistant'
    | 'system';

  content: string;

  createdAt?: string;

  products?: ChatProduct[];

  metadata?: Record<
    string,
    unknown
  >;
}


export interface CartItem {
  productId?: string;

  variantId?: string;

  title?: string;

  quantity: number;

  price?: number;

  currency?: string;

  image?: string;

  [key: string]: unknown;
}


export interface ChatRequest {

  shop?: string;

  sessionId?: string;

  message: string;

  messages?: ChatMessage[];

  cartItems?: CartItem[];

  viewedProductIds?: string[];

  currentProductId?: string;

  customerId?: string;

  currency?: string;

  locale?: string;

  metadata?: Record<
    string,
    unknown
  >;
}


export interface ChatResponse {

  success?: boolean;

  sessionId?: string;

  message?: string;

  reply?: string;

  response?: string;

  content?: string;

  assistantMessage?: ChatMessage;

  products?: ChatProduct[];

  recommendations?: ChatProduct[];

  suggestedProducts?: ChatProduct[];

  quickReplies?: string[];

  metadata?: Record<
    string,
    unknown
  >;

  [key: string]: unknown;
}


// ============================================================================
// SESSION STORAGE
// ============================================================================

const SESSION_STORAGE_KEY =
  'layboka_v1_chat_session';


const VIEWED_PRODUCTS_KEY =
  'layboka_v1_viewed_products';


const CART_KEY =
  'layboka_v1_cart';


// ============================================================================
// SESSION ID
// ============================================================================

function generateSessionId(): string {

  /*
   * crypto.randomUUID() is available in modern browsers.
   *
   * The fallback keeps V1 functional on older environments.
   */

  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {

    return crypto.randomUUID();
  }


  return (
    `lb-${Date.now()}-` +
    Math.random()
      .toString(36)
      .slice(2, 12)
  );
}


export function getChatSessionId(): string {

  if (
    typeof window === 'undefined'
  ) {

    return '';
  }


  const existing =
    window.sessionStorage.getItem(
      SESSION_STORAGE_KEY
    );


  if (
    existing
  ) {

    return existing;
  }


  const sessionId =
    generateSessionId();


  window.sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    sessionId
  );


  return sessionId;
}


export function resetChatSession(): void {

  if (
    typeof window === 'undefined'
  ) {

    return;
  }


  window.sessionStorage.removeItem(
    SESSION_STORAGE_KEY
  );
}


// ============================================================================
// VIEWED PRODUCTS
// ============================================================================

export function getViewedProductIds(): string[] {

  if (
    typeof window === 'undefined'
  ) {

    return [];
  }


  try {

    const raw =
      window.sessionStorage.getItem(
        VIEWED_PRODUCTS_KEY
      );


    if (
      !raw
    ) {

      return [];
    }


    const parsed =
      JSON.parse(raw);


    if (
      !Array.isArray(parsed)
    ) {

      return [];
    }


    return parsed
      .filter(
        (id): id is string =>
          typeof id === 'string'
      );

  } catch {

    return [];
  }
}


export function addViewedProduct(
  productId: string
): void {

  if (
    typeof window === 'undefined' ||
    !productId
  ) {

    return;
  }


  const current =
    getViewedProductIds();


  if (
    current.includes(productId)
  ) {

    return;
  }


  const updated =
    [
      ...current,
      productId,
    ].slice(-20);


  window.sessionStorage.setItem(
    VIEWED_PRODUCTS_KEY,
    JSON.stringify(updated)
  );
}


// ============================================================================
// CART
// ============================================================================

export function getStoredCart(): CartItem[] {

  if (
    typeof window === 'undefined'
  ) {

    return [];
  }


  try {

    const raw =
      window.sessionStorage.getItem(
        CART_KEY
      );


    if (
      !raw
    ) {

      return [];
    }


    const parsed =
      JSON.parse(raw);


    if (
      !Array.isArray(parsed)
    ) {

      return [];
    }


    return parsed as CartItem[];

  } catch {

    return [];
  }
}


export function setStoredCart(
  items: CartItem[]
): void {

  if (
    typeof window === 'undefined'
  ) {

    return;
  }


  window.sessionStorage.setItem(
    CART_KEY,
    JSON.stringify(items)
  );
}


export function clearStoredCart(): void {

  if (
    typeof window === 'undefined'
  ) {

    return;
  }


  window.sessionStorage.removeItem(
    CART_KEY
  );
}


// ============================================================================
// SEND MESSAGE
// ============================================================================

export async function sendMessage(
  request: ChatRequest
): Promise<ChatResponse> {

  const message =
    request.message.trim();


  if (
    !message
  ) {

    throw new Error(
      'Please enter a message.'
    );
  }


  const sessionId =
    request.sessionId ||
    getChatSessionId();


  const cartItems =
    request.cartItems ||
    getStoredCart();


  const viewedProductIds =
    request.viewedProductIds ||
    getViewedProductIds();


  const response =
    await apiService.post<
      ChatResponse,
      ChatRequest
    >(
      API_ENDPOINTS.chat,
      {
        ...request,

        message,

        sessionId,

        cartItems,

        viewedProductIds,
      }
    );


  /*
   * Backend may return a newly-created session ID.
   */

  if (
    response.sessionId &&
    typeof window !== 'undefined'
  ) {

    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      response.sessionId
    );
  }


  return response;
}


// ============================================================================
// RESPONSE TEXT HELPER
// ============================================================================

export function getResponseText(
  response: ChatResponse
): string {

  const assistantMessage =
    response.assistantMessage?.content;


  if (
    assistantMessage
  ) {

    return assistantMessage;
  }


  return (
    response.reply ||
    response.response ||
    response.content ||
    response.message ||
    ''
  );
}


// ============================================================================
// PRODUCT RESPONSE HELPER
// ============================================================================

export function getRecommendedProducts(
  response: ChatResponse
): ChatProduct[] {

  if (
    Array.isArray(
      response.products
    )
  ) {

    return response.products;
  }


  if (
    Array.isArray(
      response.recommendations
    )
  ) {

    return response.recommendations;
  }


  if (
    Array.isArray(
      response.suggestedProducts
    )
  ) {

    return response.suggestedProducts;
  }


  if (
    Array.isArray(
      response.assistantMessage?.products
    )
  ) {

    return response.assistantMessage.products;
  }


  return [];
}


// ============================================================================
// QUICK REPLIES
// ============================================================================

export function getQuickReplies(
  response: ChatResponse
): string[] {

  if (
    !Array.isArray(
      response.quickReplies
    )
  ) {

    return [];
  }


  return response.quickReplies
    .filter(
      (item): item is string =>
        typeof item === 'string'
    )
    .slice(0, 6);
}


// ============================================================================
// CHAT STATUS
// ============================================================================

export interface ChatStatusResponse {

  success?: boolean;

  available?: boolean;

  enabled?: boolean;

  shop?: string;

  trialActive?: boolean;

  subscriptionActive?: boolean;

  message?: string;

  [key: string]: unknown;
}


export async function getChatStatus(
  shop?: string
): Promise<ChatStatusResponse> {

  return await apiService.get<ChatStatusResponse>(
    API_ENDPOINTS.chatStatus,
    {
      params:
        shop
          ? {
              shop,
            }
          : undefined,
    }
  );
}


// ============================================================================
// BUILD CHAT REQUEST
// ============================================================================

export function buildChatRequest(
  message: string,
  options?: Partial<ChatRequest>
): ChatRequest {

  return {

    message:
      message.trim(),

    sessionId:
      options?.sessionId ||
      getChatSessionId(),

    shop:
      options?.shop,

    cartItems:
      options?.cartItems ||
      getStoredCart(),

    viewedProductIds:
      options?.viewedProductIds ||
      getViewedProductIds(),

    currentProductId:
      options?.currentProductId,

    customerId:
      options?.customerId,

    currency:
      options?.currency,

    locale:
      options?.locale ||
      (
        typeof navigator !== 'undefined'
          ? navigator.language
          : 'en-US'
      ),

    metadata:
      options?.metadata,
  };
}


// ============================================================================
// SAFE SEND
// ============================================================================
//
// Chat errors should be handled by the UI, but this helper gives components
// a consistent way to turn an unknown error into a user-friendly message.
//

export async function safeSendMessage(
  request: ChatRequest
): Promise<{
  response: ChatResponse | null;
  error: string | null;
}> {

  try {

    const response =
      await sendMessage(
        request
      );


    return {
      response,
      error:
        null,
    };

  } catch (error) {

    const message =
      error instanceof Error
        ? error.message
        : 'The AI Sales Agent is temporarily unavailable. Please try again.';


    return {

      response:
        null,

      error:
        message,
    };
  }
}


// ============================================================================
// EXPORT DEFAULT
// ============================================================================

const chatService = {

  sendMessage,

  safeSendMessage,

  getChatStatus,

  buildChatRequest,

  getChatSessionId,

  resetChatSession,

  getViewedProductIds,

  addViewedProduct,

  getStoredCart,

  setStoredCart,

  clearStoredCart,

  getResponseText,

  getRecommendedProducts,

  getQuickReplies,
};


export default chatService;
