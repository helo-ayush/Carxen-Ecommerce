import type { Metadata } from 'next';
import { noindexMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Wholesale Quotes',
  ...noindexMetadata(),
};

export default function WholesaleQuotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
