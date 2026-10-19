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
  settings?: Record<string, unknown>;
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
  installation?: unknown;
  isCustomFit: boolean;
  status: string;
  publishedAt: string | null;
  updatedAt: string | null;
  images?: unknown;
  tags?: unknown;
  colors?: unknown;
  isCombo?: boolean;
  comboItems?: unknown;
  wholesalePrice?: number | string | null;
  b2bMoq?: number | string | null;
  discountLimitQty?: number | string | null;
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
  'images',
  'tags',
  'colors',
  'isCombo',
  'comboItems',
  'wholesalePrice',
  'b2bMoq',
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

function asCategory(value: unknown): ProductCategory {
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'seats' || lower.includes('seat')) return 'seats';
    if (lower === 'mats' || lower.includes('mat') || lower.includes('floor')) return 'mats';
    if (lower === 'steering' || lower.includes('steer') || lower.includes('wheel')) return 'steering';
    if (lower === 'comfort' || lower.includes('pillow') || lower.includes('cushion') || lower.includes('interior')) return 'comfort';
  }
  return 'seats';
}

function asSeries(value: unknown): ProductSeries {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    for (const key of SERIES_KEYS) {
      if (key.toLowerCase() === trimmed.toLowerCase()) return key;
    }
    const lower = trimmed.toLowerCase();
    if (lower.includes('sport') || lower.includes('rally')) return 'Sport';
    if (lower.includes('urban') || lower.includes('city')) return 'Urban';
    if (lower.includes('essential') || lower.includes('basic')) return 'Essentials';
  }
  return 'Signature';
}

function isImageUrl(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('data:image')
    ) {
      return trimmed;
    }
  }
  return undefined;
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

function getFallbackTags(category: ProductCategory, isCustomFit: boolean, name: string): string[] {
  const lowerName = name.toLowerCase();
  if (category === 'seats') {
    return ['Custom Fit', 'Nappa Leather', 'Waterproof', 'Breathable', 'Easy Clean', 'SUV', 'Sedan'];
  }
  if (category === 'mats') {
    return ['All-Weather', 'Waterproof', 'Custom Fit', 'Anti-Slip', 'Easy Clean', 'OEM Grade'];
  }
  if (category === 'steering') {
    return ['Anti-Slip', 'Nappa Leather', 'Breathable', 'Custom Fit', 'Easy Clean'];
  }
  if (category === 'comfort') {
    if (lowerName.includes('pillow') || lowerName.includes('neck')) {
      return ['Breathable', 'Easy Clean', 'OEM Grade', 'SUV', 'Sedan'];
    }
    if (lowerName.includes('organiser') || lowerName.includes('organizer')) {
      return ['Waterproof', 'Easy Clean', 'Scratch-Resistant', 'SUV', 'OEM Grade'];
    }
    return ['Breathable', 'Easy Clean', 'OEM Grade', 'Sedan', 'SUV'];
  }
  return ['OEM Grade', 'Easy Clean', 'Scratch-Resistant'];
}

function mapProductRow(
  row: EcommerceProductRow,
  isWholesale?: boolean,
  wholesaleTier?: 'tier1' | 'tier2'
): Product | null {
  const id = asFiniteNumber(row.publicId) ?? 1;
  const name = asNonEmptyString(row.name) || 'CarXen Accessory';
  const category = asCategory(row.categoryKey);
  const series = asSeries(row.series);
  const rawPrice = asFiniteNumber(row.price);
  const price = rawPrice !== null && rawPrice >= 0 ? rawPrice : 999;
  const rating = Math.min(5, Math.max(1, asFiniteNumber(row.rating) ?? 4.8));
  const reviewCount = Math.max(0, asFiniteNumber(row.reviewCount) ?? 12);
  const artKey = asArtKey(row.artKey, category);
  const rawImages = Array.isArray(row.images)
    ? (row.images as unknown[]).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : [];
  const imageUrl = rawImages[0] || isImageUrl(row.artKey);
  const images = rawImages.length > 0 ? rawImages : (imageUrl ? [imageUrl] : []);
  const rawTags = Array.isArray(row.tags)
    ? (row.tags as unknown[]).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : [];
  const isCustomFit =
    typeof row.isCustomFit === 'boolean'
      ? row.isCustomFit
      : category === 'seats' || category === 'mats';
  const tags = rawTags.length > 0 ? rawTags : getFallbackTags(category, isCustomFit, name);
  const description =
    asNonEmptyString(row.description) ??
    'Engineered automotive accessory for enhanced cabin aesthetics and protection.';
  const specifications = asSpecifications(row.specifications);

  const originalPrice =
    row.originalPrice === null || row.originalPrice === undefined
      ? undefined
      : asFiniteNumber(row.originalPrice) ?? undefined;
  const topRank =
    row.topRank === null || row.topRank === undefined
      ? undefined
      : asFiniteNumber(row.topRank) ?? undefined;
  const slug =
    asNonEmptyString(row.slug) ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  const categoryLabel =
    asNonEmptyString(row.categoryLabel) || asNonEmptyString(row.categoryKey) || 'Accessories';
  const tintOptions = asTintOptions(row.colors) || asTintOptions(row.tintOptions);

  return {
    id,
    n: name,
    c: category,
    s: series,
    p: price,
    ...(originalPrice && originalPrice > price ? { o: originalPrice } : {}),
    r: rating,
    rv: reviewCount,
    a: artKey,
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(images.length > 0 ? { images } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(topRank !== undefined ? { top: topRank } : {}),
    ...(row.isNew ? { nw: 1 } : {}),
    ...(row.isSpotlight ? { spot: 1 } : {}),
    ...(row.isPickup ? { pk: 1 } : {}),
    d: description,
    sp: specifications,
    slug,
    categoryLabel,
    ...(tintOptions ? { tintOptions } : {}),
    fitment: row.fitment,
    installation: row.installation as any,
    isCombo: Boolean(row.isCombo),
    comboItems: Array.isArray(row.comboItems) ? (row.comboItems as any) : undefined,
    customFit: isCustomFit,
    discountLimitQty: (() => {
      const specLimit = row.specifications && typeof (row.specifications as any).discountLimitQty === 'number'
        ? (row.specifications as any).discountLimitQty
        : null;
      const parsedLimit = asFiniteNumber((row as any).discountLimitQty ?? specLimit);
      return parsedLimit !== null && parsedLimit > 0 ? parsedLimit : null;
    })(),
    ...(isWholesale ? (() => {
      const parsedWholesale = asFiniteNumber(row.wholesalePrice);
      const wsPrice = parsedWholesale !== null && parsedWholesale > 0
        ? parsedWholesale
        : Math.round(price * 0.6);
      const parsedMoq = asFiniteNumber(row.b2bMoq);
      const moq = parsedMoq !== null && parsedMoq > 0 ? parsedMoq : 5;
      const basePriceExGst = Math.round(wsPrice / 1.18);
      const gstAmount = wsPrice - basePriceExGst;

      return {
        wholesalePrice: wsPrice,
        b2bMoq: moq,
        taxBreakdown: {
          gstPercent: 18,
          basePriceExGst,
          gstAmount,
        },
        wholesaleTier: wholesaleTier || 'tier1',
      };
    })() : {}),
  };
}

export async function getStorefrontProducts(options?: {
  isWholesale?: boolean;
  wholesaleTier?: 'tier1' | 'tier2';
}): Promise<StorefrontProductsResponse> {
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
    .select('id, slug, isPublic, settings')
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
    .map((row) => mapProductRow(row, options?.isWholesale, options?.wholesaleTier))
    .filter((product): product is Product => product !== null);

  return {
    store: { slug: store.slug, settings: (store as any).settings || {} },
    products,
  };
}
