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

export const metadata: Metadata = {
  title: 'CARXEN — Engineered for Every Drive | Premium Car Accessories',
  description:
    'CARXEN: premium seat covers, all-weather floor mats, steering covers and cabin comfort. Precision fit for 100+ vehicle models.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
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
          <Toast />
          <PwaSupport />
          <BottomNav />
          <BackToTop />
        </AppProvider>
      </body>
    </html>
  );
}
