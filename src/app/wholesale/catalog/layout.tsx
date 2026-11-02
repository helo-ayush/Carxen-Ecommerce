import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wholesale Catalog',
  description:
    'Browse the Carxen wholesale catalog: premium seat covers, all-weather floor mats, steering wheel covers and cabin accessories at bulk pricing.',
  alternates: { canonical: '/wholesale/catalog' },
};

export default function WholesaleCatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
