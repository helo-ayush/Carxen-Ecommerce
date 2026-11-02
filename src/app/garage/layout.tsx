import type { Metadata } from 'next';
import { noindexMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'My Garage',
  ...noindexMetadata(),
};

export default function GarageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
