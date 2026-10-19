import type { Product } from '@/data/products';
import type { StorefrontProductsResponse } from './types';

export class CatalogRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CatalogRequestError';
    this.status = status;
  }
}

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;

  const product = value as Partial<Product>;
  return (
    typeof product.id === 'number' &&
    Number.isFinite(product.id) &&
    typeof product.n === 'string' &&
    typeof product.c === 'string' &&
    typeof product.s === 'string' &&
    typeof product.p === 'number' &&
    Number.isFinite(product.p) &&
    typeof product.r === 'number' &&
    typeof product.rv === 'number' &&
    typeof product.a === 'string' &&
    typeof product.d === 'string' &&
    Array.isArray(product.sp)
  );
}

function isStorefrontProductsResponse(value: unknown): value is StorefrontProductsResponse {
  if (!value || typeof value !== 'object') return false;

  const response = value as Partial<StorefrontProductsResponse>;
  return (
    !!response.store &&
    typeof response.store === 'object' &&
    typeof response.store.slug === 'string' &&
    Array.isArray(response.products) &&
    response.products.every(isProduct)
  );
}

export async function loadCatalogProducts(
  signal?: AbortSignal,
  customHeaders?: Record<string, string>,
): Promise<StorefrontProductsResponse> {
  let response: Response;

  try {
    response = await fetch('/api/storefront/products', {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(customHeaders || {}) },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw new CatalogRequestError('Unable to reach the storefront catalog service.', 0);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'The storefront catalog could not be loaded.';
    throw new CatalogRequestError(message, response.status);
  }

  if (!isStorefrontProductsResponse(payload)) {
    throw new CatalogRequestError('The storefront catalog returned an invalid response.', response.status);
  }

  return payload;
}
