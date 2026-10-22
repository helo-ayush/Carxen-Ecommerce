import { getStorefrontProducts } from '@/lib/storefront/catalog';
import { calculateItemPriceWithOfferLimit } from '@/lib/storefront/wholesale-pricing';
import { validateCoupon, type WholesaleBuyerContext } from '@/lib/storefront/coupons';

export interface CartItemInput {
  productId: number;
  quantity: number;
}

export interface AuthoritativeTotalsParams {
  items: CartItemInput[];
  shippingSpeed: 'std' | 'exp';
  couponCode?: string | null;
  buyerContext?: WholesaleBuyerContext;
}

export interface AuthoritativeTotalsResult {
  subtotal: number;
  couponDiscount: number;
  shippingCost: number;
  finalTotal: number;
  amountInPaise: number;
  appliedCoupon: string | null;
  couponName: string | null;
  lineItems: Array<{
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    lineSubtotal: number;
    category?: string;
    image?: string;
  }>;
}

/**
 * Calculates authoritative order totals on the server.
 * Guarantees that neither prices, coupon discounts, nor delivery fees
 * can be tampered with by client-side modifications.
 */
export async function calculateAuthoritativeCartTotals(
  params: AuthoritativeTotalsParams
): Promise<AuthoritativeTotalsResult> {
  if (!params.items || !Array.isArray(params.items) || params.items.length === 0) {
    throw new Error('Your cart is empty.');
  }

  // Fetch verified product catalog
  const catalog = await getStorefrontProducts();
  const products = catalog.products;

  let subtotal = 0;
  const lineItems: AuthoritativeTotalsResult['lineItems'] = [];

  for (const item of params.items) {
    const qty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
    const product = products.find((p) => p.id === Number(item.productId));

    if (!product) {
      throw new Error(`Product #${item.productId} was not found in the verified catalog.`);
    }

    const priceCalc = calculateItemPriceWithOfferLimit(
      product,
      qty,
      Boolean(params.buyerContext?.isWholesaleApproved)
    );

    subtotal += priceCalc.totalPrice;

    lineItems.push({
      productId: product.id,
      name: product.n,
      quantity: qty,
      unitPrice: priceCalc.discountedUnitPrice,
      lineSubtotal: priceCalc.totalPrice,
      category: product.c,
      image: product.image || (product.images && product.images[0]),
    });
  }

  // Authoritative Coupon Validation
  let couponDiscount = 0;
  let appliedCoupon: string | null = null;
  let couponName: string | null = null;

  if (params.couponCode && params.couponCode.trim()) {
    const code = params.couponCode.trim().toUpperCase();
    const couponValidation = validateCoupon(code, subtotal, params.buyerContext);

    if (!couponValidation.valid) {
      throw new Error(couponValidation.error || `Coupon "${code}" is invalid or expired.`);
    }

    couponDiscount = couponValidation.discountAmount;
    appliedCoupon = code;
    couponName = couponValidation.coupon?.name || code;
  }

  // Authoritative Shipping Calculation
  const isEligibleForFreeStandard = subtotal - couponDiscount >= 1499;
  const shippingCost =
    params.shippingSpeed === 'exp'
      ? 199
      : isEligibleForFreeStandard
      ? 0
      : 99;

  const finalTotal = Math.max(0, subtotal - couponDiscount + shippingCost);
  const amountInPaise = Math.round(finalTotal * 100);

  return {
    subtotal,
    couponDiscount,
    shippingCost,
    finalTotal,
    amountInPaise,
    appliedCoupon,
    couponName,
    lineItems,
  };
}