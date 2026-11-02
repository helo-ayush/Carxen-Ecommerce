import type { Metadata } from 'next';
import { noindexMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Order Basket',
  ...noindexMetadata(),
};

export default function WholesaleOrderBasketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
