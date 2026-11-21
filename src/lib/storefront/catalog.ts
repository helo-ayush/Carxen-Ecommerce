import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import type {
  Product,
  ProductArtKey,
  ProductCategory,
  ProductColor,
  ProductSeries,
  ProductTintOption,
} from '@/data/products';
import type { StorefrontCategory, StorefrontProductsResponse } from './types';
import {
  categoryArtKey,
  categoryLabel as resolveCategoryLabel,
  isMatCategory,
  isSeatCategory,
  normalizeCategoryKey,
  slugifyCategory,
} from './categories';

type StoreId = string | number;

export interface EcommerceStoreRow {
  id: StoreId;
  slug: string;
  isPublic: boolean;
  settings?: Record<string, unknown>;
}

export interface EcommerceProductRow {
  id: string;
  publicId: number | string;
  storeId: StoreId;
  itemMasterId?: string | null;
  categoryId?: string | null;
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
  taxCategory?: string | null;
  taxRate?: number | string | null;
  wholesaleTaxCategory?: string | null;
  wholesaleTaxRate?: number | string | null;
  discountLimitQty?: number | string | null;
  packageDimensions?: string | null;
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
  'id',
  'publicId',
  'storeId',
  'itemMasterId',
  'categoryId',
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

const ART_KEYS = ['seat', 'mats', 'wheel', 'pillow', 'arm', 'trunk'] as const;
const MAX_MAIN_NAV_GROUPS = 3;

function getCatalogConfig() {
  const storeSlug = process.env.NEXT_PUBLIC_ECOMMERCE_STORE_SLUG?.trim() || 'carxen';
  return { storeSlug };
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
  return normalizeCategoryKey(value);
}

function asSeries(value: unknown): ProductSeries {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed;
  }
  return '';
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
  return categoryArtKey(category ?? 'accessories') as ProductArtKey;
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
    if ('items' in value && Array.isArray((value as Record<string, unknown>).items)) {
      return asSpecifications((value as Record<string, unknown>).items);
    }
    const specifications: [string, string][] = [];
    for (const [k, v] of Object.entries(value)) {
      if (
        k === 'discountLimitQty' ||
        k === 'packageDimensions' ||
        k === 'items' ||
        k === 'isCustomProduct' ||
        k === 'manualStock' ||
        k === 'manualReorderPoint' ||
        k === 'wholesaleTier2Qty' ||
        k === 'wholesaleTier2Discount' ||
        k === 'wholesaleTier3Qty' ||
        k === 'wholesaleTier3Discount'
      )
        continue;
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

function asColors(value: unknown): ProductColor[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const colors: ProductColor[] = [];
  for (const item of value) {
    if (item && typeof item === 'object') {
      const option = item as Record<string, unknown>;
      const name = asNonEmptyString(option.name ?? option.label);
      const hex = asNonEmptyString(option.hex ?? option.color);
      const filter = asNonEmptyString(option.filter ?? option.cssFilter);
      const images = Array.isArray(option.images)
        ? (option.images as unknown[]).map(String).filter((img) => img.trim().length > 0)
        : undefined;
      if (name && hex) {
        colors.push({
          name,
          hex,
          ...(filter ? { filter } : {}),
          ...(images && images.length > 0 ? { images } : {}),
        });
      }
    }
  }

  return colors.length > 0 ? colors : undefined;
}

function resolveCustomProductAvailability(
  row: EcommerceProductRow,
  committedQty: number,
): { isCustomProduct: boolean; stockCount: number | null; inStock: boolean } {
  if (row.itemMasterId) {
    return { isCustomProduct: false, stockCount: null, inStock: true };
  }
  const specs =
    row.specifications && typeof row.specifications === 'object' && !Array.isArray(row.specifications)
      ? (row.specifications as Record<string, unknown>)
      : null;
  const isCustom = Boolean(
    specs && (specs.isCustomProduct === true || (specs.isCustomProduct !== false && specs.manualStock !== undefined)),
  );
  if (!isCustom || !specs) {
    return { isCustomProduct: false, stockCount: null, inStock: true };
  }
  const rawStock = specs.manualStock;
  const parsed = typeof rawStock === 'number' ? rawStock : typeof rawStock === 'string' ? parseInt(rawStock, 10) : 0;
  const onHand = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  const available = Math.max(0, onHand - Math.max(0, committedQty));
  return {
    isCustomProduct: true,
    stockCount: available,
    inStock: available > 0,
  };
}

function mapProductRow(
  row: EcommerceProductRow,
  isWholesale?: boolean,
  wholesaleTier?: 'tier1' | 'tier2',
  reviewAggregate?: { sum: number; count: number },
  customCommittedQty: number = 0,
  soldCount: number = 0,
): Product | null {
  const id = asFiniteNumber(row.publicId) ?? 1;
  const name = asNonEmptyString(row.name) || 'CarXen Accessory';
  const category = asCategory(row.categoryKey);
  const series = asSeries(row.series);
  const rawPrice = asFiniteNumber(row.price);
  const price = rawPrice !== null && rawPrice >= 0 ? rawPrice : 999;
  // Ratings come only from published reviews — never from stored marketing values.
  const reviewCount = reviewAggregate?.count ?? 0;
  const rating = reviewCount > 0
    ? Math.min(5, Math.max(0, reviewAggregate!.sum / reviewCount))
    : 0;
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
      : isSeatCategory(category) || isMatCategory(category);
  const tags = rawTags;
  const description = asNonEmptyString(row.description) ?? '';
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
    resolveCategoryLabel(category, asNonEmptyString(row.categoryLabel));
  const colors = asColors(row.colors);
  const tintOptions = asTintOptions(row.colors) || asTintOptions(row.tintOptions);
  const packageDimensions = (() => {
    if (row.specifications && typeof row.specifications === 'object') {
      const s = row.specifications as Record<string, unknown>;
      if (typeof s.packageDimensions === 'string' && s.packageDimensions.trim()) {
        return s.packageDimensions.trim();
      }
    }
    if (specifications) {
      const item = specifications.find(([k]) => /dimension/i.test(k));
      if (item && item[1]?.trim()) return item[1].trim();
    }
    return null;
  })();

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
    packageDimensions,
    slug,
    categoryId: row.categoryId ?? null,
    categoryLabel,
    ...(colors ? { colors } : {}),
    ...(tintOptions ? { tintOptions } : {}),
    fitment: row.fitment,
    installation: row.installation as any,
    isCombo: Boolean(row.isCombo),
    comboItems: Array.isArray(row.comboItems) ? (row.comboItems as any) : undefined,
    customFit: isCustomFit,
    discountLimitQty: isWholesale
      ? (() => {
          const specLimit = row.specifications && typeof (row.specifications as any).discountLimitQty === 'number'
            ? (row.specifications as any).discountLimitQty
            : null;
          const parsedLimit = asFiniteNumber((row as any).discountLimitQty ?? specLimit);
          return parsedLimit !== null && parsedLimit > 0 ? parsedLimit : null;
        })()
      : null,
    wholesalePrice: isWholesale
      ? (() => {
          const parsed = asFiniteNumber(row.wholesalePrice);
          return parsed !== null && parsed > 0 ? parsed : Math.round(price * 0.6);
        })()
      : undefined,
    b2bMoq: isWholesale
      ? (() => {
          const parsed = asFiniteNumber(row.b2bMoq);
          return parsed !== null && parsed > 0 ? parsed : 5;
        })()
      : undefined,
    wholesaleTier2Qty: isWholesale
      ? (() => {
          const s = row.specifications && typeof row.specifications === 'object' ? (row.specifications as any) : {};
          return asFiniteNumber(s.wholesaleTier2Qty);
        })()
      : undefined,
    wholesaleTier2Discount: isWholesale
      ? (() => {
          const s = row.specifications && typeof row.specifications === 'object' ? (row.specifications as any) : {};
          return asFiniteNumber(s.wholesaleTier2Discount);
        })()
      : undefined,
    wholesaleTier3Qty: isWholesale
      ? (() => {
          const s = row.specifications && typeof row.specifications === 'object' ? (row.specifications as any) : {};
          return asFiniteNumber(s.wholesaleTier3Qty);
        })()
      : undefined,
    wholesaleTier3Discount: isWholesale
      ? (() => {
          const s = row.specifications && typeof row.specifications === 'object' ? (row.specifications as any) : {};
          return asFiniteNumber(s.wholesaleTier3Discount);
        })()
      : undefined,
    taxBreakdown: isWholesale
      ? (() => {
          const parsed = asFiniteNumber(row.wholesalePrice);
          const wsPrice = parsed !== null && parsed > 0 ? parsed : Math.round(price * 0.6);
          const s = row.specifications && typeof row.specifications === 'object' ? (row.specifications as Record<string, unknown>) : {};
          const rawWsRate = asFiniteNumber(row.wholesaleTaxRate) ?? asFiniteNumber(s.wholesaleTaxRate);
          const rawRate = rawWsRate !== null && rawWsRate >= 0
            ? rawWsRate
            : (asFiniteNumber(row.taxRate) ?? asFiniteNumber(s.taxRate));
          const gstPercent = rawRate !== null && rawRate >= 0 ? rawRate : 18;
          const basePriceExGst = gstPercent > 0 ? Math.round(wsPrice / (1 + gstPercent / 100)) : wsPrice;
          const gstAmount = wsPrice - basePriceExGst;
          return {
            gstPercent,
            basePriceExGst,
            gstAmount,
          };
        })()
      : undefined,
    wholesaleTier: isWholesale ? (wholesaleTier || 'tier1') : undefined,
    publishedAt: row.publishedAt ?? null,
    ...(soldCount > 0 ? { soldCount } : {}),
    ...resolveCustomProductAvailability(row, customCommittedQty),
  };
}

export async function getStorefrontProducts(options?: {
  isWholesale?: boolean;
  wholesaleTier?: 'tier1' | 'tier2';
}): Promise<StorefrontProductsResponse> {
  const { storeSlug } = getCatalogConfig();
  const supabase = getSupabaseAdmin();

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

  const [{ data: productRows, error: productError }, { data: categoryRows }] = await Promise.all([
    supabase
      .from('ecommerce_products')
      .select(PRODUCT_COLUMNS)
      .eq('storeId', store.id)
      .eq('status', 'PUBLISHED')
      .not('publishedAt', 'is', null)
      .order('topRank', { ascending: true, nullsFirst: false })
      .order('updatedAt', { ascending: false }),
    supabase
      .from('ecommerce_categories')
      .select('id, slug, name, description, artKey, parentId, sortOrder, status')
      .eq('storeId', store.id)
      .eq('status', 'PUBLISHED')
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true }),
  ]);

  if (productError) {
    throw new CatalogDatabaseError('Unable to load ecommerce products.', productError);
  }

  const rows = (productRows || []) as unknown as EcommerceProductRow[];

  const reviewAggregates = new Map<string, { sum: number; count: number }>();
  const customCommittedByProduct = new Map<string, number>();
  const soldCountByProduct = new Map<string, number>();

  if (rows.length > 0) {
    // Reviews and order sales aggregates need the service key (RLS-protected).
    const adminSupabase = getSupabaseAdmin();
    const [{ data: reviewRows }, { data: validOrders }] = await Promise.all([
      adminSupabase
        .from('ecommerce_reviews')
        .select('productId, rating')
        .eq('storeId', store.id)
        .eq('status', 'PUBLISHED')
        .not('publishedAt', 'is', null),
      adminSupabase
        .from('ecommerce_orders')
        .select('id')
        .eq('storeId', store.id)
        .neq('status', 'CANCELLED')
        .neq('status', 'REFUNDED'),
    ]);

    for (const review of reviewRows || []) {
      const key = String(review.productId);
      const entry = reviewAggregates.get(key) || { sum: 0, count: 0 };
      entry.sum += Math.min(5, Math.max(1, Math.round(Number(review.rating) || 0)));
      entry.count += 1;
      reviewAggregates.set(key, entry);
    }

    const validOrderIds = (validOrders || []).map((o: any) => String(o.id)).filter(Boolean);
    if (validOrderIds.length > 0) {
      try {
        const { data: soldItems } = await adminSupabase
          .from('ecommerce_order_items')
          .select('productId, quantity')
          .in('orderId', validOrderIds);
        for (const item of soldItems || []) {
          if (!item.productId) continue;
          const pid = String(item.productId);
          const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
          if (qty > 0) {
            soldCountByProduct.set(pid, (soldCountByProduct.get(pid) ?? 0) + qty);
          }
        }
      } catch (salesErr) {
        console.warn('Could not load product sales totals:', salesErr);
      }
    }

    const customProductIds = rows
      .filter((row) => resolveCustomProductAvailability(row, 0).isCustomProduct)
      .map((row) => row.id);

    if (customProductIds.length > 0) {
      try {
        const [{ data: reservationRows }, { data: openOrders }] = await Promise.all([
          adminSupabase
            .from('ecommerce_inventory_reservations')
            .select('productId, orderItemId, quantity')
            .eq('storeId', store.id)
            .eq('status', 'ACTIVE')
            .in('productId', customProductIds),
          adminSupabase
            .from('ecommerce_orders')
            .select('id')
            .eq('storeId', store.id)
            .in('fulfillmentStatus', ['PENDING', 'CONFIRMED', 'PACKED'])
            .neq('status', 'CANCELLED')
            .neq('status', 'REFUNDED'),
        ]);

        const reservedByOrderItem = new Map<string, number>();
        for (const resRow of reservationRows || []) {
          const pid = String(resRow.productId);
          const qty = Math.max(0, Math.floor(Number(resRow.quantity) || 0));
          customCommittedByProduct.set(pid, (customCommittedByProduct.get(pid) ?? 0) + qty);
          if (resRow.orderItemId) {
            const oid = String(resRow.orderItemId);
            reservedByOrderItem.set(oid, (reservedByOrderItem.get(oid) ?? 0) + qty);
          }
        }

        const openOrderIds = (openOrders || []).map((o: any) => String(o.id)).filter(Boolean);
        if (openOrderIds.length > 0) {
          const { data: openOrderItems } = await adminSupabase
            .from('ecommerce_order_items')
            .select('id, productId, quantity')
            .in('orderId', openOrderIds)
            .in('productId', customProductIds);

          for (const itemRow of openOrderItems || []) {
            if (!itemRow.productId) continue;
            const pid = String(itemRow.productId);
            const qty = Math.max(0, Math.floor(Number(itemRow.quantity) || 0));
            const alreadyReserved = reservedByOrderItem.get(String(itemRow.id)) ?? 0;
            const unreservedOpen = Math.max(0, qty - alreadyReserved);
            if (unreservedOpen > 0) {
              customCommittedByProduct.set(pid, (customCommittedByProduct.get(pid) ?? 0) + unreservedOpen);
            }
          }
        }
      } catch (stockErr) {
        console.warn('Could not load custom stock commitments for storefront catalog:', stockErr);
      }
    }
  }

  const products = rows
    .map((row) =>
      mapProductRow(
        row,
        options?.isWholesale,
        options?.wholesaleTier,
        reviewAggregates.get(row.id),
        customCommittedByProduct.get(row.id) ?? 0,
        soldCountByProduct.get(row.id) ?? 0,
      ),
    )
    .filter((product): product is Product => product !== null);

  // Build live 2-level storefront category hierarchy (Master Groups -> Subcategories)
  const rawCats = (categoryRows || []) as Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    artKey: string | null;
    parentId: string | null;
    sortOrder: number | null;
    status: string;
  }>;

  const catIdSet = new Set(rawCats.map((c) => c.id));
  const directCountById = new Map<string, number>();

  for (const product of products) {
    if (product.categoryId && catIdSet.has(product.categoryId)) {
      directCountById.set(product.categoryId, (directCountById.get(product.categoryId) ?? 0) + 1);
      continue;
    }
    const pSlug = slugifyCategory(product.c || '');
    const pLabelSlug = slugifyCategory(product.categoryLabel || '');
    const matched = rawCats.find((c) => {
      const cSlug = slugifyCategory(c.slug || c.name);
      const cNameSlug = slugifyCategory(c.name);
      return (
        (pSlug && (cSlug === pSlug || cNameSlug === pSlug)) ||
        (pLabelSlug && (cSlug === pLabelSlug || cNameSlug === pLabelSlug))
      );
    });
    if (matched) {
      directCountById.set(matched.id, (directCountById.get(matched.id) ?? 0) + 1);
      product.categoryId = matched.id;
    }
  }

  const nodeMap = new Map<string, StorefrontCategory>();
  for (const c of rawCats) {
    const directCount = directCountById.get(c.id) ?? 0;
    nodeMap.set(c.id, {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      artKey: c.artKey,
      parentId: c.parentId && catIdSet.has(c.parentId) ? c.parentId : null,
      sortOrder: c.sortOrder ?? 0,
      productCount: directCount,
      totalProductCount: directCount,
      children: [],
    });
  }

  const rootCategories: StorefrontCategory[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      rootCategories.push(node);
    }
  }

  for (const root of rootCategories) {
    root.children.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    root.totalProductCount =
      root.productCount + root.children.reduce((sum, child) => sum + child.productCount, 0);
  }
  rootCategories.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  // Resolve up to 3 Main Navbar Master Groups from store.settings.mainNavCategoryIds
  // (defaults automatically to the first 3 published Master Groups when not customized).
  const storeSettingsObj =
    (store as any).settings && typeof (store as any).settings === 'object' && !Array.isArray((store as any).settings)
      ? ((store as any).settings as Record<string, unknown>)
      : {};
  const rootIdSet = new Set(rootCategories.map((r) => r.id));
  const rawMainIds = storeSettingsObj.mainNavCategoryIds;
  let mainNavCategoryIds: string[];
  if (Array.isArray(rawMainIds)) {
    const valid: string[] = [];
    for (const raw of rawMainIds) {
      if (typeof raw !== 'string') continue;
      const id = raw.trim();
      if (!id || !rootIdSet.has(id) || valid.includes(id)) continue;
      valid.push(id);
      if (valid.length >= MAX_MAIN_NAV_GROUPS) break;
    }
    mainNavCategoryIds =
      rawMainIds.length === 0 || valid.length > 0
        ? valid
        : rootCategories.slice(0, MAX_MAIN_NAV_GROUPS).map((r) => r.id);
  } else {
    mainNavCategoryIds = rootCategories.slice(0, MAX_MAIN_NAV_GROUPS).map((r) => r.id);
  }

  const mainNavSet = new Set(mainNavCategoryIds);
  for (const root of rootCategories) {
    root.isMainNav = mainNavSet.has(root.id);
  }

  const flatCategories = Array.from(nodeMap.values());

  return {
    store: { slug: store.slug, settings: storeSettingsObj },
    products,
    categories: rootCategories,
    flatCategories,
    mainNavCategoryIds,
  };
}
