import type { Metadata } from 'next';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.carxen.in';

export const SITE_NAME = 'Carxen';

export function noindexMetadata(): Metadata {
  return {
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  };
}
