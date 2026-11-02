import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Read the Carxen terms of service: ordering, shipping, warranty and returns for premium car accessories purchased on Carxen.',
  alternates: { canonical: '/terms' },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
