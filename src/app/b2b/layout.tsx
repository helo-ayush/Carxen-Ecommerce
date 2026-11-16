import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authorized Dealer Network | B2B Commercial Automotive',
  description:
    'Direct factory sourcing of premium car accessories for authorized dealerships, garages and fleet operators. Commercial trade pricing, MOQ consignments and dedicated dealer desk support.',
  alternates: { canonical: '/dealer' },
  openGraph: {
    title: 'Authorized Dealer Network | CarXen',
    description:
      'Direct factory sourcing for dealerships and garages. Commercial trade pricing on premium car accessories.',
    url: '/dealer',
  },
};

export default function B2BLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
