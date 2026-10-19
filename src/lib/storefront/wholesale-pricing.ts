export interface WholesaleTierInfo {
  minQty: number;
  maxQty?: number;
  label: string;
  unitPrice: number;
  lotTotal: number;
  discountPercent: number; // Extra discount on top of base wholesale price
  marginPercent: number;
  badge?: string;
}

export function getWholesaleBasePrice(product: {
  p: number;
  o?: number;
  wholesalePrice?: number | string | null;
}): number {
  if (typeof product.wholesalePrice === 'number' && product.wholesalePrice > 0) {
    return product.wholesalePrice;
  }
  const parsed = Number(product.wholesalePrice);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return Math.round(product.p * 0.6);
}

export function getWholesaleTiers(product: {
  p: number;
  o?: number;
  wholesalePrice?: number | string | null;
  b2bMoq?: number;
}): WholesaleTierInfo[] {
  const basePrice = getWholesaleBasePrice(product);
  const retailPrice = product.o || product.p;
  const moq = Math.max(1, product.b2bMoq || 5);

  const t1Min = moq;
  const t2Min = Math.max(t1Min * 3, 15);
  const t3Min = Math.max(t1Min * 10, 50);

  const t1Price = basePrice;
  const t2Price = Math.round(basePrice * 0.92); // 8% volume break
  const t3Price = Math.round(basePrice * 0.85); // 15% volume break

  return [
    {
      minQty: t1Min,
      maxQty: t2Min - 1,
      label: `MOQ Pack (${t1Min}+ units)`,
      unitPrice: t1Price,
      lotTotal: t1Price * t1Min,
      discountPercent: 0,
      marginPercent: Math.round(((retailPrice - t1Price) / retailPrice) * 100),
      badge: 'Starter Batch',
    },
    {
      minQty: t2Min,
      maxQty: t3Min - 1,
      label: `Workshop Batch (${t2Min}+ units)`,
      unitPrice: t2Price,
      lotTotal: t2Price * t2Min,
      discountPercent: 8,
      marginPercent: Math.round(((retailPrice - t2Price) / retailPrice) * 100),
      badge: 'Most Popular · Save 8%',
    },
    {
      minQty: t3Min,
      label: `Master Carton (${t3Min}+ units)`,
      unitPrice: t3Price,
      lotTotal: t3Price * t3Min,
      discountPercent: 15,
      marginPercent: Math.round(((retailPrice - t3Price) / retailPrice) * 100),
      badge: 'Max Profit · Save 15%',
    },
  ];
}

export function getEffectiveWholesaleUnitPrice(
  product: {
    p: number;
    o?: number;
    wholesalePrice?: number | string | null;
    b2bMoq?: number;
  },
  quantity: number
): number {
  const tiers = getWholesaleTiers(product);
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (quantity >= tiers[i].minQty) {
      return tiers[i].unitPrice;
    }
  }
  return tiers[0].unitPrice;
}

export function getActiveWholesaleTier(
  product: {
    p: number;
    o?: number;
    wholesalePrice?: number | string | null;
    b2bMoq?: number;
  },
  quantity: number
): WholesaleTierInfo {
  const tiers = getWholesaleTiers(product);
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (quantity >= tiers[i].minQty) {
      return tiers[i];
    }
  }
  return tiers[0];
}

export interface PriceWithLimitResult {
  totalPrice: number;
  discountedQty: number;
  regularQty: number;
  effectiveUnitPrice: number;
  regularUnitPrice: number;
  discountUnitPrice: number;
  discountedUnitPrice: number;
  isLimitApplied: boolean;
  isLimitExceeded: boolean;
  limitQty: number | null;
}

export function calculateItemPriceWithOfferLimit(
  product: {
    p: number;
    o?: number;
    wholesalePrice?: number | string | null;
    b2bMoq?: number;
    discountLimitQty?: number | null;
  },
  quantity: number,
  isWholesale: boolean = false
): PriceWithLimitResult {
  const regularUnitPrice = isWholesale
    ? product.p
    : (product.o && product.o > product.p ? product.o : product.p);

  const limit = typeof product.discountLimitQty === 'number' && product.discountLimitQty > 0
    ? product.discountLimitQty
    : null;

  // Determine the discounted unit price for the order
  const discountUnitPrice = isWholesale
    ? getEffectiveWholesaleUnitPrice(product, Math.min(quantity, limit ?? quantity))
    : product.p;

  // If no limit is configured or order quantity is within limit
  if (!limit || quantity <= limit) {
    const unitPrice = isWholesale ? getEffectiveWholesaleUnitPrice(product, quantity) : product.p;
    return {
      totalPrice: unitPrice * quantity,
      discountedQty: quantity,
      regularQty: 0,
      effectiveUnitPrice: unitPrice,
      regularUnitPrice,
      discountUnitPrice: unitPrice,
      discountedUnitPrice: unitPrice,
      isLimitApplied: false,
      isLimitExceeded: false,
      limitQty: limit,
    };
  }

  // When quantity exceeds limit:
  const discountedQty = limit;
  const regularQty = quantity - limit;
  // Units above limit are billed at standard regular price
  const totalPrice = (discountedQty * discountUnitPrice) + (regularQty * regularUnitPrice);
  const effectiveUnitPrice = Math.round(totalPrice / quantity);

  return {
    totalPrice,
    discountedQty,
    regularQty,
    effectiveUnitPrice,
    regularUnitPrice,
    discountUnitPrice,
    discountedUnitPrice: discountUnitPrice,
    isLimitApplied: true,
    isLimitExceeded: true,
    limitQty: limit,
  };
}
