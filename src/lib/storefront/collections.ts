import type { Product } from '@/data/products';
import { isCustomFit } from '@/data/products';

export type StorefrontCollection = 'all' | 'new' | 'bestsellers';

const NEW_ARRIVAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const NEW_TAG_PATTERN = /^(new(\s+arrivals?)?|just\s+in|latest(\s+drop)?)$/i;
const BESTSELLER_TAG_PATTERN = /^(best\s*sellers?|top\s*rated|most\s*popular|featured)$/i;

export function parsePublishedMs(publishedAt?: string | null): number {
  if (!publishedAt) return 0;
  const ms = Date.parse(publishedAt);
  return Number.isFinite(ms) ? ms : 0;
}

export function hasMatchingTag(product: Product, pattern: RegExp): boolean {
  if (!Array.isArray(product.tags)) return false;
  return product.tags.some((t) => pattern.test(t.trim()));
}

/**
 * True when a product qualifies as a New Arrival:
 * - Explicitly flagged `isNew` in VEDA ERP
 * - Tagged "New" / "New Arrival" / "Just In"
 * - Or published within the last 30 days
 */
export function isProductNewArrival(product: Product, nowMs: number = Date.now()): boolean {
  if (product.nw === 1) return true;
  if (hasMatchingTag(product, NEW_TAG_PATTERN)) return true;
  const pubMs = parsePublishedMs(product.publishedAt);
  return pubMs > 0 && nowMs - pubMs <= NEW_ARRIVAL_WINDOW_MS;
}

/**
 * Sorts products strictly newest-first:
 * 1. Latest publishedAt timestamp descending
 * 2. Explicit `isNew` flag
 * 3. Highest product publicId descending
 */
export function compareNewArrivals(a: Product, b: Product): number {
  const aMs = parsePublishedMs(a.publishedAt);
  const bMs = parsePublishedMs(b.publishedAt);
  if (bMs !== aMs) return bMs - aMs;
  const aFlag = (a.nw ?? 0) + (hasMatchingTag(a, NEW_TAG_PATTERN) ? 1 : 0);
  const bFlag = (b.nw ?? 0) + (hasMatchingTag(b, NEW_TAG_PATTERN) ? 1 : 0);
  if (bFlag !== aFlag) return bFlag - aFlag;
  return b.id - a.id;
}

/**
 * Real Best-Seller score driven by live store telemetry + VEDA ERP merchandising:
 * - Confirmed non-cancelled order units (`soldCount`)
 * - VEDA ERP `topRank` (#1, #2, #3...)
 * - "Best Seller" / "Top Rated" tag
 * - VEDA ERP `isSpotlight` flag
 * - Verified customer reviews & star ratings
 */
export function computeBestSellerScore(product: Product): number {
  let score = 0;
  if (product.soldCount && product.soldCount > 0) {
    score += product.soldCount * 100;
  }
  if (product.top !== undefined && product.top !== null) {
    score += Math.max(25, 200 - product.top * 15);
  }
  if (hasMatchingTag(product, BESTSELLER_TAG_PATTERN)) {
    score += 90;
  }
  if (product.spot === 1) {
    score += 75;
  }
  if (product.rv > 0) {
    score += product.rv * Math.max(1, product.r || 0) * 18;
  }
  return score;
}

/**
 * Curated fallback score used ONLY when a brand-new store has zero live orders,
 * zero reviews, and zero explicit spotlight/topRank flags yet.
 */
function computeFlagshipFallbackScore(product: Product): number {
  let score = 0;
  if (isCustomFit(product)) score += 45;
  if (product.s && product.s.trim().length > 0) score += 20;
  if (product.o && product.o > product.p) {
    score += Math.round(((product.o - product.p) / product.o) * 40);
  }
  if (product.p >= 2500) score += 15;
  return score;
}

/**
 * Returns the IDs (in ranked order) of products belonging to the Best Sellers collection.
 * Uses real sales/reviews/VEDA flags first; falls back gracefully to curated flagship picks
 * when a store is brand-new so Best Sellers is always distinct and meaningful.
 */
export function resolveBestSellerRankMap(allProducts: Product[]): Map<number, number> {
  const rankMap = new Map<number, number>();
  if (allProducts.length === 0) return rankMap;

  const withSignal = allProducts
    .map((p) => ({ p, score: computeBestSellerScore(p) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.p.rv - a.p.rv || b.p.r - a.p.r || a.p.id - b.p.id);

  if (withSignal.length > 0) {
    withSignal.forEach((entry, idx) => rankMap.set(entry.p.id, idx + 1));
    return rankMap;
  }

  // Brand-new store fallback: pick top flagship subset (never an identical unfiltered dump)
  const cap =
    allProducts.length <= 2
      ? allProducts.length
      : Math.max(2, Math.min(8, Math.ceil(allProducts.length * 0.65)));

  const curated = allProducts
    .map((p) => ({ p, score: computeFlagshipFallbackScore(p) }))
    .sort((a, b) => b.score - a.score || b.p.p - a.p.p || a.p.id - b.p.id)
    .slice(0, cap);

  curated.forEach((entry, idx) => rankMap.set(entry.p.id, idx + 1));
  return rankMap;
}

/**
 * Returns the set of product IDs that belong to the New Arrivals collection.
 */
export function resolveNewArrivalIdSet(allProducts: Product[], nowMs: number = Date.now()): Set<number> {
  const qualified = allProducts.filter((p) => isProductNewArrival(p, nowMs));
  if (qualified.length > 0) {
    return new Set(qualified.map((p) => p.id));
  }
  // Fallback if all catalog items are older than 30 days & none flagged isNew:
  // show the latest published drops
  const latestCap = Math.max(1, Math.min(8, Math.ceil(allProducts.length * 0.5)));
  const latest = [...allProducts].sort(compareNewArrivals).slice(0, latestCap);
  return new Set(latest.map((p) => p.id));
}
