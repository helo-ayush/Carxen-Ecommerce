import type { Metadata } from 'next';
import { noindexMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Procurement Basket',
  ...noindexMetadata(),
};

export default function WholesaleOrderBasketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
