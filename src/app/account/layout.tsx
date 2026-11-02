import type { Metadata } from 'next';
import { noindexMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'My Account',
  ...noindexMetadata(),
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
