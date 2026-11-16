import type { Metadata } from 'next';
import { noindexMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Dealer Quotes & Saved Assortments',
  ...noindexMetadata(),
};

export default function WholesaleQuotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
