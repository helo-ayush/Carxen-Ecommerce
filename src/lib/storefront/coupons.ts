'use client';

export type StorefrontCouponAudience =
  | 'All customers'
  | 'New customers'
  | 'Repeat buyers'
  | 'Dealer accounts'
  | 'Individual Wholesale Buyer';

export type StorefrontCoupon = {
  code: string;
  name: string;
  type: 'Percentage' | 'Fixed amount';
  value: number; // e.g. 15 for 15% or 1000 for ₹1000
  status: 'Active' | 'Draft' | 'Scheduled' | 'Expired';
  minimumOrder?: number;
  audience: StorefrontCouponAudience;
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
};

export type CouponValidationResult = {
  valid: boolean;
  coupon?: StorefrontCoupon;
  discountAmount: number;
  error?: string;
  message?: string;
};

/**
 * Seeded coupon rules, including general promotions and individual wholesale buyer offers.
 */
export const DEFAULT_STOREFRONT_COUPONS: StorefrontCoupon[] = [
  {
    code: 'CARXEN10',
    name: 'X-List Welcome Discount',
    type: 'Percentage',
    value: 10,
    status: 'Active',
    minimumOrder: 0,
    audience: 'All customers',
    description: '10% discount on entire storefront cart',
  },
  {
    code: 'APEX15',
    name: 'Apex Auto Spares VIP Wholesale Offer',
    type: 'Percentage',
    value: 15,
    status: 'Active',
    minimumOrder: 10000,
    audience: 'Individual Wholesale Buyer',
    targetWholesaleBuyerName: 'Apex Auto Spares',
    targetWholesaleBuyerEmail: 'apex@apexauto.in',
    description: 'Exclusive 15% bulk discount for Apex Auto Spares on orders above ₹10,000',
  },
  {
    code: 'SHARMA10',
    name: 'Sharma Wheels & Tyres Bulk Season Offer',
    type: 'Percentage',
    value: 10,
    status: 'Active',
    minimumOrder: 15000,
    audience: 'Individual Wholesale Buyer',
    targetWholesaleBuyerName: 'Sharma Wheels & Tyres',
    targetWholesaleBuyerEmail: 'sharma.wheels@example.test',
    description: 'Exclusive 10% wholesale discount for Sharma Wheels & Tyres on orders above ₹15,000',
  },
  {
    code: 'DEALER1000',
    name: 'Dealer Stocking Credit',
    type: 'Fixed amount',
    value: 1000,
    status: 'Active',
    minimumOrder: 25000,
    audience: 'Dealer accounts',
    description: 'Flat ₹1,000 credit on dealer bulk restocking orders of ₹25,000 or more',
  },
  {
    code: 'DIWALI20',
    name: 'Diwali Garage Refresh',
    type: 'Percentage',
    value: 20,
    status: 'Active',
    minimumOrder: 7500,
    audience: 'All customers',
    description: 'Festival discount of 20% on orders above ₹7,500',
  },
];

const STORAGE_KEY = 'cx_custom_coupons';

/**
 * Retrieve all coupons, combining defaults with any locally saved promotions.
 */
export function getAllCoupons(): StorefrontCoupon[] {
  if (typeof window === 'undefined') {
    return DEFAULT_STOREFRONT_COUPONS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STOREFRONT_COUPONS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge by code, letting custom ones override
      const map = new Map<string, StorefrontCoupon>();
      DEFAULT_STOREFRONT_COUPONS.forEach((c) => map.set(c.code.toUpperCase(), c));
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
  buyerContext?: WholesaleBuyerContext
): CouponValidationResult {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, discountAmount: 0, error: 'Please enter a coupon code.' };
  }

  const all = getAllCoupons();
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

  // Check audience eligibility
  if (coupon.audience === 'Dealer accounts') {
    if (!buyerContext?.isWholesaleApproved) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Coupon "${cleanCode}" is reserved exclusively for approved Wholesale & Dealer accounts.`,
      };
    }
  }

  if (coupon.audience === 'Individual Wholesale Buyer') {
    if (!buyerContext?.isWholesaleApproved) {
      return {
        valid: false,
        discountAmount: 0,
        error: `Coupon "${cleanCode}" is an exclusive offer reserved for approved wholesale business partners.`,
      };
    }

    const matches = isWholesaleBuyerMatch(coupon, buyerContext);
    if (!matches) {
      const targetLabel = coupon.targetWholesaleBuyerName || coupon.targetWholesaleBuyerEmail || 'a specific wholesale buyer';
      return {
        valid: false,
        discountAmount: 0,
        error: `Coupon "${cleanCode}" is private to ${targetLabel}. It cannot be applied to this account (${buyerContext.businessName || buyerContext.email || 'guest'}).`,
      };
    }
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (coupon.type === 'Percentage') {
    discountAmount = Math.round((cartTotal * coupon.value) / 100);
  } else {
    discountAmount = Math.min(coupon.value, cartTotal);
  }

  const discountLabel = coupon.type === 'Percentage' ? `${coupon.value}% off` : `₹${coupon.value.toLocaleString('en-IN')} off`;

  return {
    valid: true,
    coupon,
    discountAmount,
    message: `${coupon.name} applied: ${discountLabel}`,
  };
}

/**
 * Get all coupons applicable to the currently signed-in buyer (including individual wholesale coupons).
 */
export function getAvailableCouponsForBuyer(buyerContext?: WholesaleBuyerContext): StorefrontCoupon[] {
  const all = getAllCoupons();

  return all.filter((coupon) => {
    if (coupon.status !== 'Active') return false;

    // Public coupons
    if (coupon.audience === 'All customers' || coupon.audience === 'New customers' || coupon.audience === 'Repeat buyers') {
      return true;
    }

    // Dealer account coupons
    if (coupon.audience === 'Dealer accounts') {
      return Boolean(buyerContext?.isWholesaleApproved);
    }

    // Individual wholesale buyer coupons
    if (coupon.audience === 'Individual Wholesale Buyer') {
      return Boolean(buyerContext?.isWholesaleApproved) && isWholesaleBuyerMatch(coupon, buyerContext);
    }

    return false;
  });
}
