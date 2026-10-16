import { supabase } from '@/lib/supabase/client';
import type {
  StorefrontCheckoutRequest,
  StorefrontOrderItemSnapshot,
  StorefrontOrderSnapshot,
  StorefrontOrderSummary,
} from './order-types';

export class StorefrontOrderRequestError extends Error {
  public readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.status = status;
    this.name = 'StorefrontOrderRequestError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isOrderSummary(value: unknown): value is StorefrontOrderSummary {
  if (!isRecord(value)) return false;

  return (
    typeof value.orderNumber === 'string' &&
    typeof value.currency === 'string' &&
    typeof value.status === 'string' &&
    isAmount(value.subtotal) &&
    isAmount(value.discountAmount) &&
    isAmount(value.shippingAmount) &&
    isAmount(value.totalAmount) &&
    typeof value.paymentStatus === 'string' &&
    typeof value.fulfillmentStatus === 'string' &&
    (value.couponCode === null || typeof value.couponCode === 'string')
  );
}

function isOrderItem(value: unknown): value is StorefrontOrderItemSnapshot {
  if (!isRecord(value)) return false;

  return (
    typeof value.productId === 'number' &&
    Number.isSafeInteger(value.productId) &&
    value.productId > 0 &&
    (value.productSlug === undefined || typeof value.productSlug === 'string') &&
    typeof value.name === 'string' &&
    typeof value.quantity === 'number' &&
    Number.isSafeInteger(value.quantity) &&
    value.quantity > 0 &&
    isAmount(value.unitPrice) &&
    isAmount(value.lineSubtotal)
  );
}

function isOrderSnapshot(value: unknown): value is StorefrontOrderSnapshot {
  if (!isOrderSummary(value) || !isRecord(value)) return false;

  return (
    isRecord(value.customer) &&
    isRecord(value.shippingAddress) &&
    (value.placedAt === null || typeof value.placedAt === 'string') &&
    Array.isArray(value.items) &&
    value.items.every(isOrderItem)
  );
}

async function readPayload(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function readErrorMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload) && typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }
  return fallback;
}

export async function createStorefrontOrder(
  checkout: StorefrontCheckoutRequest,
): Promise<StorefrontOrderSummary> {
  let response: Response;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`;
    }
  } catch {}

  try {
    if (typeof window !== 'undefined') {
      const demoUser = localStorage.getItem('cx_demo_user');
      if (demoUser) {
        const parsed = JSON.parse(demoUser);
        if (parsed.id) headers['x-demo-user-id'] = parsed.id;
        if (parsed.email) headers['x-demo-user-email'] = parsed.email;
      }
    }
  } catch {}

  try {
    response = await fetch('/api/storefront/orders', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(checkout),
    });
  } catch {
    throw new StorefrontOrderRequestError('Unable to reach the order service.', 0);
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    throw new StorefrontOrderRequestError(
      readErrorMessage(payload, 'The order could not be placed.'),
      response.status,
    );
  }

  if (!isRecord(payload) || !isOrderSummary(payload.order)) {
    throw new StorefrontOrderRequestError('The order service returned an invalid response.', response.status);
  }

  return payload.order;
}

export async function loadStorefrontOrder(
  orderNumber: string,
  signal?: AbortSignal,
): Promise<StorefrontOrderSnapshot | null> {
  let response: Response;

  try {
    response = await fetch(`/api/storefront/orders/${encodeURIComponent(orderNumber)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new StorefrontOrderRequestError('Unable to reach the order service.', 0);
  }

  const payload = await readPayload(response);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new StorefrontOrderRequestError(
      readErrorMessage(payload, 'The order could not be loaded.'),
      response.status,
    );
  }

  if (!isRecord(payload) || !isOrderSnapshot(payload.order)) {
    throw new StorefrontOrderRequestError('The order service returned an invalid response.', response.status);
  }

  return payload.order;
}
