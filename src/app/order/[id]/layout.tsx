import type { Metadata } from 'next';
import { noindexMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Order Tracking',
  ...noindexMetadata(),
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
