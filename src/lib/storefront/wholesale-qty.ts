import type { Product } from '@/data/products';

export type WholesaleQtyRules = {
  moq: number;
  packSize: number;
  enforcePack: boolean;
  step: number;
  minQty: number;
};

/**
 * Computes MOQ, carton pack-size, step increment, and minimum orderable quantity
 * for a B2B wholesale product.
 *
 * When `enforceCartonMultiples` is enabled and `unitsPerMasterCarton > 1`,
 * quantities strictly move in multiples of `unitsPerMasterCarton` (e.g. 12, 24, 36).
 */
export function getWholesaleQtyRules(product: Pick<Product, 'b2bMoq' | 'unitsPerMasterCarton' | 'enforceCartonMultiples'>): WholesaleQtyRules {
  const moq = Math.max(1, Math.floor(product.b2bMoq || 5));
  const packSize = Math.max(1, Math.floor(product.unitsPerMasterCarton || 1));
  const enforcePack = Boolean(product.enforceCartonMultiples && packSize > 1);
  const step = enforcePack ? packSize : 1;
  const minQty = enforcePack ? Math.ceil(moq / packSize) * packSize : moq;

  return { moq, packSize, enforcePack, step, minQty };
}

/**
 * Snaps any arbitrary or typed quantity to a valid wholesale quantity
 * respecting `minQty`, `step` (pack-size multiples if enforced), and optional `maxQty` (stock).
 */
export function snapWholesaleQty(
  product: Pick<Product, 'b2bMoq' | 'unitsPerMasterCarton' | 'enforceCartonMultiples'>,
  rawQty: number,
  maxQty?: number | null,
): number {
  const { minQty, step, enforcePack } = getWholesaleQtyRules(product);
  const clean = Number.isFinite(rawQty) ? Math.floor(rawQty) : minQty;

  let next = Math.max(minQty, clean);
  if (enforcePack && step > 1) {
    next = Math.max(minQty, Math.round(next / step) * step);
  }

  if (typeof maxQty === 'number' && Number.isFinite(maxQty)) {
    const cappedMax = Math.max(0, Math.floor(maxQty));
    if (enforcePack && step > 1) {
      const maxMultiple = Math.floor(cappedMax / step) * step;
      next = Math.min(next, maxMultiple > 0 ? maxMultiple : cappedMax);
    } else {
      next = Math.min(next, cappedMax);
    }
  }

  return next;
}

/**
 * Steps quantity up (+1 or +packSize) or down (-1 or -packSize) cleanly without abnormal jumps.
 */
export function stepWholesaleQty(
  product: Pick<Product, 'b2bMoq' | 'unitsPerMasterCarton' | 'enforceCartonMultiples'>,
  currentQty: number,
  direction: 1 | -1,
  maxQty?: number | null,
): number {
  const { minQty, step, enforcePack } = getWholesaleQtyRules(product);
  const base = Number.isFinite(currentQty) ? Math.floor(currentQty) : minQty;

  let candidate: number;
  if (enforcePack && step > 1) {
    // Align to nearest multiple first, then step by exactly 1 pack
    const aligned = Math.round(base / step) * step;
    candidate = aligned + direction * step;
  } else {
    candidate = base + direction;
  }

  return snapWholesaleQty(product, candidate, maxQty);
}
