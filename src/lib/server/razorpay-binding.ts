import crypto from 'crypto';

export const RAZORPAY_BINDING_COOKIE_NAME = 'cx_rzp_bind';
const BINDING_TTL_SECONDS = 30 * 60; // 30 minutes

function getBindingSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET;
  if (secret && secret.trim().length > 0) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: No signing secret configured for Razorpay order binding.');
  }
  return 'carxen-dev-only-session-secret-do-not-use-in-prod';
}

export function computeCartHash(params: {
  items: Array<{ productId: number; quantity: number; unitPrice: number }>;
  shippingSpeed?: string;
  couponCode?: string | null;
}): string {
  const normalizedItems = [...params.items]
    .map((it) => ({
      productId: Number(it.productId),
      quantity: Number(it.quantity),
      unitPrice: Math.round(Number(it.unitPrice) * 100),
    }))
    .sort((a, b) => a.productId - b.productId);

  const canonical = JSON.stringify({
    items: normalizedItems,
    shippingSpeed: params.shippingSpeed || 'std',
    couponCode: (params.couponCode || '').trim().toUpperCase(),
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function computeShippingAddressHash(addr: Record<string, any> | null | undefined): string {
  if (!addr || typeof addr !== 'object') return '';
  const canonical = JSON.stringify({
    line1: String(addr.addressLine1 || addr.line1 || '').trim().toLowerCase(),
    city: String(addr.city || '').trim().toLowerCase(),
    postalCode: String(addr.postalCode || '').trim(),
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export interface RazorpayOrderBinding {
  razorpayOrderId: string;
  cartHash: string;
  amountInPaise: number;
  currency: string;
  customerId: string | null;
  shippingAddressHash: string;
  couponCode: string | null;
  iat: number;
  exp: number;
}

export function signRazorpayOrderBinding(
  data: Omit<RazorpayOrderBinding, 'iat' | 'exp'>
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: RazorpayOrderBinding = {
    ...data,
    iat: now,
    exp: now + BINDING_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getBindingSecret()).update(encoded).digest('base64url');
  return `rxb.${encoded}.${sig}`;
}

export function verifyRazorpayOrderBinding(
  token: string | undefined | null,
  expected: {
    razorpayOrderId: string;
    cartHash: string;
    amountInPaise: number;
    currency: string;
    customerId: string | null;
    shippingAddressHash: string;
    couponCode: string | null;
  }
): { ok: true } | { ok: false; reason: string } {
  if (!token || typeof token !== 'string' || !token.startsWith('rxb.')) {
    return { ok: false, reason: 'Missing or invalid checkout payment binding.' };
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { ok: false, reason: 'Malformed checkout payment binding.' };
  }
  const [, encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getBindingSecret()).update(encoded).digest('base64url');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'Checkout payment binding signature mismatch.' };
  }

  let parsed: RazorpayOrderBinding;
  try {
    parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'Unparseable checkout payment binding.' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof parsed.exp !== 'number' || parsed.exp < now) {
    return { ok: false, reason: 'Checkout payment session expired. Please initiate payment again.' };
  }
  if (parsed.razorpayOrderId !== expected.razorpayOrderId) {
    return { ok: false, reason: 'Razorpay order ID does not match the initialized checkout session.' };
  }
  if (parsed.cartHash !== expected.cartHash) {
    return { ok: false, reason: 'Cart contents changed after payment initialization.' };
  }
  if (parsed.amountInPaise !== expected.amountInPaise || parsed.currency !== expected.currency) {
    return { ok: false, reason: 'Payment amount or currency mismatch.' };
  }
  if ((parsed.customerId || null) !== (expected.customerId || null)) {
    return { ok: false, reason: 'Payment session belongs to a different customer.' };
  }
  if (parsed.shippingAddressHash && parsed.shippingAddressHash !== expected.shippingAddressHash) {
    return { ok: false, reason: 'Shipping address changed after payment initialization.' };
  }
  if ((parsed.couponCode || null) !== (expected.couponCode || null)) {
    return { ok: false, reason: 'Coupon code changed after payment initialization.' };
  }
  return { ok: true };
}
