/**
 * ============================================================================
 * Layboka AI — V1
 * Shopify AI Sales Executive
 * ============================================================================
 *
 * File:
 * backend/public/chatbot.js
 *
 * Purpose:
 * - Load AI Sales Executive into merchant storefront
 * - Open/close chat
 * - Send customer messages
 * - Display AI responses
 * - Display Shopify product recommendations
 * - Track V1 analytics funnel
 *
 * ============================================================================
 */

(function () {
  'use strict';


  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  const script =
    document.currentScript;


  const API_URL =
    (
      script?.dataset.api ||
      window.LAYBOKA_API_URL ||
      ''
    ).replace(
      /\/+$/,
      ''
    );


  const SHOP =
    normalizeShop(
      script?.dataset.shop ||
      window.Shopify?.shop ||
      location.hostname
    );


  const POSITION =
    script?.dataset.position ||
    'bottom-right';


  const TITLE =
    script?.dataset.title ||
    'Layboka AI';


  const SUBTITLE =
    script?.dataset.subtitle ||
    'Your AI Sales Executive';


  const PRIMARY_COLOR =
    script?.dataset.color ||
    '#111827';


  const SESSION_KEY =
    `layboka_v1_session_${SHOP}`;


  const sessionId =
    getOrCreateSessionId();


  let conversation = [];

  let isOpen = false;

  let isSending = false;


  // ==========================================================================
  // SHOP NORMALIZATION
  // ==========================================================================

  function normalizeShop(value) {

    if (!value) {
      return '';
    }

    return String(value)
      .trim()
      .toLowerCase()
      .replace(
        /^https?:\/\//,
        ''
      )
      .replace(
        /\/+$/,
        ''
      );
  }


  // ==========================================================================
  // SESSION
  // ==========================================================================

  function getOrCreateSessionId() {

    try {

      const existing =
        sessionStorage.getItem(
          SESSION_KEY
        );

      if (existing) {
        return existing;
      }


      const id =
        `v1-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 12)}`;


      sessionStorage.setItem(
        SESSION_KEY,
        id
      );


      return id;

    } catch {

      return `v1-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 12)}`;
    }
  }


  // ==========================================================================
  // STYLES
  // ==========================================================================

  function injectStyles() {

    if (
      document.getElementById(
        'layboka-v1-styles'
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        'style'
      );


    style.id =
      'layboka-v1-styles';


    style.textContent = `
      #layboka-v1-button {
        position: fixed;
        z-index: 2147483000;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        background: ${PRIMARY_COLOR};
        color: #fff;
        box-shadow: 0 10px 30px rgba(0,0,0,.20);
        font-size: 25px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #layboka-v1-button.bottom-right {
        right: 20px;
        bottom: 20px;
      }

      #layboka-v1-button.bottom-left {
        left: 20px;
        bottom: 20px;
      }

      #layboka-v1-window {
        position: fixed;
        z-index: 2147482999;
        width: min(390px, calc(100vw - 24px));
        height: min(620px, calc(100vh - 100px));
        background: #fff;
        border-radius: 18px;
        box-shadow: 0 20px 60px rgba(0,0,0,.22);
        overflow: hidden;
        display: none;
        flex-direction: column;
        font-family: -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
      }

      #layboka-v1-window.bottom-right {
        right: 20px;
        bottom: 90px;
      }

      #layboka-v1-window.bottom-left {
        left: 20px;
        bottom: 90px;
      }

      #layboka-v1-window.open {
        display: flex;
      }

      .layboka-v1-header {
        background: ${PRIMARY_COLOR};
        color: #fff;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .layboka-v1-brand {
        display: flex;
        flex-direction: column;
      }

      .layboka-v1-title {
        font-size: 16px;
        font-weight: 700;
      }

      .layboka-v1-subtitle {
        font-size: 12px;
        opacity: .8;
        margin-top: 3px;
      }

      .layboka-v1-close {
        border: none;
        background: transparent;
        color: #fff;
        font-size: 22px;
        cursor: pointer;
      }

      .layboka-v1-messages {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
        background: #f7f7f8;
      }

      .layboka-v1-message {
        margin-bottom: 12px;
        display: flex;
      }

      .layboka-v1-message.user {
        justify-content: flex-end;
      }

      .layboka-v1-message.assistant {
        justify-content: flex-start;
      }

      .layboka-v1-bubble {
        max-width: 84%;
        padding: 10px 13px;
        border-radius: 15px;
        font-size: 14px;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .layboka-v1-message.user
      .layboka-v1-bubble {
        background: ${PRIMARY_COLOR};
        color: #fff;
        border-bottom-right-radius: 4px;
      }

      .layboka-v1-message.assistant
      .layboka-v1-bubble {
        background: #fff;
        color: #222;
        border-bottom-left-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,.06);
      }

      .layboka-v1-products {
        display: grid;
        gap: 9px;
        margin-top: 10px;
      }

      .layboka-v1-product {
        background: #fff;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #e8e8e8;
      }

      .layboka-v1-product img {
        width: 100%;
        height: 130px;
        object-fit: cover;
        display: block;
      }

      .layboka-v1-product-body {
        padding: 10px;
      }

      .layboka-v1-product-title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 5px;
      }

      .layboka-v1-product-price {
        font-size: 13px;
        color: #444;
        margin-bottom: 8px;
      }

      .layboka-v1-product-actions {
        display: flex;
        gap: 6px;
      }

      .layboka-v1-product-actions button {
        flex: 1;
        border: none;
        border-radius: 8px;
        padding: 8px;
        cursor: pointer;
        font-size: 12px;
      }

      .layboka-v1-view {
        background: #eee;
        color: #222;
      }

      .layboka-v1-cart {
        background: ${PRIMARY_COLOR};
        color: #fff;
      }

      .layboka-v1-typing {
        display: inline-flex;
        gap: 4px;
        padding: 11px 14px;
        background: #fff;
        border-radius: 15px;
      }

      .layboka-v1-typing span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #888;
        animation: layboka-v1-bounce 1s infinite;
      }

      .layboka-v1-typing span:nth-child(2) {
        animation-delay: .15s;
      }

      .layboka-v1-typing span:nth-child(3) {
        animation-delay: .30s;
      }

      @keyframes layboka-v1-bounce {
        0%, 60%, 100% {
          transform: translateY(0);
        }

        30% {
          transform: translateY(-4px);
        }
      }

      .layboka-v1-quick {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding: 8px 12px;
        border-top: 1px solid #eee;
        background: #fff;
      }

      .layboka-v1-quick button {
        white-space: nowrap;
        border: 1px solid #ddd;
        background: #fff;
        border-radius: 20px;
        padding: 7px 10px;
        cursor: pointer;
        font-size: 12px;
      }

      .layboka-v1-input-area {
        display: flex;
        gap: 8px;
        padding: 10px;
        background: #fff;
        border-top: 1px solid #eee;
      }

      .layboka-v1-input {
        flex: 1;
        min-width: 0;
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 11px 12px;
        outline: none;
        font-size: 14px;
      }

      .layboka-v1-send {
        width: 44px;
        border: none;
        border-radius: 12px;
        background: ${PRIMARY_COLOR};
        color: #fff;
        cursor: pointer;
      }

      .layboka-v1-send:disabled {
        opacity: .5;
        cursor: default;
      }

      @media (max-width: 600px) {

        #layboka-v1-window.bottom-right,
        #layboka-v1-window.bottom-left {
          left: 12px;
          right: 12px;
          bottom: 82px;
          width: auto;
          height: calc(100vh - 100px);
          max-height: none;
        }

        #layboka-v1-button.bottom-right {
          right: 14px;
          bottom: 14px;
        }

        #layboka-v1-button.bottom-left {
          left: 14px;
          bottom: 14px;
        }
      }
    `;


    document.head.appendChild(
      style
    );
  }


  // ==========================================================================
  // UI
  // ==========================================================================

  function createUI() {

    injectStyles();


    const button =
      document.createElement(
        'button'
      );

    button.id =
      'layboka-v1-button';

    button.className =
      POSITION;

    button.setAttribute(
      'aria-label',
      'Open Layboka AI'
    );

    button.innerHTML =
      '💬';


    const windowEl =
      document.createElement(
        'div'
      );

    windowEl.id =
      'layboka-v1-window';

    windowEl.className =
      POSITION;


    windowEl.innerHTML = `
      <div class="layboka-v1-header">

        <div class="layboka-v1-brand">
          <div class="layboka-v1-title">
            ${escapeHtml(TITLE)}
          </div>

          <div class="layboka-v1-subtitle">
            ${escapeHtml(SUBTITLE)}
          </div>
        </div>

        <button
          class="layboka-v1-close"
          aria-label="Close chat"
        >
          ×
        </button>

      </div>

      <div
        class="layboka-v1-messages"
        id="layboka-v1-messages"
      ></div>

      <div
        class="layboka-v1-quick"
        id="layboka-v1-quick"
      >
        <button data-message="🔥 Show me your best sellers">
          🔥 Best Sellers
        </button>

        <button data-message="🎁 Do you have any offers?">
          🎁 Offers
        </button>

        <button data-message="🚚 How fast is delivery?">
          🚚 Shipping
        </button>

        <button data-message="💳 What payment methods do you accept?">
          💳 Payment
        </button>
      </div>

      <div class="layboka-v1-input-area">

        <input
          class="layboka-v1-input"
          id="layboka-v1-input"
          type="text"
          maxlength="4000"
          placeholder="Ask me anything..."
          autocomplete="off"
        />

        <button
          class="layboka-v1-send"
          id="layboka-v1-send"
          aria-label="Send"
        >
          ➤
        </button>

      </div>
    `;


    document.body.appendChild(
      button
    );

    document.body.appendChild(
      windowEl
    );


    button.addEventListener(
      'click',
      toggleChat
    );


    windowEl
      .querySelector(
        '.layboka-v1-close'
      )
      .addEventListener(
        'click',
        closeChat
      );


    document
      .getElementById(
        'layboka-v1-send'
      )
      .addEventListener(
        'click',
        sendCurrentMessage
      );


    document
      .getElementById(
        'layboka-v1-input'
      )
      .addEventListener(
        'keydown',
        function (event) {

          if (
            event.key === 'Enter' &&
            !event.shiftKey
          ) {

            event.preventDefault();

            sendCurrentMessage();
          }
        }
      );


    document
      .getElementById(
        'layboka-v1-quick'
      )
      .addEventListener(
        'click',
        function (event) {

          const target =
            event.target.closest(
              'button[data-message]'
            );

          if (!target) {
            return;
          }

          sendMessage(
            target.dataset.message
          );
        }
      );


    addAssistantMessage(
      'Hi! 👋 I’m your AI Sales Executive. What are you looking for today?'
    );
  }


  // ==========================================================================
  // CHAT OPEN / CLOSE
  // ==========================================================================

  function openChat() {

    if (isOpen) {
      return;
    }

    isOpen = true;


    document
      .getElementById(
        'layboka-v1-window'
      )
      .classList.add(
        'open'
      );


    trackEvent(
      'widget_open'
    );
  }


  function closeChat() {

    isOpen = false;


    document
      .getElementById(
        'layboka-v1-window'
      )
      .classList.remove(
        'open'
      );
  }


  function toggleChat() {

    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  }


  // ==========================================================================
  // MESSAGE SENDING
  // ==========================================================================

  function sendCurrentMessage() {

    const input =
      document.getElementById(
        'layboka-v1-input'
      );


    const message =
      input.value.trim();


    if (!message) {
      return;
    }


    input.value = '';


    sendMessage(
      message
    );
  }


  async function sendMessage(
    message
  ) {

    if (
      !message ||
      isSending
    ) {
      return;
    }


    if (!API_URL) {

      addAssistantMessage(
        'The AI Sales Executive is temporarily unavailable.'
      );

      return;
    }


    isSending = true;


    addUserMessage(
      message
    );


    conversation.push({
      role:
        'user',

      content:
        message,
    });


    trackEvent(
      'conversation'
    );


    const typing =
      showTyping();


    try {

      const response =
        await fetch(
          `${API_URL}/v1/chat`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                shop:
                  SHOP,

                message:
                  message,

                conversation:
                  conversation,
              }),
          }
        );


      const data =
        await response.json();


      typing.remove();


      if (
        !response.ok ||
        !data.success
      ) {

        addAssistantMessage(
          data.error ||
          'Sorry, I could not process that. Please try again.'
        );

        return;
      }


      const result =
        data.data || data;


      const assistantMessage =
        result.message ||
        'How else can I help you?';


      conversation.push({
        role:
          'assistant',

        content:
          assistantMessage,
      });


      addAssistantMessage(
        assistantMessage,
        result.products || []
      );


      trackProductEvents(
        result.products || []
      );


    } catch (error) {

      typing.remove();


      addAssistantMessage(
        'Sorry, something went wrong. Please try again.'
      );


    } finally {

      isSending = false;
    }
  }


  // ==========================================================================
  // MESSAGES
  // ==========================================================================

  function addUserMessage(
    message
  ) {

    appendMessage(
      'user',
      message
    );
  }


  function addAssistantMessage(
    message,
    products = []
  ) {

    const messages =
      document.getElementById(
        'layboka-v1-messages'
      );


    const wrapper =
      document.createElement(
        'div'
      );

    wrapper.className =
      'layboka-v1-message assistant';


    const bubble =
      document.createElement(
        'div'
      );

    bubble.className =
      'layboka-v1-bubble';


    bubble.textContent =
      message;


    wrapper.appendChild(
      bubble
    );


    if (
      Array.isArray(products) &&
      products.length
    ) {

      const productContainer =
        createProductCards(
          products
        );

      wrapper.appendChild(
        productContainer
      );
    }


    messages.appendChild(
      wrapper
    );


    scrollToBottom();
  }


  function appendMessage(
    role,
    message
  ) {

    const messages =
      document.getElementById(
        'layboka-v1-messages'
      );


    const wrapper =
      document.createElement(
        'div'
      );

    wrapper.className =
      `layboka-v1-message ${role}`;


    const bubble =
      document.createElement(
        'div'
      );

    bubble.className =
      'layboka-v1-bubble';


    bubble.textContent =
      message;


    wrapper.appendChild(
      bubble
    );


    messages.appendChild(
      wrapper
    );


    scrollToBottom();
  }


  // ==========================================================================
  // TYPING
  // ==========================================================================

  function showTyping() {

    const messages =
      document.getElementById(
        'layboka-v1-messages'
      );


    const wrapper =
      document.createElement(
        'div'
      );

    wrapper.className =
      'layboka-v1-message assistant';


    const typing =
      document.createElement(
        'div'
      );

    typing.className =
      'layboka-v1-typing';


    typing.innerHTML =
      '<span></span><span></span><span></span>';


    wrapper.appendChild(
      typing
    );


    messages.appendChild(
      wrapper
    );


    scrollToBottom();


    return wrapper;
  }


  // ==========================================================================
  // PRODUCT CARDS
  // ==========================================================================

  function createProductCards(
    products
  ) {

    const container =
      document.createElement(
        'div'
      );

    container.className =
      'layboka-v1-products';


    products.forEach(
      (product) => {

        if (!product) {
          return;
        }


        const card =
          document.createElement(
            'div'
          );

        card.className =
          'layboka-v1-product';


        const image =
          product.image ||
          product.imageUrl;


        if (image) {

          const img =
            document.createElement(
              'img'
            );

          img.src =
            image;

          img.alt =
            product.title ||
            'Product';

          img.loading =
            'lazy';

          card.appendChild(
            img
          );
        }


        const body =
          document.createElement(
            'div'
          );

        body.className =
          'layboka-v1-product-body';


        const title =
          document.createElement(
            'div'
          );

        title.className =
          'layboka-v1-product-title';

        title.textContent =
          product.title ||
          'Product';


        const price =
          document.createElement(
            'div'
          );

        price.className =
          'layboka-v1-product-price';

        price.textContent =
          formatPrice(
            product
          );


        const actions =
          document.createElement(
            'div'
          );

        actions.className =
          'layboka-v1-product-actions';


        const viewButton =
          document.createElement(
            'button'
          );

        viewButton.className =
          'layboka-v1-view';

        viewButton.textContent =
          'View';


        viewButton.addEventListener(
          'click',
          function () {

            trackEvent(
              'product_click',
              {
                shopifyProductId:
                  product.shopifyProductId,

                productTitle:
                  product.title,
              }
            );


            if (
              product.url
            ) {
              window.location.href =
                product.url;
            }
          }
        );


        const cartButton =
          document.createElement(
            'button'
          );

        cartButton.className =
          'layboka-v1-cart';

        cartButton.textContent =
          'Add to Cart';


        cartButton.addEventListener(
          'click',
          function () {

            addToCart(
              product
            );
          }
        );


        actions.appendChild(
          viewButton
        );

        actions.appendChild(
          cartButton
        );


        body.appendChild(
          title
        );

        body.appendChild(
          price
        );

        body.appendChild(
          actions
        );


        card.appendChild(
          body
        );


        container.appendChild(
          card
        );
      }
    );


    return container;
  }


  // ==========================================================================
  // PRICE
  // ==========================================================================

  function formatPrice(
    product
  ) {

    const price =
      Number(
        product.minPrice ??
        product.price
      );


    if (
      !Number.isFinite(price)
    ) {
      return '';
    }


    const currency =
      product.currency ||
      window.Shopify?.currency?.active ||
      'USD';


    try {

      return new Intl.NumberFormat(
        undefined,
        {
          style:
            'currency',

          currency,
        }
      ).format(
        price
      );

    } catch {

      return `${currency} ${price.toFixed(2)}`;
    }
  }


  // ==========================================================================
  // ADD TO CART
  // ==========================================================================

  async function addToCart(
    product
  ) {

    const variant =
      Array.isArray(
        product.variants
      )
        ? product.variants.find(
            (item) =>
              item.available !== false
          )
        : null;


    if (!variant?.id) {

      if (product.url) {
        window.location.href =
          product.url;
      }

      return;
    }


    try {

      const response =
        await fetch(
          '/cart/add.js',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json',
            },

            body:
              JSON.stringify({
                items: [
                  {
                    id:
                      Number(
                        variant.id
                      ),

                    quantity:
                      1,
                  },
                ],
              }),
          }
        );


      if (!response.ok) {
        throw new Error(
          'Cart request failed'
        );
      }


      trackEvent(
        'add_to_cart',
        {
          shopifyProductId:
            product.shopifyProductId,

          variantId:
            variant.id,

          productTitle:
            product.title,
        }
      );


      addAssistantMessage(
        `Great choice! ${product.title || 'The product'} has been added to your cart. 🛒`
      );


    } catch {

      if (product.url) {
        window.location.href =
          product.url;
      }
    }
  }


  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  async function trackEvent(
    event,
    metadata = {}
  ) {

    if (!API_URL || !SHOP) {
      return;
    }


    try {

      await fetch(
        `${API_URL}/v1/analytics/event`,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          keepalive:
            true,

          body:
            JSON.stringify({
              shop:
                SHOP,

              event,

              sessionId:
                sessionId,

              metadata,
            }),
        }
      );

    } catch {
      // Analytics must never break shopping.
    }
  }


  function trackProductEvents(
    products
  ) {

    if (
      !Array.isArray(products)
    ) {
      return;
    }


    products.forEach(
      (product) => {

        if (
          !product?.shopifyProductId
        ) {
          return;
        }


        trackEvent(
          'product_view',
          {
            shopifyProductId:
              product.shopifyProductId,

            productTitle:
              product.title,
          }
        );
      }
    );
  }


  // ==========================================================================
  // SCROLL
  // ==========================================================================

  function scrollToBottom() {

    const messages =
      document.getElementById(
        'layboka-v1-messages'
      );


    if (!messages) {
      return;
    }


    messages.scrollTop =
      messages.scrollHeight;
  }


  // ==========================================================================
  // HTML ESCAPE
  // ==========================================================================

  function escapeHtml(
    value
  ) {

    return String(
      value || ''
    )
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );
  }


  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  function init() {

    if (
      document.getElementById(
        'layboka-v1-button'
      )
    ) {
      return;
    }


    createUI();
  }


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init
    );

  } else {

    init();
  }

})();
