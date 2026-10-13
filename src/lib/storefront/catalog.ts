import { createClient } from '@supabase/supabase-js';
import type {
  Product,
  ProductArtKey,
  ProductCategory,
  ProductSeries,
  ProductTintOption,
} from '@/data/products';
import type { StorefrontProductsResponse } from './types';

type StoreId = string | number;

export interface EcommerceStoreRow {
  id: StoreId;
  slug: string;
  isPublic: boolean;
}

export interface EcommerceProductRow {
  publicId: number | string;
  storeId: StoreId;
  slug: string;
  name: string;
  categoryKey: string;
  categoryLabel: string | null;
  series: string;
  price: number | string;
  originalPrice: number | string | null;
  rating: number | string;
  reviewCount: number | string;
  artKey: string;
  topRank: number | string | null;
  isNew: boolean;
  isSpotlight: boolean;
  isPickup: boolean;
  description: string;
  specifications: unknown;
  tintOptions: unknown;
  fitment: unknown;
  isCustomFit: boolean;
  status: string;
  publishedAt: string | null;
  updatedAt: string | null;
}

export class CatalogConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogConfigurationError';
  }
}

export class CatalogNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogNotFoundError';
  }
}

class CatalogDatabaseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'CatalogDatabaseError';
  }
}

const PRODUCT_COLUMNS = [
  'publicId',
  'storeId',
  'slug',
  'name',
  'categoryKey',
  'categoryLabel',
  'series',
  'price',
  'originalPrice',
  'rating',
  'reviewCount',
  'artKey',
  'topRank',
  'isNew',
  'isSpotlight',
  'isPickup',
  'description',
  'specifications',
  'tintOptions',
  'fitment',
  'isCustomFit',
  'status',
  'publishedAt',
  'updatedAt',
].join(', ');

const CATEGORY_KEYS = ['seats', 'mats', 'steering', 'comfort'] as const;
const SERIES_KEYS = ['Signature', 'Sport', 'Urban', 'Essentials'] as const;
const ART_KEYS = ['seat', 'mats', 'wheel', 'pillow', 'arm', 'trunk'] as const;

function getCatalogConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const storeSlug = process.env.NEXT_PUBLIC_ECOMMERCE_STORE_SLUG?.trim();

  const missing = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    !storeSlug && 'NEXT_PUBLIC_ECOMMERCE_STORE_SLUG',
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new CatalogConfigurationError(
      `Catalog backend is not configured. Set ${missing.join(', ')}.`,
    );
  }

  return { supabaseUrl: supabaseUrl!, supabaseAnonKey: supabaseAnonKey!, storeSlug: storeSlug! };
}

function asFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asCategory(value: unknown): ProductCategory | null {
  return typeof value === 'string' && CATEGORY_KEYS.includes(value as ProductCategory)
    ? (value as ProductCategory)
    : null;
}

function asSeries(value: unknown): ProductSeries | null {
  return typeof value === 'string' && SERIES_KEYS.includes(value as ProductSeries)
    ? (value as ProductSeries)
    : null;
}

function asArtKey(value: unknown, category?: ProductCategory | null): ProductArtKey {
  if (typeof value === 'string' && ART_KEYS.includes(value as ProductArtKey)) {
    return value as ProductArtKey;
  }
  if (category === 'seats') return 'seat';
  if (category === 'mats') return 'mats';
  if (category === 'steering') return 'wheel';
  if (category === 'comfort') return 'pillow';
  return 'seat';
}

function asSpecifications(value: unknown): [string, string][] {
  if (Array.isArray(value)) {
    const specifications: [string, string][] = [];
    for (const item of value) {
      if (Array.isArray(item) && item.length >= 2) {
        const key = asNonEmptyString(item[0]);
        const label = asNonEmptyString(item[1]);
        if (key && label) specifications.push([key, label]);
      }
    }
    return specifications;
  }

  if (value && typeof value === 'object') {
    const specifications: [string, string][] = [];
    for (const [k, v] of Object.entries(value)) {
      const key = asNonEmptyString(k);
      const label = asNonEmptyString(v);
      if (key && label) specifications.push([key, label]);
    }
    return specifications;
  }

  return [];
}

function asTintOptions(value: unknown): ProductTintOption[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const options: ProductTintOption[] = [];
  for (const item of value) {
    if (Array.isArray(item) && item.length >= 3) {
      const label = asNonEmptyString(item[0]);
      const filter = asNonEmptyString(item[1]);
      const color = asNonEmptyString(item[2]);
      if (label && filter && color) options.push([label, filter, color]);
      continue;
    }

    if (item && typeof item === 'object') {
      const option = item as Record<string, unknown>;
      const label = asNonEmptyString(option.label ?? option.name);
      const filter = asNonEmptyString(option.filter ?? option.cssFilter);
      const color = asNonEmptyString(option.color ?? option.hex);
      if (label && filter && color) options.push([label, filter, color]);
    }
  }

  return options.length > 0 ? options : undefined;
}

function mapProductRow(row: EcommerceProductRow): Product | null {
  const id = asFiniteNumber(row.publicId);
  const name = asNonEmptyString(row.name);
  const category = asCategory(row.categoryKey);
  const series = asSeries(row.series);
  const price = asFiniteNumber(row.price);
  const rating = asFiniteNumber(row.rating) ?? 4.5;
  const reviewCount = asFiniteNumber(row.reviewCount) ?? 0;
  const artKey = asArtKey(row.artKey, category);
  const description = asNonEmptyString(row.description) ?? '';
  const specifications = asSpecifications(row.specifications);

  if (
    id === null ||
    !name ||
    !category ||
    !series ||
    price === null
  ) {
    return null;
  }

  const originalPrice = row.originalPrice === null ? null : asFiniteNumber(row.originalPrice);
  if (row.originalPrice !== null && originalPrice === null) return null;

  const topRank = row.topRank === null ? null : asFiniteNumber(row.topRank);
  if (row.topRank !== null && topRank === null) return null;

  const slug = asNonEmptyString(row.slug);
  const categoryLabel = asNonEmptyString(row.categoryLabel);
  const tintOptions = asTintOptions(row.tintOptions);

  return {
    id,
    n: name,
    c: category,
    s: series,
    p: price,
    ...(originalPrice !== null ? { o: originalPrice } : {}),
    r: rating,
    rv: reviewCount,
    a: artKey,
    ...(topRank !== null ? { top: topRank } : {}),
    ...(row.isNew ? { nw: 1 } : {}),
    ...(row.isSpotlight ? { spot: 1 } : {}),
    ...(row.isPickup ? { pk: 1 } : {}),
    d: description,
    sp: specifications,
    ...(slug ? { slug } : {}),
    ...(categoryLabel ? { categoryLabel } : {}),
    ...(tintOptions ? { tintOptions } : {}),
    fitment: row.fitment,
    customFit: row.isCustomFit,
  };
}

export async function getStorefrontProducts(): Promise<StorefrontProductsResponse> {
  const { supabaseUrl, supabaseAnonKey, storeSlug } = getCatalogConfig();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: storeData, error: storeError } = await supabase
    .from('ecommerce_stores')
    .select('id, slug, isPublic')
    .eq('slug', storeSlug)
    .eq('isPublic', true)
    .eq('status', 'PUBLISHED')
    .maybeSingle();

  if (storeError) {
    throw new CatalogDatabaseError('Unable to resolve the public ecommerce store.', storeError);
  }

  const store = storeData as EcommerceStoreRow | null;
  if (!store) {
    throw new CatalogNotFoundError(`No public ecommerce store is configured for "${storeSlug}".`);
  }

  const { data: productRows, error: productError } = await supabase
    .from('ecommerce_products')
    .select(PRODUCT_COLUMNS)
    .eq('storeId', store.id)
    .eq('status', 'PUBLISHED')
    .not('publishedAt', 'is', null)
    .order('topRank', { ascending: true, nullsFirst: false })
    .order('updatedAt', { ascending: false });

  if (productError) {
    throw new CatalogDatabaseError('Unable to load ecommerce products.', productError);
  }

  const rows = (productRows || []) as unknown as EcommerceProductRow[];
  const products = rows
    .map(mapProductRow)
    .filter((product): product is Product => product !== null);

  return {
    store: { slug: store.slug },
    products,
  };
}
