import assert from 'node:assert/strict';
import test from 'node:test';
// Node's native strip-types runner needs explicit TypeScript extensions here.
// @ts-expect-error The test runner resolves the source TypeScript module directly.
import { ORDER_ACCESS_COOKIE_PATH, isOrderAccessToken } from '../src/lib/storefront/order-access.ts';
// @ts-expect-error The test runner resolves the source TypeScript module directly.
import { loadStorefrontOrder } from '../src/lib/storefront/order-client.ts';

test('order access tokens are exactly 256-bit lowercase hex values', () => {
  assert.equal(isOrderAccessToken('a'.repeat(64)), true);
  assert.equal(isOrderAccessToken('A'.repeat(64)), false);
  assert.equal(isOrderAccessToken('a'.repeat(63)), false);
  assert.equal(isOrderAccessToken('a'.repeat(64) + '0'), false);
  assert.equal(isOrderAccessToken('g'.repeat(64)), false);
});

test('order client relies on the HttpOnly same-origin cookie and never puts a token in the URL', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedInit: RequestInit | undefined;

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedInit = init;
    return new Response(
      JSON.stringify({
        order: {
          orderNumber: 'CX-20261013-ABC12345',
          currency: 'INR',
          status: 'PENDING',
          subtotal: 1000,
          discountAmount: 0,
          shippingAmount: 99,
          totalAmount: 1099,
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'PENDING',
          couponCode: null,
          customer: { name: 'Guest' },
          shippingAddress: { city: 'Pune' },
          placedAt: null,
          items: [
            {
              productId: 1,
              name: 'Seat cover',
              quantity: 1,
              unitPrice: 1000,
              lineSubtotal: 1000,
            },
          ],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const order = await loadStorefrontOrder('CX-20261013-ABC12345');
    assert.equal(order?.orderNumber, 'CX-20261013-ABC12345');
    assert.equal(requestedUrl, '/api/storefront/orders/CX-20261013-ABC12345');
    assert.equal(requestedUrl.includes('access'), false);
    assert.equal(requestedInit?.credentials, 'same-origin');
    assert.deepEqual(requestedInit?.headers, { Accept: 'application/json' });
    assert.equal(ORDER_ACCESS_COOKIE_PATH, '/api/storefront/orders');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
