import assert from 'node:assert/strict';
import { resolveIdempotentPaymentOrder, rollbackFailedPaidOrder } from '../../src/lib/server/payment-idempotency.ts';

// Mock supabaseAdmin to verify idempotency and full rollback behavior
const state = {
  payments: [{ id: 'pay_1', orderId: 'ord_1', providerPaymentId: 'rzp_pay_1', metadata: { razorpay_order_id: 'rzp_ord_1' } }],
  orders: [{ id: 'ord_1', orderNumber: 'CX-1', storeId: 's1', customerId: 'cust_A', status: 'CONFIRMED', paymentStatus: 'PAID' }],
  campaigns: [{ id: 'camp_1', storeId: 's1', code: 'SAVE10', usageCount: 3 }],
  deleted: [],
};

const mockDb = {
  from(table) {
    return {
      select() { return this; },
      eq(col, val) {
        this._eq = { ...(this._eq || {}), [col]: val };
        return this;
      },
      async maybeSingle() {
        if (table === 'ecommerce_payments') {
          return { data: state.payments.find((p) => p.providerPaymentId === this._eq.providerPaymentId) || null };
        }
        if (table === 'ecommerce_orders') {
          return { data: state.orders.find((o) => o.id === this._eq.id) || null };
        }
        if (table === 'ecommerce_campaigns') {
          return { data: state.campaigns.find((c) => c.code === this._eq.code) || null };
        }
        return { data: null };
      },
      delete() {
        return {
          eq: async (col, val) => {
            state.deleted.push(`${table}:${col}=${val}`);
            return { error: null };
          },
        };
      },
      update(patch) {
        return {
          eq: async (col, val) => {
            if (table === 'ecommerce_campaigns') {
              const c = state.campaigns.find((x) => x.id === val);
              if (c) c.usageCount = patch.usageCount;
            }
            return { error: null };
          },
        };
      },
    };
  },
};

// 1. Same customer + same razorpay_order_id returns idempotent retry
const idem = await resolveIdempotentPaymentOrder(mockDb, 'rzp_pay_1', 'cust_A', 'rzp_ord_1');
assert.equal(idem.kind, 'idempotent');
assert.equal(idem.order.id, 'ord_1');

// 2. Different customer returns conflict (409)
const conflict = await resolveIdempotentPaymentOrder(mockDb, 'rzp_pay_1', 'cust_B', 'rzp_ord_1');
assert.equal(conflict.kind, 'conflict');

// 3. Rollback deletes order, items, shipments, events and restores campaign usageCount
await rollbackFailedPaidOrder(mockDb, { orderId: 'ord_fail', storeId: 's1', couponCode: 'SAVE10' });
assert.equal(state.campaigns[0].usageCount, 2, 'Rollback must restore campaign usageCount');
assert.ok(state.deleted.includes('ecommerce_orders:id=ord_fail'));

console.log('PASS: Item 5 payment idempotency and rollback checks passed');
