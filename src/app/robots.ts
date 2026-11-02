import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/account',
          '/profile',
          '/login',
          '/checkout',
          '/order/',
          '/wishlist',
          '/garage',
          '/wholesale/account',
          '/wholesale/orders',
          '/wholesale/order-basket',
          '/wholesale/quotes',
          '/wholesale/quick-order',
          '/b2b/quick-order',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
