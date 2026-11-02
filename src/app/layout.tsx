import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { SvgDefs } from '@/components/SvgDefs';
import { Header } from '@/components/Header';
import { MobileMenu } from '@/components/MobileMenu';
import { CartDrawer } from '@/components/CartDrawer';
import { QuickViewModal } from '@/components/QuickViewModal';
import { CustomCursor } from '@/components/CustomCursor';
import { ScrollProgress } from '@/components/ScrollProgress';
import { BackToTop } from '@/components/BackToTop';
import { Toast } from '@/components/Toast';
import { Preloader } from '@/components/Preloader';
import { BottomNav } from '@/components/BottomNav';
import { PwaSupport } from '@/components/PwaSupport';
import { B2BSupportModal } from '@/components/wholesale/B2BSupportModal';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.carxen.in';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Carxen — Premium Car Accessories Online | Seat Covers, Floor Mats & More',
    template: '%s | Carxen',
  },
  description:
    'Shop premium car accessories at Carxen: car seat covers, all-weather floor mats, steering wheel covers and cabin comfort. Precision fit for 100+ vehicle models with a 2-year warranty.',
  applicationName: 'Carxen',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Carxen',
    locale: 'en_IN',
    url: '/',
    title: 'Carxen — Premium Car Accessories Online',
    description:
      'Premium seat covers, all-weather floor mats, steering covers and cabin comfort. Precision fit for 100+ vehicle models.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 675,
        alt: 'Carxen — Premium Car Accessories',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carxen — Premium Car Accessories Online',
    description:
      'Premium seat covers, all-weather floor mats, steering covers and cabin comfort. Precision fit for 100+ vehicle models.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: '/',
  },
};

const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Carxen',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    'Premium car accessories brand: seat covers, all-weather floor mats, steering wheel covers and cabin comfort for 100+ vehicle models.',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['English', 'Hindi'],
  },
};

const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: 'Carxen',
  url: SITE_URL,
  publisher: {
    '@id': `${SITE_URL}/#organization`,
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export const viewport: Viewport = {
  themeColor: '#e2231a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_SCHEMA) }}
        />
      </head>
      <body>
        <AppProvider>
          <Preloader />
          <CustomCursor />
          <ScrollProgress />
          <SvgDefs />
          <Header />
          <MobileMenu />
          {children}
          <CartDrawer />
          <QuickViewModal />
          <B2BSupportModal />
          <Toast />
          <PwaSupport />
          <BottomNav />
          <BackToTop />
        </AppProvider>
      </body>
    </html>
  );
}
