/**
 * ============================================================================
 * LaybokaV1 — V1
 * Pricing Page
 * ============================================================================
 *
 * File:
 * frontend/src/app/pricing/page.tsx
 *
 * Purpose:
 * - Public V1 pricing page
 * - USD global pricing
 * - INR pricing visibility
 * - 5-day free trial
 * - Feature comparison
 * - Shopify installation CTA
 * - Enterprise contact CTA
 *
 * Brand:
 * Primary    #FF4616
 * Background #040501
 *
 * ============================================================================
 */

'use client';

import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Globe2,
  Menu,
  Minus,
  Sparkles,
  Store,
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
  useState,
} from 'react';


// ============================================================================
// LOGO
// ============================================================================

function BrandLogo() {

  return (
    <a
      href={ROUTES.home}
      className="lb-logo"
      aria-label="LaybokaV1 home"
    >

      <span
        className="lb-logo-mark"
        aria-hidden="true"
      >
        <span className="lb-logo-letter lb-logo-a">
          A
        </span>

        <span className="lb-logo-letter lb-logo-v">
          V
        </span>
      </span>

      <span>
        LaybokaV1
      </span>

    </a>
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


  return (
    <header className="lb-header">

      <div className="lb-container lb-header-inner">

        <BrandLogo />


        <nav
          className="lb-nav"
          aria-label="Main navigation"
        >

          <a
            href={`${ROUTES.home}#features`}
            className="lb-nav-link"
          >
            Features
          </a>

          <a
            href={`${ROUTES.home}#how-it-works`}
            className="lb-nav-link"
          >
            How It Works
          </a>

          <a
            href={ROUTES.pricing}
            className="lb-nav-link"
            style={{
              color: '#ffffff',
            }}
          >
            Pricing
          </a>

          <a
            href={ROUTES.documentation}
            className="lb-nav-link"
          >
            Documentation
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
            href={`${ROUTES.home}#install`}
            className="lb-btn lb-btn-primary"
          >
            Start Free Trial
            <ArrowRight size={15} />
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
        >

          {mobileOpen ? (
            <X size={20} />
          ) : (
            <Menu size={20} />
          )}

        </button>

      </div>


      {mobileOpen && (

        <div className="lb-mobile-menu md:hidden">

          <div className="lb-mobile-menu-links">

            <a
              href={`${ROUTES.home}#features`}
              className="lb-mobile-menu-link"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              Features
            </a>

            <a
              href={`${ROUTES.home}#how-it-works`}
              className="lb-mobile-menu-link"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              How It Works
            </a>

            <a
              href={ROUTES.pricing}
              className="lb-mobile-menu-link"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              Pricing
            </a>

            <a
              href={ROUTES.documentation}
              className="lb-mobile-menu-link"
              onClick={() =>
                setMobileOpen(false)
              }
            >
              Documentation
            </a>

          </div>


          <div className="mt-5 flex flex-col gap-3">

            <a
              href={ROUTES.login}
              className="lb-btn lb-btn-secondary lb-btn-full"
            >
              Log in
            </a>

            <a
              href={`${ROUTES.home}#install`}
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
// PLAN CARD
// ============================================================================

function PlanCard({
  plan,
  featured = false,
}: {
  plan: typeof PLANS.starter;
  featured?: boolean;
}) {

  const isEnterprise =
    plan.id === 'enterprise';


  return (
    <article
      className={
        featured
          ? 'lb-pricing-card lb-pricing-card-popular'
          : 'lb-pricing-card'
      }
    >

      {featured && (
        <span className="lb-pricing-popular">
          Most Popular
        </span>
      )}


      <div className="flex items-center justify-between gap-3">

        <div className="text-sm font-bold text-white/70">
          {plan.name}
        </div>

        {featured && (
          <Sparkles
            size={17}
            className="text-[#FF4616]"
          />
        )}

      </div>


      <p className="mt-3 min-h-[48px] text-sm leading-6 text-white/40">
        {plan.description}
      </p>


      {isEnterprise ? (

        <div className="mt-7">

          <div className="text-3xl font-black tracking-tight">
            Custom
          </div>

          <div className="mt-2 text-xs text-white/35">
            Tailored to your business
          </div>

        </div>

      ) : (

        <div className="mt-7">

          <div className="flex items-end gap-1">

            <span className="text-5xl font-black tracking-tight">
              ${plan.monthlyUSD}
            </span>

            <span className="mb-1.5 text-sm text-white/35">
              /month
            </span>

          </div>


          <div className="mt-2 text-xs text-white/35">
            India: ₹
            {plan.monthlyINR?.toLocaleString('en-IN')}
            /month
          </div>

        </div>

      )}


      <div className="mt-7 space-y-3">

        {plan.features.map(
          (feature) => (

            <div
              key={feature}
              className="flex items-start gap-2.5 text-sm text-white/60"
            >

              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#FF4616]/10">

                <Check
                  size={11}
                  className="text-[#FF4616]"
                  strokeWidth={3}
                />

              </span>

              <span>
                {feature}
              </span>

            </div>

          )
        )}

      </div>


      {isEnterprise ? (

        <a
          href={`${ROUTES.contact}?plan=enterprise`}
          className="lb-btn lb-btn-secondary lb-btn-full mt-8"
        >
          Contact Sales
          <ArrowRight size={15} />
        </a>

      ) : (

        <a
          href={`${ROUTES.home}#install`}
          className={`lb-btn ${
            featured
              ? 'lb-btn-primary'
              : 'lb-btn-secondary'
          } lb-btn-full mt-8`}
        >
          Start Free Trial
          <ArrowRight size={15} />
        </a>

      )}

    </article>
  );
}


// ============================================================================
// COMPARISON DATA
// ============================================================================

const comparisonRows = [

  {
    feature: '24/7 AI Sales Agent',
    starter: true,
    growth: true,
    pro: true,
    enterprise: true,
  },

  {
    feature: 'Shopify product knowledge',
    starter: true,
    growth: true,
    pro: true,
    enterprise: true,
  },

  {
    feature: 'Product recommendations',
    starter: true,
    growth: true,
    pro: true,
    enterprise: true,
  },

  {
    feature: 'Upselling & cross-selling',
    starter: true,
    growth: true,
    pro: true,
    enterprise: true,
  },

  {
    feature: 'Basic sales analytics',
    starter: true,
    growth: true,
    pro: true,
    enterprise: true,
  },

  {
    feature: 'Higher conversation limits',
    starter: false,
    growth: true,
    pro: true,
    enterprise: true,
  },

  {
    feature: 'Cart recovery assistance',
    starter: false,
    growth: true,
    pro: true,
    enterprise: true,
  },

  {
    feature: 'Conversion analytics',
    starter: false,
    growth: true,
    pro: true,
    enterprise: true,
  },

  {
    feature: 'Advanced sales insights',
    starter: false,
    growth: false,
    pro: true,
    enterprise: true,
  },

  {
    feature: 'Priority AI processing',
    starter: false,
    growth: false,
    pro: true,
    enterprise: true,
  },

  {
    feature: 'Custom usage limits',
    starter: false,
    growth: false,
    pro: false,
    enterprise: true,
  },

  {
    feature: 'Custom integrations',
    starter: false,
    growth: false,
    pro: false,
    enterprise: true,
  },

  {
    feature: 'Dedicated support',
    starter: false,
    growth: false,
    pro: false,
    enterprise: true,
  },

];


// ============================================================================
// COMPARISON TABLE
// ============================================================================

function ComparisonTable() {

  return (
    <div className="mt-14 overflow-x-auto rounded-2xl border border-white/[0.08]">

      <table className="w-full min-w-[760px] border-collapse">

        <thead>

          <tr className="border-b border-white/[0.08] bg-white/[0.025]">

            <th className="px-5 py-4 text-left text-xs font-bold text-white/50">
              Features
            </th>

            <th className="px-5 py-4 text-center text-xs font-bold text-white/60">
              Starter
            </th>

            <th className="px-5 py-4 text-center text-xs font-bold text-[#FF4616]">
              Growth
            </th>

            <th className="px-5 py-4 text-center text-xs font-bold text-white/60">
              Pro
            </th>

            <th className="px-5 py-4 text-center text-xs font-bold text-white/60">
              Enterprise
            </th>

          </tr>

        </thead>


        <tbody>

          {comparisonRows.map(
            (row) => (

              <tr
                key={row.feature}
                className="border-b border-white/[0.055] last:border-0"
              >

                <td className="px-5 py-4 text-sm text-white/60">
                  {row.feature}
                </td>


                {[
                  row.starter,
                  row.growth,
                  row.pro,
                  row.enterprise,
                ].map(
                  (included, index) => (

                    <td
                      key={index}
                      className="px-5 py-4 text-center"
                    >

                      {included ? (

                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FF4616]/10">

                          <Check
                            size={13}
                            className="text-[#FF4616]"
                            strokeWidth={3}
                          />

                        </span>

                      ) : (

                        <Minus
                          size={15}
                          className="mx-auto text-white/15"
                        />

                      )}

                    </td>

                  )
                )}

              </tr>

            )
          )}

        </tbody>

      </table>

    </div>
  );
}


// ============================================================================
// FAQ
// ============================================================================

const pricingFaqs = [

  {
    question: 'Is the free trial really free?',
    answer:
      `Yes. You can use the V1 AI Sales Agent for ${TRIAL.days} days before choosing a paid plan.`,
  },

  {
    question: 'Which currency will I pay in?',
    answer:
      'Layboka V1 uses USD as the global base currency and provides INR pricing for Indian customers.',
  },

  {
    question: 'Can I change plans later?',
    answer:
      'Yes. Your plan can be changed as your store grows. Billing changes are handled through the account billing flow.',
  },

  {
    question: 'Do I need a Shopify store?',
    answer:
      'V1 is specifically designed around Shopify installation and Shopify product data.',
  },

  {
    question: 'What happens after my trial expires?',
    answer:
      'AI access is controlled by the V1 backend. You can select a paid subscription to continue using the Sales Agent.',
  },

];


// ============================================================================
// FAQ ITEM
// ============================================================================

function PricingFAQ({
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
    <div className="border-b border-white/[0.07]">

      <button
        type="button"
        onClick={() =>
          setOpen(!open)
        }
        className="flex w-full items-center justify-between gap-5 py-5 text-left"
        aria-expanded={open}
      >

        <span className="text-sm font-semibold text-white/80">
          {question}
        </span>

        <ChevronDown
          size={18}
          className={`shrink-0 text-[#FF4616] transition-transform ${
            open
              ? 'rotate-180'
              : ''
          }`}
        />

      </button>


      {open && (

        <p className="pb-5 pr-10 text-sm leading-7 text-white/40">
          {answer}
        </p>

      )}

    </div>
  );
}


// ============================================================================
// FOOTER
// ============================================================================

function Footer() {

  return (
    <footer className="lb-footer">

      <div className="lb-container">

        <div className="lb-footer-grid">

          <div>

            <BrandLogo />

            <p className="mt-5 max-w-xs text-sm leading-6 text-white/35">
              {BRAND.tagline}. An AI Sales Agent designed to help ecommerce
              stores engage shoppers and convert more visitors into buyers.
            </p>

          </div>


          <div>

            <h3 className="lb-footer-title">
              Product
            </h3>

            <div className="lb-footer-links">

              <a
                href={`${ROUTES.home}#features`}
                className="lb-footer-link"
              >
                Features
              </a>

              <a
                href={ROUTES.pricing}
                className="lb-footer-link"
              >
                Pricing
              </a>

              <a
                href={ROUTES.documentation}
                className="lb-footer-link"
              >
                Documentation
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
                href={ROUTES.contact}
                className="lb-footer-link"
              >
                Contact
              </a>

            </div>

          </div>


          <div>

            <h3 className="lb-footer-title">
              Legal
            </h3>

            <div className="lb-footer-links">

              <a
                href={ROUTES.privacy}
                className="lb-footer-link"
              >
                Privacy Policy
              </a>

              <a
                href={ROUTES.terms}
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
            Global pricing · USD / INR
          </span>

        </div>

      </div>

    </footer>
  );
}


// ============================================================================
// PAGE
// ============================================================================

export default function PricingPage() {

  return (
    <main className="min-h-screen bg-[#040501] text-white">

      <Header />


      {/* ================================================================== */}
      {/* HERO                                                               */}
      {/* ================================================================== */}

      <section className="lb-hero lb-grid-bg">

        <div className="lb-container">

          <div className="mx-auto max-w-4xl text-center lb-fade-up">

            <div className="flex justify-center">

              <span className="lb-badge lb-badge-primary">

                <Sparkles
                  size={13}
                  className="text-[#FF4616]"
                />

                {TRIAL.label}

              </span>

            </div>


            <h1 className="lb-heading lb-heading-xl mt-7">

              Simple pricing for
              <br />

              <span className="lb-gradient-text">
                serious ecommerce growth.
              </span>

            </h1>


            <p className="lb-lead mx-auto mt-7">
              Start with LaybokaV1 free for {TRIAL.days} days, then choose
              the level of AI sales assistance that fits your store.
            </p>


            <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-white/35">

              <span className="flex items-center gap-2">
                <Check
                  size={14}
                  className="text-[#FF4616]"
                />
                No credit card to start
              </span>

              <span className="flex items-center gap-2">
                <Globe2
                  size={14}
                  className="text-[#FF4616]"
                />
                USD global pricing
              </span>

              <span className="flex items-center gap-2">
                <Zap
                  size={14}
                  className="text-[#FF4616]"
                />
                Cancel anytime
              </span>

            </div>

          </div>

        </div>

      </section>


      {/* ================================================================== */}
      {/* PLANS                                                              */}
      {/* ================================================================== */}

      <section className="pb-24">

        <div className="lb-container">

          <div className="lb-pricing-grid">

            <PlanCard
              plan={PLANS.starter}
            />

            <PlanCard
              plan={PLANS.growth}
              featured
            />

            <PlanCard
              plan={PLANS.pro}
            />

          </div>


          {/* Enterprise */}

          <div className="mt-4">

            <article className="lb-card overflow-hidden border-[#FF4616]/15">

              <div className="grid items-center gap-8 p-7 sm:p-9 md:grid-cols-[1fr_auto]">

                <div className="flex gap-5">

                  <div className="lb-icon-box shrink-0">

                    <Store
                      size={22}
                      strokeWidth={2.4}
                    />

                  </div>


                  <div>

                    <div className="flex flex-wrap items-center gap-3">

                      <h2 className="text-xl font-bold">
                        Enterprise
                      </h2>

                      <span className="rounded-full border border-[#FF4616]/20 bg-[#FF4616]/[0.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#FF4616]">
                        Custom
                      </span>

                    </div>


                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                      For larger businesses that need custom usage,
                      integrations, deployment requirements and dedicated
                      support.
                    </p>


                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/45">

                      <span className="flex items-center gap-1.5">
                        <Check
                          size={13}
                          className="text-[#FF4616]"
                        />
                        Custom usage
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Check
                          size={13}
                          className="text-[#FF4616]"
                        />
                        Custom integrations
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Check
                          size={13}
                          className="text-[#FF4616]"
                        />
                        Dedicated support
                      </span>

                    </div>

                  </div>

                </div>


                <a
                  href={`${ROUTES.contact}?plan=enterprise`}
                  className="lb-btn lb-btn-secondary"
                >
                  Contact Sales
                  <ArrowRight size={15} />
                </a>

              </div>

            </article>

          </div>


          <div className="mt-7 flex items-center justify-center gap-2 text-center text-xs text-white/30">

            <Globe2
              size={14}
              className="text-[#FF4616]"
            />

            USD is the global base price. INR pricing is shown for Indian
            customers.

          </div>

        </div>

      </section>


      {/* ================================================================== */}
      {/* COMPARISON                                                         */}
      {/* ================================================================== */}

      <section className="lb-section border-y border-white/[0.06] bg-white/[0.012]">

        <div className="lb-container">

          <div className="mx-auto max-w-2xl text-center">

            <span className="lb-eyebrow justify-center">
              <Check size={14} />
              Compare Plans
            </span>

            <h2 className="lb-heading lb-heading-lg mt-4">
              Everything you need to
              <br />
              <span className="lb-gradient-text">
                sell with AI.
              </span>
            </h2>

            <p className="lb-lead mx-auto mt-5">
              Choose the plan based on the level of sales automation and
              usage your store needs.
            </p>

          </div>


          <ComparisonTable />

        </div>

      </section>


      {/* ================================================================== */}
      {/* TRIAL CTA                                                          */}
      {/* ================================================================== */}

      <section className="lb-section-sm">

        <div className="lb-container">

          <div className="relative overflow-hidden rounded-[28px] border border-[#FF4616]/20 bg-[#FF4616]/[0.045] px-6 py-14 text-center sm:px-12">

            <div className="pointer-events-none absolute left-1/2 top-[-220px] h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-[#FF4616]/10 blur-[110px]" />


            <div className="relative">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#FF4616]/25 bg-[#FF4616]/10">

                <Zap
                  size={26}
                  className="text-[#FF4616]"
                />

              </div>


              <h2 className="lb-heading lb-heading-md mx-auto mt-6 max-w-3xl">
                Try LaybokaV1 for{' '}
                <span className="lb-gradient-text">
                  {TRIAL.days} days.
                </span>
              </h2>


              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/40">
                Connect your Shopify store and see how an AI Sales Agent can
                help shoppers discover and evaluate your products.
              </p>


              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">

                <a
                  href={`${ROUTES.home}#install`}
                  className="lb-btn lb-btn-primary lb-btn-lg"
                >
                  Start Free Trial
                  <ArrowRight size={16} />
                </a>

                <a
                  href={ROUTES.documentation}
                  className="lb-btn lb-btn-secondary lb-btn-lg"
                >
                  Read Documentation
                  <ChevronRight size={16} />
                </a>

              </div>


              <p className="mt-4 text-xs text-white/25">
                No credit card required to start.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* ================================================================== */}
      {/* FAQ                                                                */}
      {/* ================================================================== */}

      <section className="lb-section">

        <div className="mx-auto max-w-3xl px-5 sm:px-0">

          <div className="text-center">

            <span className="lb-eyebrow justify-center">
              Pricing FAQ
            </span>

            <h2 className="lb-heading lb-heading-md mt-4">
              Questions before you start?
            </h2>

          </div>


          <div className="mt-10">

            {pricingFaqs.map(
              (faq) => (
                <PricingFAQ
                  key={faq.question}
                  {...faq}
                />
              )
            )}

          </div>

        </div>

      </section>


      <Footer />

    </main>
  );
}
