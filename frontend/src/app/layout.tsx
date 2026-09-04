/**
 * ============================================================================
 * Layboka AI — V1
 * Root Layout
 * ============================================================================
 *
 * File:
 * frontend/src/app/layout.tsx
 *
 * Purpose:
 * - Global HTML structure
 * - Global metadata
 * - SEO basics
 * - Viewport configuration
 * - Global stylesheet
 *
 * ============================================================================
 */

import type {
  Metadata,
  Viewport,
} from 'next';

import './globals.css';


// ============================================================================
// METADATA
// ============================================================================

export const metadata: Metadata = {

  title: {
    default:
      'Layboka AI — Your 24/7 AI Sales Agent',
    template:
      '%s | Layboka AI',
  },


  description:
    'Turn your Shopify store into a 24/7 sales machine with Layboka AI. An AI sales agent that helps shoppers discover products, answers questions, recommends products, and converts visitors into buyers.',


  keywords: [
    'AI sales agent',
    'Shopify AI',
    'Shopify sales assistant',
    'AI ecommerce assistant',
    'AI shopping assistant',
    'Shopify chatbot',
    'ecommerce AI',
    'AI sales chatbot',
    'Layboka AI',
  ],


  applicationName:
    'Layboka AI',


  authors: [
    {
      name:
        'Layboka AI',
    },
  ],


  creator:
    'Layboka AI',


  publisher:
    'Layboka AI',


  metadataBase:
    new URL(
      'https://laybokav1.com'
    ),


  alternates: {
    canonical:
      '/',
  },


  openGraph: {

    type:
      'website',

    url:
      'https://laybokav1.com',

    siteName:
      'Layboka AI',

    title:
      'Layboka AI — Your 24/7 AI Sales Agent',

    description:
      'Turn your Shopify store into a 24/7 sales machine with an AI sales agent that helps shoppers buy.',

    locale:
      'en_US',
  },


  twitter: {

    card:
      'summary_large_image',

    title:
      'Layboka AI — Your 24/7 AI Sales Agent',

    description:
      'Turn your Shopify store into a 24/7 sales machine with Layboka AI.',
  },


  robots: {

    index:
      true,

    follow:
      true,

    googleBot: {

      index:
        true,

      follow:
        true,

      'max-image-preview':
        'large',

      'max-snippet':
        -1,

      'max-video-preview':
        -1,
    },
  },


  icons: {

    icon:
      '/favicon.ico',

    shortcut:
      '/favicon.ico',
  },
};


// ============================================================================
// VIEWPORT
// ============================================================================

export const viewport: Viewport = {

  width:
    'device-width',

  initialScale:
    1,

  maximumScale:
    5,

  viewportFit:
    'cover',

  themeColor:
    '#040501',

  colorScheme:
    'dark',
};


// ============================================================================
// ROOT LAYOUT
// ============================================================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (

    <html
      lang="en"
      suppressHydrationWarning
    >

      <body>

        {children}

      </body>

    </html>
  );
}
