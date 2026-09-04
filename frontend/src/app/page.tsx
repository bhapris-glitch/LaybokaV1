/**
 * ============================================================================
 * LaybokaV1
 * V1 Landing Page
 * ============================================================================
 *
 * File:
 * frontend/src/app/page.tsx
 *
 * Purpose:
 * - Main public landing page
 * - Shopify installation CTA
 * - V1 product positioning
 * - Responsive navigation
 * - Features
 * - How it works
 * - Pricing preview
 * - Final CTA
 *
 * Brand:
 * Primary    #FF4616
 * Background #040501
 *
 * ============================================================================
 */

'use client';

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Menu,
  MessageCircle,
  Package,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';

import {
  BRAND,
  PLANS,
  ROUTES,
  TRIAL,
} from '@/constants';

import {
  getInstallUrl,
  normalizeShopDomain,
} from '@/services/install.service';


// ============================================================================
// LOGO
// ============================================================================

function BrandLogo({
  compact = false,
}: {
  compact?: boolean;
}) {

  return (
    <a
      href={ROUTES.home}
      className="lb-logo"
      aria-label="LaybokaV1 home"
    >

      <span
        className="lb-logo-mark"
        aria-hidden="true"
        style={{
          overflow: 'hidden',
          position: 'relative',
        }}
      >

        <span className="lb-logo-letter lb-logo-a">
          A
        </span>

        <span className="lb-logo-letter lb-logo-v">
          V
        </span>

      </span>

      {!compact && (
        <span>
          LaybokaV1
        </span>
      )}

    </a>
  );
}


// ============================================================================
// INSTALL FORM
// ============================================================================

function InstallForm({
  compact = false,
}: {
  compact?: boolean;
}) {

  const [
    shop,
    setShop,
  ] = useState('');

  const [
    error,
    setError,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);


  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    setError('');


    let normalizedShop = '';

    try {

      normalizedShop =
        normalizeShopDomain(
          shop
        );

    } catch {

      setError(
        'Enter a valid Shopify store URL or store.myshopify.com domain.'
      );

      return;
    }


    setLoading(true);


    /*
     * V1 backend exposes:
     *
     * GET /v1/install?shop=store.myshopify.com
     *
     * The backend then handles Shopify OAuth.
     */

    window.location.assign(
      getInstallUrl(
        normalizedShop
      )
    );
  }


  return (
    <form
      onSubmit={handleSubmit}
      className={
        compact
          ? 'w-full'
          : 'w-full max-w-2xl mx-auto'
      }
    >

      <div
        className={
          compact
            ? 'flex flex-col sm:flex-row gap-2'
            : 'flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl'
        }
      >

        <div className="relative flex-1">

          <Store
            size={18}
            strokeWidth={2.4}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF4616]"
            aria-hidden="true"
          />

          <input
            type="text"
            value={shop}
            onChange={(event) =>
              setShop(event.target.value)
            }
            placeholder="your-store.myshopify.com"
            autoComplete="url"
            spellCheck={false}
            aria-label="Shopify store URL"
            className={
              compact
                ? 'lb-input pl-11'
                : 'lb-input pl-11 h-14 rounded-xl border-0 bg-transparent'
            }
          />

        </div>


        <button
          type="submit"
          disabled={loading}
          className={
            compact
              ? 'lb-btn lb-btn-primary whitespace-nowrap'
              : 'lb-btn lb-btn-primary lb-btn-lg whitespace-nowrap min-w-[180px]'
          }
        >

          {loading ? (
            <>
              <span className="lb-spinner" />
              Connecting...
            </>
          ) : (
            <>
              Start Free Trial
              <ArrowRight
                size={17}
                strokeWidth={2.6}
              />
            </>
          )}

        </button>

      </div>


      {error && (
        <p
          className="mt-3 text-sm text-[#ff8585]"
          role="alert"
        >
          {error}
        </p>
      )}

    </form>
  );
}


// ============================================================================
// HEADER
// ============================================================================

function Header() {

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);


  useEffect(() => {

    if (!mobileOpen) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };

  }, [mobileOpen]);


  return (
    <header className="lb-header">

      <div className="lb-container lb-header-inner">

        <BrandLogo />


        <nav
          className="lb-nav"
          aria-label="Main navigation"
        >

          <a
            href="#features"
            className="lb-nav-link"
          >
            Features
          </a>

          <a
            href="#how-it-works"
            className="lb-nav-link"
          >
            How It Works
          </a>

          <a
            href="#pricing"
            className="lb-nav-link"
          >
            Pricing
          </a>

          <a
            href="#faq"
            className="lb-nav-link"
          >
            FAQ
          </a>

        </nav>


        <div className="hidden md:flex items-center gap-2">

          <a
            href={ROUTES.login}
            className="lb-btn lb-btn-ghost"
          >
            Log in
          </a>

          <a
            href="#install"
            className="lb-btn lb-btn-primary"
          >
            Start Free Trial
            <ArrowRight
              size={15}
            />
          </a>

        </div>


        <button
          type="button"
          onClick={() =>
            setMobileOpen(
              !mobileOpen
            )
          }
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.03]"
          aria-label={
            mobileOpen
              ? 'Close menu'
              : 'Open menu'
          }
          aria-expanded={mobileOpen}
        >

          {mobileOpen ? (
            <X size={21} />
          ) : (
            <Menu size={21} />
          )}

        </button>

      </div>


      {mobileOpen && (

        <div className="lb-mobile-menu md:hidden">

          <div className="lb-mobile-menu-links">

            <a
              href="#features"
              className="lb-mobile-menu-link"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="lb-mobile-menu-link"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              How It Works
            </a>

            <a
              href="#pricing"
              className="lb-mobile-menu-link"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              Pricing
            </a>

            <a
              href="#faq"
              className="lb-mobile-menu-link"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              FAQ
            </a>

          </div>


          <div className="mt-6 flex flex-col gap-3">

            <a
              href={ROUTES.login}
              className="lb-btn lb-btn-secondary lb-btn-full"
            >
              Log in
            </a>

            <a
              href="#install"
              className="lb-btn lb-btn-primary lb-btn-full"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              Start Free Trial
              <ArrowRight size={16} />
            </a>

          </div>

        </div>

      )}

    </header>
  );
}


// ============================================================================
// HERO PRODUCT VISUAL
// ============================================================================

function HeroVisual() {

  return (
    <div className="relative w-full max-w-5xl mx-auto mt-16">

      <div className="absolute inset-0 bg-[#FF4616]/10 blur-[100px] rounded-full" />


      <div className="relative lb-card overflow-hidden border-white/10">

        {/* Browser bar */}

        <div className="h-12 border-b border-white/[0.07] flex items-center px-4 gap-2 bg-white/[0.02]">

          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />

          <div className="hidden sm:flex flex-1 justify-center">

            <div className="w-64 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[10px] text-white/30">
              yourstore.com
            </div>

          </div>

        </div>


        <div className="grid lg:grid-cols-[1fr_340px] min-h-[430px]">

          {/* Store side */}

          <div className="p-6 sm:p-10">

            <div className="flex items-center justify-between mb-12">

              <div className="flex items-center gap-2">

                <div className="w-8 h-8 rounded-lg bg-white/[0.06]" />

                <div className="h-3 w-24 rounded bg-white/[0.08]" />

              </div>

              <div className="flex gap-3">

                <div className="h-3 w-10 rounded bg-white/[0.06]" />
                <div className="h-3 w-10 rounded bg-white/[0.06]" />
                <div className="h-3 w-10 rounded bg-white/[0.06]" />

              </div>

            </div>


            <div className="grid grid-cols-2 gap-4">

              {[1, 2, 3, 4].map(
                (item) => (

                  <div
                    key={item}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3"
                  >

                    <div className="aspect-square rounded-lg bg-white/[0.04] mb-3" />

                    <div className="h-3 w-3/4 rounded bg-white/[0.08] mb-2" />

                    <div className="h-3 w-1/3 rounded bg-[#FF4616]/30" />

                  </div>

                )
              )}

            </div>

          </div>


          {/* AI side */}

          <div className="border-t lg:border-t-0 lg:border-l border-white/[0.07] bg-[#080a06] flex flex-col">

            <div className="p-4 border-b border-white/[0.07] flex items-center gap-3">

              <div className="w-9 h-9 rounded-xl bg-[#FF4616]/10 border border-[#FF4616]/25 flex items-center justify-center">

                <Bot
                  size={18}
                  className="text-[#FF4616]"
                />

              </div>

              <div>

                <div className="text-sm font-bold">
                  Layboka Sales Agent
                </div>

                <div className="text-[10px] text-[#39d98a] flex items-center gap-1">

                  <span className="w-1.5 h-1.5 rounded-full bg-[#39d98a]" />

                  Online

                </div>

              </div>

            </div>


            <div className="flex-1 p-4 space-y-4">

              <div className="flex gap-2">

                <div className="w-7 h-7 rounded-lg bg-[#FF4616]/10 flex items-center justify-center shrink-0">

                  <Sparkles
                    size={13}
                    className="text-[#FF4616]"
                  />

                </div>

                <div className="rounded-xl rounded-tl-sm bg-white/[0.05] border border-white/[0.06] px-3 py-2 text-xs text-white/75">

                  Hi! 👋 What are you looking for today?

                </div>

              </div>


              <div className="flex justify-end">

                <div className="rounded-xl rounded-tr-sm bg-[#FF4616] px-3 py-2 text-xs text-white">

                  I need something for summer.

                </div>

              </div>


              <div className="flex gap-2">

                <div className="w-7 h-7 rounded-lg bg-[#FF4616]/10 flex items-center justify-center shrink-0">

                  <Bot
                    size={13}
                    className="text-[#FF4616]"
                  />

                </div>

                <div className="rounded-xl rounded-tl-sm bg-white/[0.05] border border-white/[0.06] px-3 py-2 text-xs text-white/75">

                  Absolutely. I found a few options your customers love.

                </div>

              </div>


              <div className="rounded-xl border border-[#FF4616]/20 bg-[#FF4616]/[0.04] p-3">

                <div className="flex gap-3">

                  <div className="w-14 h-14 rounded-lg bg-white/[0.06] shrink-0" />

                  <div className="min-w-0">

                    <div className="text-xs font-semibold truncate">
                      Featured Product
                    </div>

                    <div className="text-[11px] text-white/40 mt-1">
                      Recommended for you
                    </div>

                    <div className="text-xs text-[#FF4616] font-bold mt-2">
                      $49.00
                    </div>

                  </div>

                </div>

              </div>

            </div>


            <div className="p-3 border-t border-white/[0.07]">

              <div className="h-9 rounded-lg bg-white/[0.035] border border-white/[0.06] flex items-center px-3 text-[11px] text-white/25">

                Ask about a product...

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}


// ============================================================================
// FEATURE
// ============================================================================

const features = [

  {
    icon: MessageCircle,
    title: 'Human-like conversations',
    text: 'Engage shoppers naturally instead of leaving them alone with a static product catalog.',
  },

  {
    icon: Search,
    title: 'Understands buying intent',
    text: 'Help shoppers find the right products based on what they actually want.',
  },

  {
    icon: Package,
    title: 'Product recommendations',
    text: 'Use your store product information to guide shoppers toward relevant products.',
  },

  {
    icon: TrendingUp,
    title: 'Upsell & cross-sell',
    text: 'Turn product conversations into opportunities for larger and smarter purchases.',
  },

  {
    icon: ShoppingCart,
    title: 'Recover buying intent',
    text: 'Keep conversations focused on helping shoppers move toward checkout.',
  },

  {
    icon: BarChart3,
    title: 'Sales analytics',
    text: 'Understand how shoppers interact with your AI Sales Agent and products.',
  },

];


// ============================================================================
// FAQ
// ============================================================================

const faqs = [

  {
    question: 'What is Layboka AI?',
    answer:
      'Layboka AI is an AI Sales Agent for ecommerce stores. It talks with shoppers, answers product questions, recommends relevant products and helps move visitors toward a purchase.',
  },

  {
    question: 'Does it work with Shopify?',
    answer:
      'Yes. V1 is built around Shopify store installation and Shopify product data.',
  },

  {
    question: 'Do I need to train the AI manually?',
    answer:
      'No manual model training is required for the normal V1 setup. Layboka uses your store product information as the sales context.',
  },

  {
    question: 'Can I try it before paying?',
    answer:
      `Yes. V1 includes a ${TRIAL.days}-day free trial before a paid plan is required.`,
  },

  {
    question: 'Does Layboka replace my store?',
    answer:
      'No. Your Shopify store remains your storefront. Layboka works as the AI Sales Agent layer that helps visitors make purchasing decisions.',
  },

];


// ============================================================================
// FAQ ITEM
// ============================================================================

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {

  const [
    open,
    setOpen,
  ] = useState(false);


  return (
    <div className="border-b border-white/[0.08]">

      <button
        type="button"
        onClick={() =>
          setOpen(!open)
        }
        className="w-full flex items-center justify-between gap-5 py-5 text-left"
        aria-expanded={open}
      >

        <span className="font-semibold text-white">
          {question}
        </span>

        <ChevronDown
          size={19}
          className={`shrink-0 text-[#FF4616] transition-transform ${
            open
              ? 'rotate-180'
              : ''
          }`}
        />

      </button>


      {open && (

        <div className="pb-5 pr-10 text-sm leading-7 text-white/55">
          {answer}
        </div>

      )}

    </div>
  );
}


// ============================================================================
// PAGE
// ============================================================================

export default function HomePage() {

  return (
    <main className="min-h-screen overflow-hidden bg-[#040501] text-white">

      <Header />


      {/* ================================================================== */}
      {/* HERO                                                               */}
      {/* ================================================================== */}

      <section
        className="lb-hero lb-grid-bg"
        aria-labelledby="hero-title"
      >

        <div className="lb-container">

          <div className="lb-hero-content lb-fade-up">

            <div className="flex justify-center mb-7">

              <span className="lb-badge lb-badge-primary">

                <span className="w-1.5 h-1.5 rounded-full bg-[#FF4616] animate-pulse" />

                {TRIAL.days}-Day Free Trial

              </span>

            </div>


            <h1
              id="hero-title"
              className="lb-heading lb-heading-xl max-w-5xl mx-auto"
            >

              Turn Your Store Into a{' '}

              <span className="lb-gradient-text">
                24/7 Sales Machine
              </span>

            </h1>


            <p className="lb-lead mx-auto mt-7">
              Meet LaybokaV1 — your AI Sales Agent that talks to shoppers,
              understands what they want, recommends products and helps
              convert visitors into buyers.
            </p>


            <div
              id="install"
              className="mt-9"
            >

              <InstallForm />

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/35">

                <span className="flex items-center gap-1.5">
                  <Check
                    size={13}
                    className="text-[#FF4616]"
                  />
                  No credit card to start
                </span>

                <span className="flex items-center gap-1.5">
                  <Check
                    size={13}
                    className="text-[#FF4616]"
                  />
                  Shopify focused
                </span>

                <span className="flex items-center gap-1.5">
                  <Check
                    size={13}
                    className="text-[#FF4616]"
                  />
                  Cancel anytime
                </span>

              </div>

            </div>

          </div>


          <HeroVisual />


          <div className="mt-10 flex flex-wrap justify-center gap-8 text-xs text-white/35">

            <span className="flex items-center gap-2">
              <Zap
                size={15}
                className="text-[#FF4616]"
              />
              Instant shopper assistance
            </span>

            <span className="flex items-center gap-2">
              <Clock3
                size={15}
                className="text-[#FF4616]"
              />
              Available 24/7
            </span>

            <span className="flex items-center gap-2">
              <TrendingUp
                size={15}
                className="text-[#FF4616]"
              />
              Built for ecommerce sales
            </span>

          </div>

        </div>

      </section>


      {/* ================================================================== */}
      {/* VALUE                                                              */}
      {/* ================================================================== */}

      <section className="lb-section-sm border-y border-white/[0.06]">

        <div className="lb-container">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">

            <div>
              <div className="text-3xl font-extrabold tracking-tight">
                24/7
              </div>

              <div className="mt-1 text-sm text-white/40">
                Always-on sales assistance
              </div>
            </div>


            <div>
              <div className="text-3xl font-extrabold tracking-tight">
                AI
              </div>

              <div className="mt-1 text-sm text-white/40">
                Conversational product guidance
              </div>
            </div>


            <div>
              <div className="text-3xl font-extrabold tracking-tight">
                1 Click
              </div>

              <div className="mt-1 text-sm text-white/40">
                Shopify installation flow
              </div>
            </div>

          </div>

        </div>

      </section>


      {/* ================================================================== */}
      {/* FEATURES                                                           */}
      {/* ================================================================== */}

      <section
        id="features"
        className="lb-section"
      >

        <div className="lb-container">

          <div className="max-w-2xl mb-14">

            <span className="lb-eyebrow">
              <Sparkles size={14} />
              AI Sales Agent
            </span>

            <h2 className="lb-heading lb-heading-lg mt-4">
              More than a chatbot.
              <br />
              <span className="lb-gradient-text">
                Built to sell.
              </span>
            </h2>

            <p className="lb-lead mt-5">
              Layboka is designed around the sales conversation — from the
              first question to product discovery and purchase intent.
            </p>

          </div>


          <div className="lb-feature-grid">

            {features.map(
              ({
                icon: Icon,
                title,
                text,
              }) => (

                <article
                  key={title}
                  className="lb-card lb-card-hover lb-feature-card"
                >

                  <div className="lb-icon-box">

                    <Icon
                      size={22}
                      strokeWidth={2.4}
                    />

                  </div>

                  <h3 className="mt-6 text-lg font-bold">
                    {title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-white/45">
                    {text}
                  </p>

                </article>

              )
            )}

          </div>

        </div>

      </section>


      {/* ================================================================== */}
      {/* HOW IT WORKS                                                       */}
      {/* ================================================================== */}

      <section
        id="how-it-works"
        className="lb-section border-y border-white/[0.06] bg-white/[0.012]"
      >

        <div className="lb-container">

          <div className="text-center max-w-2xl mx-auto">

            <span className="lb-eyebrow justify-center">
              <Zap size={14} />
              Simple Setup
            </span>

            <h2 className="lb-heading lb-heading-lg mt-4">
              From store to AI Sales Agent
              <br />
              <span className="lb-gradient-text">
                in minutes.
              </span>
            </h2>

          </div>


          <div className="grid md:grid-cols-3 gap-6 mt-16">

            {[
              {
                number: '01',
                icon: Store,
                title: 'Connect your store',
                text: 'Start the Shopify installation from Layboka and authorize your store.',
              },
              {
                number: '02',
                icon: Bot,
                title: 'Layboka learns your products',
                text: 'Your product information becomes the foundation for shopper conversations.',
              },
              {
                number: '03',
                icon: TrendingUp,
                title: 'Start selling 24/7',
                text: 'The AI Sales Agent helps visitors discover products and move toward purchase.',
              },
            ].map(
              ({
                number,
                icon: Icon,
                title,
                text,
              }) => (

                <div
                  key={number}
                  className="relative lb-card p-7"
                >

                  <div className="flex items-center justify-between">

                    <div className="lb-icon-box">
                      <Icon
                        size={22}
                        strokeWidth={2.4}
                      />
                    </div>

                    <span className="text-4xl font-black text-white/[0.06]">
                      {number}
                    </span>

                  </div>

                  <h3 className="mt-7 text-lg font-bold">
                    {title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-white/45">
                    {text}
                  </p>

                </div>

              )
            )}

          </div>

        </div>

      </section>


      {/* ================================================================== */}
      {/* SALES CONVERSATION                                                  */}
      {/* ================================================================== */}

      <section className="lb-section">

        <div className="lb-container">

          <div className="lb-two-column">

            <div>

              <span className="lb-eyebrow">
                <MessageCircle size={14} />
                Sales Conversation
              </span>

              <h2 className="lb-heading lb-heading-lg mt-4">
                Give every visitor
                <br />
                a{' '}
                <span className="lb-gradient-text">
                  sales conversation.
                </span>
              </h2>

              <p className="lb-lead mt-5">
                Instead of making shoppers search through endless pages,
                Layboka helps them get answers and product guidance when
                they need it.
              </p>


              <div className="mt-8 space-y-4">

                {[
                  'Answers product questions',
                  'Recommends relevant products',
                  'Handles buying-intent conversations',
                  'Encourages upsells and cross-sells',
                ].map(
                  (item) => (

                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm text-white/65"
                    >

                      <span className="w-7 h-7 rounded-full bg-[#FF4616]/10 border border-[#FF4616]/20 flex items-center justify-center shrink-0">

                        <Check
                          size={14}
                          className="text-[#FF4616]"
                          strokeWidth={3}
                        />

                      </span>

                      {item}

                    </div>

                  )
                )}

              </div>

            </div>


            <div className="lb-card p-5 sm:p-7">

              <div className="flex items-center gap-3 pb-5 border-b border-white/[0.07]">

                <div className="w-11 h-11 rounded-xl bg-[#FF4616]/10 border border-[#FF4616]/25 flex items-center justify-center">

                  <Bot
                    size={22}
                    className="text-[#FF4616]"
                  />

                </div>

                <div>

                  <div className="font-bold">
                    Layboka Sales Agent
                  </div>

                  <div className="text-xs text-white/35">
                    Your store's AI salesperson
                  </div>

                </div>

              </div>


              <div className="py-6 space-y-4">

                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.05] border border-white/[0.06] p-4 text-sm text-white/70">
                  Looking for something specific? I can help you find the
                  right product.
                </div>


                <div className="ml-auto max-w-[78%] rounded-2xl rounded-tr-sm bg-[#FF4616] p-4 text-sm">
                  Which one would you recommend?
                </div>


                <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white/[0.05] border border-white/[0.06] p-4">

                  <div className="flex gap-3">

                    <div className="w-16 h-16 rounded-xl bg-white/[0.05] shrink-0" />

                    <div>

                      <div className="font-semibold text-sm">
                        Recommended Product
                      </div>

                      <div className="text-xs text-white/40 mt-1">
                        Best match for your needs
                      </div>

                      <div className="text-[#FF4616] font-bold text-sm mt-2">
                        $49.00
                      </div>

                    </div>

                  </div>

                </div>

              </div>


              <div className="flex gap-2">

                <div className="flex-1 lb-input flex items-center text-xs text-white/25">
                  Ask Layboka...
                </div>

                <button
                  type="button"
                  className="w-[50px] h-[50px] rounded-xl bg-[#FF4616] flex items-center justify-center"
                  aria-label="Send message"
                >

                  <ArrowRight
                    size={18}
                  />

                </button>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ================================================================== */}
      {/* BENEFITS                                                           */}
      {/* ================================================================== */}

      <section className="lb-section-sm">

        <div className="lb-container">

          <div className="lb-card overflow-hidden">

            <div className="grid md:grid-cols-3">

              {[
                {
                  icon: Users,
                  title: 'Engage',
                  text: 'Start conversations with visitors who need help.',
                },
                {
                  icon: Search,
                  title: 'Recommend',
                  text: 'Guide shoppers toward products that fit their needs.',
                },
                {
                  icon: TrendingUp,
                  title: 'Convert',
                  text: 'Help turn product interest into buying action.',
                },
              ].map(
                ({
                  icon: Icon,
                  title,
                  text,
                }) => (

                  <div
                    key={title}
                    className="p-7 sm:p-9 border-b md:border-b-0 md:border-r last:border-0 border-white/[0.07]"
                  >

                    <Icon
                      size={24}
                      className="text-[#FF4616]"
                      strokeWidth={2.4}
                    />

                    <h3 className="mt-5 font-bold text-lg">
                      {title}
                    </h3>

                    <p className="mt-2 text-sm text-white/40 leading-6">
                      {text}
                    </p>

                  </div>

                )
              )}

            </div>

          </div>

        </div>

      </section>


      {/* ================================================================== */}
      {/* PRICING                                                            */}
      {/* ================================================================== */}

      <section
        id="pricing"
        className="lb-section border-y border-white/[0.06]"
      >

        <div className="lb-container">

          <div className="text-center max-w-2xl mx-auto">

            <span className="lb-eyebrow justify-center">
              <Sparkles size={14} />
              Simple Pricing
            </span>

            <h2 className="lb-heading lb-heading-lg mt-4">
              Start small.
              <br />
              <span className="lb-gradient-text">
                Scale when you're ready.
              </span>
            </h2>

            <p className="lb-lead mx-auto mt-5">
              Start with the {TRIAL.days}-day free trial and choose the plan
              that fits your store.
            </p>

          </div>


          <div className="lb-pricing-grid mt-14">

            {[
              PLANS.starter,
              PLANS.growth,
              PLANS.pro,
            ].map(
              (plan) => (

                <article
                  key={plan.id}
                  className={`lb-pricing-card ${
                    'popular' in plan &&
                    plan.popular
                      ? 'lb-pricing-card-popular'
                      : ''
                  }`}
                >

                  {'popular' in plan &&
                    plan.popular && (
                      <span className="lb-pricing-popular">
                        Most Popular
                      </span>
                    )}


                  <div className="text-sm text-white/45 font-semibold">
                    {plan.name}
                  </div>

                  <div className="mt-5 flex items-end gap-1">

                    <span className="text-4xl font-black tracking-tight">
                      ${plan.monthlyUSD}
                    </span>

                    <span className="text-sm text-white/35 mb-1">
                      /month
                    </span>

                  </div>


                  <p className="mt-4 text-sm leading-6 text-white/40 min-h-[48px]">
                    {plan.description}
                  </p>


                  <div className="mt-7 space-y-3">

                    {plan.features.slice(
                      0,
                      6
                    ).map(
                      (feature) => (

                        <div
                          key={feature}
                          className="flex gap-2.5 text-sm text-white/60"
                        >

                          <Check
                            size={16}
                            className="text-[#FF4616] mt-0.5 shrink-0"
                            strokeWidth={3}
                          />

                          <span>
                            {feature}
                          </span>

                        </div>

                      )
                    )}

                  </div>


                  <a
                    href="#install"
                    className={`lb-btn ${
                      'popular' in plan &&
                      plan.popular
                        ? 'lb-btn-primary'
                        : 'lb-btn-secondary'
                    } lb-btn-full mt-8`}
                  >
                    Start Free Trial
                    <ArrowRight size={15} />
                  </a>

                </article>

              )
            )}

          </div>


          <div className="text-center mt-7">

            <a
              href={ROUTES.pricing}
              className="inline-flex items-center gap-2 text-sm text-[#FF4616] font-semibold hover:text-[#ff704c]"
            >
              Compare all plans
              <ChevronRight size={16} />
            </a>

          </div>

        </div>

      </section>


      {/* ================================================================== */}
      {/* FAQ                                                                */}
      {/* ================================================================== */}

      <section
        id="faq"
        className="lb-section"
      >

        <div className="max-w-3xl mx-auto px-5 sm:px-0">

          <div className="text-center">

            <span className="lb-eyebrow justify-center">
              Questions
            </span>

            <h2 className="lb-heading lb-heading-md mt-4">
              Frequently asked questions
            </h2>

          </div>


          <div className="mt-10">

            {faqs.map(
              (faq) => (
                <FAQItem
                  key={faq.question}
                  {...faq}
                />
              )
            )}

          </div>

        </div>

      </section>


      {/* ================================================================== */}
      {/* FINAL CTA                                                          */}
      {/* ================================================================== */}

      <section className="lb-section-sm">

        <div className="lb-container">

          <div className="relative overflow-hidden rounded-[28px] border border-[#FF4616]/20 bg-[#FF4616]/[0.045] px-6 py-14 sm:px-12 sm:py-16 text-center">

            <div className="absolute w-80 h-80 rounded-full bg-[#FF4616]/10 blur-[100px] -top-48 left-1/2 -translate-x-1/2 pointer-events-none" />


            <div className="relative">

              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FF4616]/10 border border-[#FF4616]/25 mb-6">

                <Bot
                  size={27}
                  className="text-[#FF4616]"
                />

              </div>


              <h2 className="lb-heading lb-heading-md max-w-3xl mx-auto">
                Your next customer could be
                <span className="lb-gradient-text">
                  {' '}waiting for an answer.
                </span>
              </h2>


              <p className="mt-5 text-white/45 max-w-xl mx-auto leading-7">
                Put an AI Sales Agent on your store and give shoppers help
                whenever they are ready to buy.
              </p>


              <div className="mt-8">

                <InstallForm />

              </div>


              <p className="mt-4 text-xs text-white/30">
                {TRIAL.days}-day free trial · No credit card required to start
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* ================================================================== */}
      {/* FOOTER                                                             */}
      {/* ================================================================== */}

      <footer className="lb-footer">

        <div className="lb-container">

          <div className="lb-footer-grid">

            <div>

              <BrandLogo />


              <p className="mt-5 max-w-xs text-sm leading-6 text-white/35">
                {BRAND.tagline}. Layboka helps ecommerce stores engage
                shoppers and turn product conversations into sales.
              </p>

            </div>


            <div>

              <h3 className="lb-footer-title">
                Product
              </h3>

              <div className="lb-footer-links">

                <a
                  href="#features"
                  className="lb-footer-link"
                >
                  Features
                </a>

                <a
                  href="#how-it-works"
                  className="lb-footer-link"
                >
                  How It Works
                </a>

                <a
                  href={ROUTES.pricing}
                  className="lb-footer-link"
                >
                  Pricing
                </a>

              </div>

            </div>


            <div>

              <h3 className="lb-footer-title">
                Company
              </h3>

              <div className="lb-footer-links">

                <a
                  href="/about"
                  className="lb-footer-link"
                >
                  About
                </a>

                <a
                  href="/contact"
                  className="lb-footer-link"
                >
                  Contact
                </a>

                <a
                  href="/docs"
                  className="lb-footer-link"
                >
                  Documentation
                </a>

              </div>

            </div>


            <div>

              <h3 className="lb-footer-title">
                Legal
              </h3>

              <div className="lb-footer-links">

                <a
                  href="/privacy"
                  className="lb-footer-link"
                >
                  Privacy Policy
                </a>

                <a
                  href="/terms"
                  className="lb-footer-link"
                >
                  Terms of Service
                </a>

              </div>

            </div>

          </div>


          <div className="lb-footer-bottom">

            <span>
              © {new Date().getFullYear()} LaybokaV1. All rights reserved.
            </span>

            <span>
              Built for ecommerce sales.
            </span>

          </div>

        </div>

      </footer>

    </main>
  );
}
