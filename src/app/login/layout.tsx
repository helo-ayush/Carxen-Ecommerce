import type { Metadata } from 'next';
import { noindexMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Sign In',
  ...noindexMetadata(),
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
