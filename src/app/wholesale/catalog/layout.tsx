import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dealer Catalogue',
  description:
    'Browse the Carxen dealer catalogue: premium seat covers, all-weather floor mats, steering wheel covers and cabin accessories at commercial pricing.',
  alternates: { canonical: '/wholesale/catalog' },
};

export default function WholesaleCatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
