
export type StorefrontCouponAudience =
  | 'All customers'
  | 'Verified customers (3+ orders)'
  | 'Wholesale buyers'
  | 'Individual Wholesale Buyer'
  | 'Dealer accounts';

export type StorefrontCoupon = {
  code: string;
  name: string;
  type: 'Percentage' | 'Fixed amount';
  value: number; // e.g. 15 for 15% or 1000 for ₹1000
  status: 'Active' | 'Draft' | 'Scheduled' | 'Expired';
  minimumOrder?: number;
  audience: StorefrontCouponAudience | string;
  targetWholesaleBuyerId?: string | null;
  targetWholesaleBuyerName?: string | null;
  targetWholesaleBuyerEmail?: string | null;
  description?: string;
};

export type WholesaleBuyerContext = {
  isWholesaleApproved?: boolean;
  businessName?: string | null;
  tradeName?: string | null;
  email?: string | null;
  userId?: string | null;
  orderCount?: number;
  isVerifiedBuyer?: boolean;
};

export type CouponValidationResult = {
  valid: boolean;
  coupon?: StorefrontCoupon;
  discountAmount: number;
  error?: string;
  message?: string;
};

/**
 * Empty default coupons array so no hardcoded or mock coupons appear by default.
 * All coupons are fetched dynamically from the database configured by the owner in Veda.
 */
export const DEFAULT_STOREFRONT_COUPONS: StorefrontCoupon[] = [];

const STORAGE_KEY = 'cx_custom_coupons';

/**
 * Retrieve all coupons, combining dynamically loaded or locally cached promotions.
 */
export function getAllCoupons(customCoupons?: StorefrontCoupon[]): StorefrontCoupon[] {
  if (customCoupons && customCoupons.length > 0) {
    return customCoupons;
  }

  if (typeof window === 'undefined') {
    return DEFAULT_STOREFRONT_COUPONS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STOREFRONT_COUPONS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const map = new Map<string, StorefrontCoupon>();
      parsed.forEach((c: StorefrontCoupon) => {
        if (c && c.code) map.set(c.code.toUpperCase(), c);
      });
      return Array.from(map.values());
    }
  } catch {
    // ignore parse error
  }

  return DEFAULT_STOREFRONT_COUPONS;
}

/**
 * Save or register a new coupon into storefront local storage (e.g., synced from Veda).
 */
export function saveCustomCoupon(coupon: StorefrontCoupon): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getAllCoupons();
    const map = new Map<string, StorefrontCoupon>();
    existing.forEach((c) => map.set(c.code.toUpperCase(), c));
    map.set(coupon.code.toUpperCase(), coupon);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(map.values())));
  } catch {
    // ignore storage error
  }
}

/**
 * Normalize and compare strings safely.
 */
function normalize(str?: string | null): string {
  return (str || '').trim().toLowerCase();
}

/**
 * Check if a buyer matches the target wholesale buyer identity.
 */
export function isWholesaleBuyerMatch(
  coupon: StorefrontCoupon,
  buyerContext?: WholesaleBuyerContext
): boolean {
  if (!buyerContext) return false;

  const targetEmail = normalize(coupon.targetWholesaleBuyerEmail);
  const targetName = normalize(coupon.targetWholesaleBuyerName);
  const buyerEmail = normalize(buyerContext.email);
  const buyerBiz = normalize(buyerContext.businessName);
  const buyerTrade = normalize(buyerContext.tradeName);

  // 1. Email exact match
  if (targetEmail && buyerEmail && targetEmail === buyerEmail) {
    return true;
  }

  // 2. Business / Trade name match
  if (targetName) {
    if (buyerBiz && (buyerBiz === targetName || buyerBiz.includes(targetName) || targetName.includes(buyerBiz))) {
      return true;
    }
    if (buyerTrade && (buyerTrade === targetName || buyerTrade.includes(targetName) || targetName.includes(buyerTrade))) {
      return true;
    }
  }

  // 3. User ID match
  if (coupon.targetWholesaleBuyerId && buyerContext.userId && coupon.targetWholesaleBuyerId === buyerContext.userId) {
    return true;
  }

  return false;
}

/**
 * Validate a coupon code against cart total and buyer context.
 */
export function validateCoupon(
  code: string,
  cartTotal: number,
  buyerContext?: WholesaleBuyerContext,
  customCoupons?: StorefrontCoupon[]
): CouponValidationResult {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, discountAmount: 0, error: 'Please enter a coupon code.' };
  }

  const all = getAllCoupons(customCoupons);
  const coupon = all.find((c) => c.code.toUpperCase() === cleanCode);

  if (!coupon) {
    return {
      valid: false,
      discountAmount: 0,
      error: `Coupon "${cleanCode}" is invalid or expired.`,
    };
  }

  if (coupon.status !== 'Active') {
    return {
      valid: false,
      discountAmount: 0,
      error: `Coupon "${cleanCode}" is currently ${coupon.status.toLowerCase()}.`,
    };
  }

  // Check minimum order amount
  if (coupon.minimumOrder && cartTotal < coupon.minimumOrder) {
    return {
      valid: false,
      discountAmount: 0,
      error: `Minimum order of ₹${coupon.minimumOrder.toLocaleString('en-IN')} required for coupon ${cleanCode}. Current subtotal is ₹${cartTotal.toLocaleString('en-IN')}.`,
    };
  }

  // Check audience eligibility:
  // 1. Verified customers (3+ orders)
  if (
    coupon.audience === 'Verified customers (3+ orders)' ||
    coupon.audience === 'Repeat buyers'
  ) {
    if (!buyerContext?.userId && !buyerContext?.email) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Coupon "${cleanCode}" is reserved exclusively for verified customers with 3 or more previous orders. Please sign in to verify your account.`,
      };
    }

    const orderCount = typeof buyerContext?.orderCount === 'number' ? buyerContext.orderCount : 0;
    const isVerified = Boolean(buyerContext?.isVerifiedBuyer && orderCount >= 3);

    if (!isVerified || orderCount < 3) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Coupon "${cleanCode}" is reserved exclusively for verified customers with 3 or more previous orders. This account currently has ${orderCount} completed order${orderCount === 1 ? '' : 's'}.`,
      };
    }
  }

  // 2. Wholesale buyers (including individual B2B buyer assignment)
  if (
    coupon.audience === 'Wholesale buyers' ||
    coupon.audience === 'Individual Wholesale Buyer' ||
    coupon.audience === 'Dealer accounts'
  ) {
    if (!buyerContext?.isWholesaleApproved) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Coupon "${cleanCode}" is reserved exclusively for approved Wholesale business accounts.`,
      };
    }

    // Check if coupon is assigned to an individual wholesale buyer
    const isTargeted = Boolean(
      coupon.targetWholesaleBuyerEmail ||
      coupon.targetWholesaleBuyerName ||
      coupon.targetWholesaleBuyerId
    );

    if (isTargeted) {
      const matches = isWholesaleBuyerMatch(coupon, buyerContext);
      if (!matches) {
        const targetLabel =
          coupon.targetWholesaleBuyerName || coupon.targetWholesaleBuyerEmail || 'an assigned business partner';
        return {
          valid: false,
          discountAmount: 0,
          error: `Coupon "${cleanCode}" is exclusive to ${targetLabel}.`,
        };
      }
    }
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (coupon.type === 'Percentage') {
    discountAmount = Math.round((cartTotal * coupon.value) / 100);
  } else {
    discountAmount = Math.min(coupon.value, cartTotal);
  }

  const discountLabel =
    coupon.type === 'Percentage' ? `${coupon.value}% off` : `₹${coupon.value.toLocaleString('en-IN')} off`;

  return {
    valid: true,
    coupon,
    discountAmount,
    message: `${coupon.name} applied: ${discountLabel}`,
  };
}

/**
 * Get all coupons applicable to the currently signed-in buyer.
 */
export function getAvailableCouponsForBuyer(
  buyerContext?: WholesaleBuyerContext,
  customCoupons?: StorefrontCoupon[]
): StorefrontCoupon[] {
  const all = getAllCoupons(customCoupons);

  return all.filter((coupon) => {
    if (coupon.status !== 'Active') return false;

    // Public coupons
    if (
      coupon.audience === 'All customers' ||
      coupon.audience === 'New customers' ||
      coupon.audience === 'Repeat buyers'
    ) {
      return true;
    }

    // Verified customers (3+ orders)
    if (
      coupon.audience === 'Verified customers (3+ orders)' ||
      coupon.audience === 'Repeat buyers'
    ) {
      const orderCount = typeof buyerContext?.orderCount === 'number' ? buyerContext.orderCount : 0;
      return Boolean(
        (buyerContext?.userId || buyerContext?.email) &&
        buyerContext?.isVerifiedBuyer &&
        orderCount >= 3
      );
    }

    // Wholesale buyers
    if (
      coupon.audience === 'Wholesale buyers' ||
      coupon.audience === 'Individual Wholesale Buyer' ||
      coupon.audience === 'Dealer accounts'
    ) {
      if (!buyerContext?.isWholesaleApproved) return false;
      const isTargeted = Boolean(
        coupon.targetWholesaleBuyerEmail ||
        coupon.targetWholesaleBuyerName ||
        coupon.targetWholesaleBuyerId
      );
      if (isTargeted) {
        return isWholesaleBuyerMatch(coupon, buyerContext);
      }
      return true;
    }

    return false;
  });
}

/**
 * Get specifically assigned coupons by the owner for this buyer (e.g. exclusive individual B2B coupon,
 * or verified customer loyalty coupon).
 */
export function getAssignedCouponForBuyer(
  buyerContext?: WholesaleBuyerContext,
  customCoupons?: StorefrontCoupon[]
): StorefrontCoupon | null {
  const all = getAllCoupons(customCoupons);
  if (!buyerContext) return null;

  // 1. Check for individual B2B buyer coupon assigned to this wholesale partner
  if (buyerContext.isWholesaleApproved) {
    const individualMatch = all.find(
      (c) =>
        c.status === 'Active' &&
        (c.audience === 'Wholesale buyers' || c.audience === 'Individual Wholesale Buyer') &&
        Boolean(c.targetWholesaleBuyerEmail || c.targetWholesaleBuyerName || c.targetWholesaleBuyerId) &&
        isWholesaleBuyerMatch(c, buyerContext)
    );
    if (individualMatch) return individualMatch;

    // Next, wholesale wide coupon
    const wholesaleGeneral = all.find(
      (c) =>
        c.status === 'Active' &&
        (c.audience === 'Wholesale buyers' || c.audience === 'Dealer accounts') &&
        !c.targetWholesaleBuyerEmail &&
        !c.targetWholesaleBuyerName
    );
    if (wholesaleGeneral) return wholesaleGeneral;
  }

  // 2. Check for verified customer (3+ orders) loyalty coupon
  const orderCount = typeof buyerContext.orderCount === 'number' ? buyerContext.orderCount : 0;
  const isVerified = Boolean(
    (buyerContext.userId || buyerContext.email) &&
    buyerContext.isVerifiedBuyer &&
    orderCount >= 3
  );
  if (isVerified) {
    const verifiedCoupon = all.find(
      (c) =>
        c.status === 'Active' &&
        (c.audience === 'Verified customers (3+ orders)' || c.audience === 'Repeat buyers')
    );
    if (verifiedCoupon) return verifiedCoupon;
  }

  return null;
}
