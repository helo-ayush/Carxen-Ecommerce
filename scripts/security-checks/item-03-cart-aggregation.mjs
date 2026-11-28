import assert from 'node:assert/strict';
import { aggregateAndValidateCartItems } from '../../src/lib/storefront/cart-items.ts';
import { calculateItemPriceWithOfferLimit } from '../../src/lib/storefront/wholesale-pricing.ts';

// 1. Five lines of { productId: 42, quantity: 2 } aggregate to quantity 10
const agg = aggregateAndValidateCartItems([
  { productId: 42, quantity: 2 },
  { productId: 42, quantity: 2 },
  { productId: 42, quantity: 2 },
  { productId: 42, quantity: 2 },
  { productId: 42, quantity: 2 },
]);
assert.deepEqual(agg, [{ productId: 42, quantity: 10 }]);

// 2. discountLimitQty = 2 on aggregated qty 10 only discounts 2 units
const mockProduct = {
  id: 42,
  o: 1000,
  p: 500,
  discountLimitQty: 2,
};
const priceRes = calculateItemPriceWithOfferLimit(mockProduct, agg[0].quantity, false);
assert.equal(priceRes.totalPrice, 2 * 500 + 8 * 1000, 'Aggregated qty 10 must only get offerPrice on 2 units');

// 3. Reject negative, zero, fractional, NaN, and oversized quantities
for (const badQty of [-1, 0, 1.5, NaN, 'abc', null, 10001]) {
  assert.throws(
    () => aggregateAndValidateCartItems([{ productId: 42, quantity: badQty }]),
    /quantity/i,
    `Expected rejection for quantity=${String(badQty)}`
  );
}

console.log('PASS: Item 3 duplicate productId aggregation and quantity validation passed');
