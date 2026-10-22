import { getStorefrontProducts } from '@/lib/storefront/catalog';
import { calculateItemPriceWithOfferLimit } from '@/lib/storefront/wholesale-pricing';
import { validateCoupon, type WholesaleBuyerContext, type StorefrontCoupon } from '@/lib/storefront/coupons';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

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

  // Fetch active store campaigns from DB if any
  let dynamicCoupons: StorefrontCoupon[] = [];
  try {
    const supabase = getSupabaseAdmin();
    const storeSlug = process.env.NEXT_PUBLIC_ECOMMERCE_STORE_SLUG?.trim() || 'carxen';
    const { data: store } = await supabase
      .from('ecommerce_stores')
      .select('id')
      .eq('slug', storeSlug)
      .maybeSingle();

    if (store) {
      const { data: campaigns } = await supabase
        .from('ecommerce_campaigns')
        .select('*')
        .eq('storeId', store.id)
        .eq('status', 'ACTIVE');

      if (campaigns) {
        const now = new Date();
        const validCampaigns = campaigns.filter((camp: any) => {
          if (camp.startsAt && new Date(camp.startsAt) > now) return false;
          if (camp.endsAt && new Date(camp.endsAt) < now) return false;
          if (camp.usageLimit && camp.usageCount && Number(camp.usageCount) >= Number(camp.usageLimit)) return false;
          return true;
        });

        dynamicCoupons = validCampaigns.map((camp: any) => {
          const rules = camp.audienceRules && typeof camp.audienceRules === 'object' ? camp.audienceRules : {};
          return {
            code: camp.code,
            name: camp.name,
            type: camp.discountType === 'PERCENTAGE' || camp.discountType === 'Percentage' ? 'Percentage' : 'Fixed amount',
            value: Number(camp.discountValue) || 0,
            status: 'Active',
            minimumOrder: Number(camp.minimumOrderAmount) || 0,
            audience: camp.audience || 'All customers',
            targetWholesaleBuyerId: rules.targetWholesaleBuyerId || null,
            targetWholesaleBuyerName: rules.targetWholesaleBuyerName || null,
            targetWholesaleBuyerEmail: rules.targetWholesaleBuyerEmail || null,
            description: rules.description || camp.name,
          };
        });
      }
    }
  } catch {
    // Non-fatal, predefined static coupons will validate
  }

  // Authoritative Coupon Validation
  let couponDiscount = 0;
  let appliedCoupon: string | null = null;
  let couponName: string | null = null;

  if (params.couponCode && params.couponCode.trim()) {
    const code = params.couponCode.trim().toUpperCase();
    const couponValidation = validateCoupon(code, subtotal, params.buyerContext, dynamicCoupons);

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