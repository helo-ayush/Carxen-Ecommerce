import { createClient } from '@supabase/supabase-js';
import { isOrderAccessToken } from './order-access';
import type {
  StorefrontCheckoutRequest,
  StorefrontCustomerSnapshot,
  StorefrontOrderItemSnapshot,
  StorefrontOrderSnapshot,
  StorefrontOrderSummary,
  StorefrontShippingAddressSnapshot,
  StorefrontShippingSpeed,
  StorefrontPaymentMethod,
} from './order-types';

export const MAX_CHECKOUT_BODY_BYTES = 32 * 1024;

const MAX_CHECKOUT_ITEMS = 50;
const MAX_ORDER_ITEMS = 100;
const MAX_AMOUNT = 1_000_000_000_000;

type JsonObject = Record<string, unknown>;

export class StorefrontOrderError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly logCode: string,
  ) {
    super(message);
    this.name = 'StorefrontOrderError';
  }
}

export interface StorefrontOrderPlacement {
  order: StorefrontOrderSummary;
  orderAccessToken: string;
}

function isJsonObject(value: unknown): value is JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function firstValue(object: JsonObject, keys: string[]): unknown {
  for (const key of keys) {
    if (object[key] !== undefined) return object[key];
  }
  return undefined;
}

function readRequiredText(
  object: JsonObject,
  keys: string[],
  label: string,
  minLength: number,
  maxLength: number,
): string {
  const value = firstValue(object, keys);
  if (typeof value !== 'string') {
    throw new StorefrontOrderError(`${label} is required.`, 400, 'invalid_payload');
  }

  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new StorefrontOrderError(`${label} is invalid.`, 400, 'invalid_payload');
  }

  return normalized;
}

function readOptionalText(
  object: JsonObject,
  keys: string[],
  label: string,
  maxLength: number,
): string | undefined {
  const value = firstValue(object, keys);
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new StorefrontOrderError(`${label} is invalid.`, 400, 'invalid_payload');
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new StorefrontOrderError(`${label} is invalid.`, 400, 'invalid_payload');
  }

  return normalized || undefined;
}

function readInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new StorefrontOrderError(`${label} is invalid.`, 400, 'invalid_payload');
  }

  return value;
}

function readCustomer(value: unknown): StorefrontCustomerSnapshot {
  if (!isJsonObject(value)) {
    throw new StorefrontOrderError('Customer details are required.', 400, 'invalid_payload');
  }

  const name = readRequiredText(value, ['name', 'fullName'], 'Customer name', 1, 100);
  const phone = readOptionalText(value, ['phone', 'phoneNumber'], 'Customer phone', 32);
  const email = readOptionalText(value, ['email'], 'Customer email', 254);

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    throw new StorefrontOrderError('Customer email is invalid.', 400, 'invalid_payload');
  }

  return {
    name,
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
  };
}

function readShippingAddress(
  value: unknown,
  customer: StorefrontCustomerSnapshot,
): StorefrontShippingAddressSnapshot {
  if (!isJsonObject(value)) {
    throw new StorefrontOrderError('A delivery address is required.', 400, 'invalid_payload');
  }

  const name =
    readOptionalText(value, ['name', 'fullName'], 'Delivery name', 100) || customer.name;
  const phone =
    readOptionalText(value, ['phone', 'phoneNumber'], 'Delivery phone', 32) || customer.phone;
  const addressLine1 = readRequiredText(
    value,
    ['addressLine1', 'line1', 'address'],
    'Address line 1',
    3,
    180,
  );
  const addressLine2 = readOptionalText(
    value,
    ['addressLine2', 'line2'],
    'Address line 2',
    180,
  );
  const city = readRequiredText(value, ['city', 'town'], 'City', 1, 80);
  const state = readOptionalText(value, ['state', 'region'], 'State', 80);
  const postalCode = readRequiredText(
    value,
    ['postalCode', 'pincode', 'pinCode'],
    'Postal code',
    6,
    12,
  );
  const country = readOptionalText(value, ['country'], 'Country', 64) || 'IN';

  if (!/^\d{6}$/.test(postalCode)) {
    throw new StorefrontOrderError('Postal code is invalid.', 400, 'invalid_payload');
  }

  return {
    ...(name ? { name } : {}),
    ...(phone ? { phone } : {}),
    addressLine1,
    ...(addressLine2 ? { addressLine2 } : {}),
    city,
    ...(state ? { state } : {}),
    postalCode,
    country,
  };
}

function readItems(value: unknown): StorefrontCheckoutRequest['items'] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CHECKOUT_ITEMS) {
    throw new StorefrontOrderError('Your cart is empty or too large to check out.', 400, 'invalid_payload');
  }

  const seenProductIds = new Set<number>();

  return value.map((item, index) => {
    if (!isJsonObject(item)) {
      throw new StorefrontOrderError(`Cart item ${index + 1} is invalid.`, 400, 'invalid_payload');
    }

    const productId = readInteger(item.productId, `Cart item ${index + 1} product`, 1, 2147483647);
    const quantity = readInteger(item.quantity, `Cart item ${index + 1} quantity`, 1, 99);

    if (seenProductIds.has(productId)) {
      throw new StorefrontOrderError('The cart contains a duplicate product.', 400, 'invalid_payload');
    }
    seenProductIds.add(productId);

    return { productId, quantity };
  });
}

function readShippingSpeed(value: unknown): StorefrontShippingSpeed {
  if (typeof value !== 'string') {
    throw new StorefrontOrderError('Shipping speed is required.', 400, 'invalid_payload');
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'std' || normalized === 'standard') return 'std';
  if (normalized === 'exp' || normalized === 'express') return 'exp';

  throw new StorefrontOrderError('Shipping speed is invalid.', 400, 'invalid_payload');
}

function readPaymentMethod(value: unknown): StorefrontPaymentMethod {
  if (typeof value !== 'string') {
    throw new StorefrontOrderError('Payment method is required.', 400, 'invalid_payload');
  }

  const methods: StorefrontPaymentMethod[] = [
    'UPI',
    'Card',
    'Net banking',
    'Cash on delivery',
  ];
  const normalized = value.trim().toLowerCase();
  const method = methods.find((candidate) => candidate.toLowerCase() === normalized);
  if (!method) {
    throw new StorefrontOrderError('Payment method is invalid.', 400, 'invalid_payload');
  }

  return method;
}

function readCouponCode(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new StorefrontOrderError('Coupon code is invalid.', 400, 'invalid_payload');
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.length > 64 || !/^[A-Z0-9_-]+$/.test(normalized)) {
    throw new StorefrontOrderError('Coupon code is invalid.', 400, 'invalid_payload');
  }

  return normalized;
}

export function parseCheckoutPayload(value: unknown): StorefrontCheckoutRequest {
  if (!isJsonObject(value)) {
    throw new StorefrontOrderError('Checkout payload must be a JSON object.', 400, 'invalid_payload');
  }

  const customer = readCustomer(value.customer);

  return {
    customer,
    shippingAddress: readShippingAddress(value.shippingAddress, customer),
    items: readItems(value.items),
    shippingSpeed: readShippingSpeed(value.shippingSpeed),
    paymentMethod: readPaymentMethod(value.paymentMethod),
    couponCode: readCouponCode(value.couponCode),
  };
}

function getOrderConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const storeSlug = process.env.NEXT_PUBLIC_ECOMMERCE_STORE_SLUG?.trim();

  const missing = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    !storeSlug && 'NEXT_PUBLIC_ECOMMERCE_STORE_SLUG',
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new StorefrontOrderError(
      `Order backend is not configured. Set ${missing.join(', ')}.`,
      503,
      'configuration',
    );
  }

  return {
    supabaseUrl: supabaseUrl!,
    // Orders intentionally use the public anon/publishable key. A service-role key is never
    // read by this storefront route or sent to the browser.
    supabaseAnonKey: supabaseAnonKey!,
    storeSlug: storeSlug!,
  };
}

function getSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getOrderConfig();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function throwRpcError(error: { code?: string | null }, operation: 'place' | 'get'): never {
  if (error.code === 'P0001') {
    throw new StorefrontOrderError(
      operation === 'place'
        ? 'The order could not be placed. Check your cart, coupon, and checkout details, then try again.'
        : 'The order could not be loaded right now.',
      operation === 'place' ? 400 : 502,
      'rpc_validation',
    );
  }

  throw new StorefrontOrderError(
    operation === 'place'
      ? 'The order service could not save this order right now.'
      : 'The order service could not load this order right now.',
    502,
    'rpc_failure',
  );
}

function asBoundedString(value: unknown, maximum: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximum ? normalized : null;
}

function asAmount(value: unknown): number | null {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) return null;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function asSafeInteger(value: unknown, maximum: number): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isSafeInteger(number) && number > 0 && number <= maximum ? number : null;
}

function asStatus(value: unknown, fallback: string): string {
  return asBoundedString(value, 40) || fallback;
}

function asOrderNumber(value: unknown): string | null {
  const orderNumber = asBoundedString(value, 80);
  return orderNumber && /^[A-Za-z0-9_-]+$/.test(orderNumber) ? orderNumber : null;
}

function asCouponCode(value: unknown): string | null {
  const couponCode = asBoundedString(value, 64);
  return couponCode || null;
}

function toOrderSummary(value: unknown): StorefrontOrderSummary | null {
  if (!isJsonObject(value)) return null;

  const orderNumber = asOrderNumber(value.orderNumber);
  const currency = asBoundedString(value.currency, 16);
  const subtotal = asAmount(value.subtotal);
  const discountAmount = asAmount(value.discountAmount);
  const shippingAmount = asAmount(value.shippingAmount);
  const totalAmount = asAmount(value.totalAmount);

  if (
    !orderNumber ||
    !currency ||
    subtotal === null ||
    discountAmount === null ||
    shippingAmount === null ||
    totalAmount === null
  ) {
    return null;
  }

  return {
    orderNumber,
    currency,
    status: asStatus(value.status, 'PENDING'),
    subtotal,
    discountAmount,
    shippingAmount,
    totalAmount,
    paymentStatus: asStatus(value.paymentStatus, 'PENDING'),
    fulfillmentStatus: asStatus(value.fulfillmentStatus, 'PENDING'),
    couponCode: asCouponCode(value.couponCode),
  };
}

function toSafeCustomer(value: unknown): StorefrontCustomerSnapshot {
  if (!isJsonObject(value)) return {};

  const name = asBoundedString(value.name ?? value.fullName, 100);
  const phone = asBoundedString(value.phone ?? value.phoneNumber, 32);
  const email = asBoundedString(value.email, 254);

  return {
    ...(name ? { name } : {}),
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
  };
}

function toSafeAddress(value: unknown): StorefrontShippingAddressSnapshot {
  if (!isJsonObject(value)) return {};

  const name = asBoundedString(value.name ?? value.fullName, 100);
  const phone = asBoundedString(value.phone ?? value.phoneNumber, 32);
  const addressLine1 = asBoundedString(value.addressLine1 ?? value.line1 ?? value.address, 180);
  const addressLine2 = asBoundedString(value.addressLine2 ?? value.line2, 180);
  const city = asBoundedString(value.city ?? value.town, 80);
  const state = asBoundedString(value.state ?? value.region, 80);
  const postalCode = asBoundedString(value.postalCode ?? value.pincode ?? value.pinCode, 12);
  const country = asBoundedString(value.country, 64);

  return {
    ...(name ? { name } : {}),
    ...(phone ? { phone } : {}),
    ...(addressLine1 ? { addressLine1 } : {}),
    ...(addressLine2 ? { addressLine2 } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(postalCode ? { postalCode } : {}),
    ...(country ? { country } : {}),
  };
}

function toSafeItems(value: unknown): StorefrontOrderItemSnapshot[] | null {
  if (!Array.isArray(value) || value.length > MAX_ORDER_ITEMS) return null;

  const items: StorefrontOrderItemSnapshot[] = [];
  for (const item of value) {
    if (!isJsonObject(item)) return null;

    const productId = asSafeInteger(item.productId, 2147483647);
    const name = asBoundedString(item.name, 200);
    const quantity = asSafeInteger(item.quantity, 99);
    const unitPrice = asAmount(item.unitPrice);
    const lineSubtotal = asAmount(item.lineSubtotal);
    const productSlug = asBoundedString(item.productSlug, 160);

    if (
      productId === null ||
      !name ||
      quantity === null ||
      unitPrice === null ||
      lineSubtotal === null
    ) {
      return null;
    }

    items.push({
      productId,
      ...(productSlug ? { productSlug } : {}),
      name,
      quantity,
      unitPrice,
      lineSubtotal,
    });
  }

  return items;
}

function asTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 80 || !Number.isFinite(Date.parse(value))) {
    return null;
  }
  return value;
}

function toOrderSnapshot(value: unknown): StorefrontOrderSnapshot | null {
  if (!isJsonObject(value)) return null;

  const summary = toOrderSummary(value);
  const items = toSafeItems(value.items);
  if (!summary || !items) return null;

  return {
    ...summary,
    status: asStatus(value.status, summary.status),
    customer: toSafeCustomer(value.customer),
    shippingAddress: toSafeAddress(value.shippingAddress),
    placedAt: asTimestamp(value.placedAt),
    items,
  };
}

export function validateOrderNumber(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value.trim())
  ) {
    throw new StorefrontOrderError('Order number is invalid.', 400, 'invalid_order_number');
  }

  return value.trim();
}

export async function placeStorefrontOrder(
  payload: StorefrontCheckoutRequest,
): Promise<StorefrontOrderPlacement> {
  const { storeSlug } = getOrderConfig();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('place_ecommerce_order', {
    p_store_slug: storeSlug,
    p_customer: payload.customer,
    p_shipping_address: payload.shippingAddress,
    p_items: payload.items,
    p_shipping_speed: payload.shippingSpeed,
    p_payment_method: payload.paymentMethod,
    p_coupon_code: payload.couponCode,
  });

  if (error) throwRpcError(error, 'place');

  const summary = toOrderSummary(data);
  const orderAccessToken = isJsonObject(data) ? data.orderAccessToken : undefined;
  if (!summary || !isOrderAccessToken(orderAccessToken)) {
    throw new StorefrontOrderError(
      'The order service returned an invalid order access response.',
      502,
      'invalid_rpc_response',
    );
  }

  return { order: summary, orderAccessToken };
}

export async function getStorefrontOrder(
  orderNumber: string,
  orderAccessToken: string,
): Promise<StorefrontOrderSnapshot | null> {
  if (!isOrderAccessToken(orderAccessToken)) {
    throw new StorefrontOrderError('Order not found.', 404, 'order_access_denied');
  }

  const { storeSlug } = getOrderConfig();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_ecommerce_order', {
    p_store_slug: storeSlug,
    p_order_number: orderNumber,
    p_access_token: orderAccessToken,
  });

  if (error) throwRpcError(error, 'get');
  if (data === null || data === undefined) return null;

  const snapshot = toOrderSnapshot(data);
  if (!snapshot) {
    throw new StorefrontOrderError(
      'The order service returned an invalid order snapshot.',
      502,
      'invalid_rpc_response',
    );
  }

  return snapshot;
}
