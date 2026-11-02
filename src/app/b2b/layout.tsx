import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'B2B Wholesale Car Accessories',
  description:
    'Direct factory sourcing of premium car accessories for dealerships, garages and fleet operators. Bulk pricing, MOQ-based orders and dedicated account support.',
  alternates: { canonical: '/b2b' },
  openGraph: {
    title: 'B2B Wholesale Car Accessories | Carxen',
    description:
      'Direct factory sourcing for dealerships and garages. Bulk pricing on premium car accessories.',
    url: '/b2b',
  },
};

export default function B2BLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
