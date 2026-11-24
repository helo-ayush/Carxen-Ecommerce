import type { Metadata } from 'next';
import { cache } from 'react';
import {
  getStorefrontProductSeoById,
  type StorefrontProductSeo,
} from '@/lib/storefront/catalog';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

// Per-request deduplication between generateMetadata and ProductLayout.
const getProductSeo = cache(async (productId: number) => {
  try {
    return await getStorefrontProductSeoById(productId);
  } catch {
    return null;
  }
});

export const revalidate = 300;

function productUrl(id: number) {
  return `${SITE_URL}/product/${id}`;
}

function absoluteImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('data:')) return '';
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const cut = trimmed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength).replace(/[,.;:]+$/, '')}…`;
}

function buildProductSchema(product: StorefrontProductSeo, url: string) {
  const name = product.name;
  const description =
    product.description?.trim() ||
    `${name} — premium car accessory by Carxen, precision fit with a 2-year warranty.`;
  const images = product.images.map(absoluteImageUrl).filter(Boolean);

  const productSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}/#product`,
    name,
    description,
    sku: `CARXEN-${product.id}`,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    url,
    ...(images.length > 0 ? { image: images } : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: product.price,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@id': `${SITE_URL}/#organization`,
      },
    },
    ...(product.reviewCount > 0 && product.rating > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
    ...(product.categoryLabel
      ? [
          {
            '@type': 'ListItem',
            position: 3,
            name: product.categoryLabel,
            item: `${SITE_URL}/shop?cat=${encodeURIComponent(product.categoryKey)}`,
          },
        ]
      : []),
    {
      '@type': 'ListItem',
      position: product.categoryLabel ? 4 : 3,
      name,
      item: url,
    },
  ];

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  return [productSchema, breadcrumbSchema];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const productId = Number(id);
  const url = productUrl(productId);
  const product = await getProductSeo(productId);

  if (!product) {
    return {
      title: 'Product not found',
      description: 'This product is not available in the Carxen catalog.',
      alternates: { canonical: url },
      robots: { index: false, follow: true },
    };
  }

  const name = product.name;
  const description = truncate(
    product.description?.trim() ||
      `Buy ${name} online at Carxen — premium car accessories with precision fit, 2-year warranty and free shipping across India.`,
    160,
  );
  const images = product.images.map(absoluteImageUrl).filter(Boolean);

  return {
    title: name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: name,
      description,
      url,
      images: images.length > 0 ? images.map((image) => ({ url: image })) : [{ url: '/og-image.jpg' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      description,
      images: images.length > 0 ? images : ['/og-image.jpg'],
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  const product = await getProductSeo(productId);

  if (!product) {
    return <>{children}</>;
  }

  const schema = buildProductSchema(product, productUrl(product.id));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {children}
    </>
  );
}
