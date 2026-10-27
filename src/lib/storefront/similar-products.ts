import type { Product } from '@/data/products';
import { fitStatus, readFitment } from '@/lib/storefront/fitment';

type Vehicle = { b?: string | null; m?: string | null; y?: string | null; f?: string | null };

export interface SimilarProductOptions {
  vehicle?: Vehicle | null;
  excludeIds?: Array<number | string>;
  limit?: number;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizedTags(product: Product): string[] {
  return (product.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

function similarityScore(candidate: Product, current: Product, vehicle: Vehicle | null | undefined): number {
  let score = 0;

  if (candidate.c === current.c) score += 40;

  // A true vehicle match beats a universal item: compatible is weaker than purpose-built.
  const fit = fitStatus(candidate, vehicle);
  if (fit === 'match') score += 25;
  else if (fit === 'universal') score += 8;

  const candidateFitment = readFitment(candidate);
  const currentFitment = readFitment(current);
  if (candidateFitment.kind === 'vehicle' && currentFitment.kind === 'vehicle') {
    const brand = normalize(candidateFitment.brand);
    const model = normalize(candidateFitment.model);
    if (brand && brand === normalize(currentFitment.brand)) score += 8;
    if (model && model === normalize(currentFitment.model)) score += 7;
  }

  const currentTags = normalizedTags(current);
  const candidateTags = normalizedTags(candidate);
  if (currentTags.length > 0 && candidateTags.length > 0) {
    const currentSet = new Set(currentTags);
    const overlap = candidateTags.filter((tag) => currentSet.has(tag)).length;
    const union = new Set([...currentTags, ...candidateTags]).size;
    if (overlap > 0 && union > 0) score += (overlap / union) * 15;
  }

  if (candidate.s && current.s && candidate.s === current.s) score += 5;

  const maxPrice = Math.max(candidate.p, current.p);
  if (maxPrice > 0) score += 10 * (1 - Math.abs(candidate.p - current.p) / maxPrice);

  if (candidate.rv > 0) score += (Math.min(5, Math.max(0, candidate.r)) / 5) * 4;

  return score;
}

/** Deterministic, local ranking — no network, explainable weights. */
export function rankSimilarProducts(
  current: Product,
  catalog: Product[],
  options: SimilarProductOptions = {},
): Product[] {
  const { vehicle = null, excludeIds = [], limit = 4 } = options;
  const excluded = new Set<string>([String(current.id), ...excludeIds.map(String)]);

  return catalog
    .filter((candidate) => !excluded.has(String(candidate.id)))
    .map((candidate) => ({ candidate, score: similarityScore(candidate, current, vehicle) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.candidate.rv !== a.candidate.rv) return b.candidate.rv - a.candidate.rv;
      const priceDelta =
        Math.abs(a.candidate.p - current.p) - Math.abs(b.candidate.p - current.p);
      if (priceDelta !== 0) return priceDelta;
      return a.candidate.id - b.candidate.id;
    })
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.candidate);
}
