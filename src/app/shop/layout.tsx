import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop Car Accessories by Vehicle',
  description:
    'Browse premium car accessories by vehicle model: seat covers, all-weather floor mats, steering wheel covers, armrests and more. Precision fit for 100+ cars.',
  alternates: { canonical: '/shop' },
  openGraph: {
    title: 'Shop Car Accessories by Vehicle | Carxen',
    description:
      'Premium seat covers, floor mats and steering covers — precision fit for 100+ vehicle models.',
    url: '/shop',
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
