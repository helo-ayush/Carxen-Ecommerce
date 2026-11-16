import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authorized Dealer Portal | CarXen Commercial Automotive',
  description:
    'CarXen Authorized Dealer Portal: premium seat covers, 7D floor mats and steering covers for registered dealerships, garages and automotive retailers at commercial trade pricing.',
  alternates: { canonical: '/dealer' },
  openGraph: {
    title: 'Authorized Dealer Portal | CarXen',
    description:
      'Commercial trade pricing on premium car accessories for registered automotive dealerships, workshops and distributors.',
    url: '/dealer',
  },
};

export default function WholesaleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
