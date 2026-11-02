import type { Metadata } from 'next';
import { noindexMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Wholesale Account',
  ...noindexMetadata(),
};

export default function WholesaleAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
