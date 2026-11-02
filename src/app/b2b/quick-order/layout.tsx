import type { Metadata } from 'next';
import { noindexMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Quick Order',
  ...noindexMetadata(),
};

export default function B2BQuickOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
