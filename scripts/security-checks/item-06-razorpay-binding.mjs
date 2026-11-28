import assert from 'node:assert/strict';
import {
  computeCartHash,
  computeShippingAddressHash,
  signRazorpayOrderBinding,
  verifyRazorpayOrderBinding,
} from '../../src/lib/server/razorpay-binding.ts';

const baseCart = computeCartHash({
  items: [{ productId: 1, quantity: 2, unitPrice: 500 }],
  shippingSpeed: 'std',
  couponCode: 'SAVE10',
});
const diffCartSameTotal = computeCartHash({
  items: [{ productId: 2, quantity: 1, unitPrice: 1000 }],
  shippingSpeed: 'std',
  couponCode: 'SAVE10',
});
const addrHash = computeShippingAddressHash({
  addressLine1: '12 MG Road',
  city: 'Pune',
  postalCode: '411001',
});

const token = signRazorpayOrderBinding({
  razorpayOrderId: 'order_test_1',
  cartHash: baseCart,
  amountInPaise: 100000,
  currency: 'INR',
  customerId: 'cust_A',
  shippingAddressHash: addrHash,
  couponCode: 'SAVE10',
});

// 1. Valid binding passes
assert.equal(
  verifyRazorpayOrderBinding(token, {
    razorpayOrderId: 'order_test_1',
    cartHash: baseCart,
    amountInPaise: 100000,
    currency: 'INR',
    customerId: 'cust_A',
    shippingAddressHash: addrHash,
    couponCode: 'SAVE10',
  }).ok,
  true
);

// 2. Different cart with same total is rejected
assert.equal(
  verifyRazorpayOrderBinding(token, {
    razorpayOrderId: 'order_test_1',
    cartHash: diffCartSameTotal,
    amountInPaise: 100000,
    currency: 'INR',
    customerId: 'cust_A',
    shippingAddressHash: addrHash,
    couponCode: 'SAVE10',
  }).ok,
  false
);

// 3. Different customer is rejected
assert.equal(
  verifyRazorpayOrderBinding(token, {
    razorpayOrderId: 'order_test_1',
    cartHash: baseCart,
    amountInPaise: 100000,
    currency: 'INR',
    customerId: 'cust_B',
    shippingAddressHash: addrHash,
    couponCode: 'SAVE10',
  }).ok,
  false
);

console.log('PASS: Item 6 Razorpay order binding checks passed');
