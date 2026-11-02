import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { getStorefrontProducts } from '@/lib/storefront/catalog';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/b2b`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/wholesale`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/wholesale/catalog`, lastModified, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const { products } = await getStorefrontProducts();
    productRoutes = products.map((product) => ({
      url: `${SITE_URL}/product/${product.id}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch {
    // Catalog unavailable (e.g. missing env vars): publish static routes only.
  }

  return [...staticRoutes, ...productRoutes];
}
