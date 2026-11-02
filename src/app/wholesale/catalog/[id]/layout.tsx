import type { Metadata } from 'next';
import { noindexMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Wholesale Product',
  ...noindexMetadata(),
};

export default function WholesaleCatalogItemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
