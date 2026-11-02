import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wholesale Car Accessories for Dealerships & Garages',
  description:
    'Wholesale premium car accessories for dealerships, garages and resellers: seat covers, floor mats and steering covers at tiered bulk pricing.',
  alternates: { canonical: '/wholesale' },
  openGraph: {
    title: 'Wholesale Car Accessories | Carxen',
    description:
      'Tiered bulk pricing on premium car accessories for dealerships, garages and resellers.',
    url: '/wholesale',
  },
};

export default function WholesaleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
