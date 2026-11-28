import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isWholesaleBuyerMatch, validateCoupon } from '../../src/lib/storefront/coupons.ts';

// 1. Substring .includes() bypass must no longer match
const targetedCoupon = {
  code: 'DEALERVIP',
  name: 'VIP',
  type: 'Percentage',
  value: 15,
  status: 'Active',
  minimumOrder: 0,
  audience: 'Individual Wholesale Buyer',
  targetWholesaleBuyerName: 'Apex Motors',
};

assert.equal(
  isWholesaleBuyerMatch(targetedCoupon, {
    isWholesaleApproved: true,
    businessName: 'Apex', // substring must fail
    name: 'Apex Motors',  // editable personal name must fail
  }),
  false
);

assert.equal(
  isWholesaleBuyerMatch(targetedCoupon, {
    isWholesaleApproved: true,
    businessName: 'Apex Motors',
  }),
  true
);

// 2. Percentage > 100 is capped at 100% (never exceeds subtotal)
const overPct = validateCoupon('OVER150', 1000, { isWholesaleApproved: true }, [
  {
    code: 'OVER150',
    name: 'Over',
    type: 'Percentage',
    value: 150,
    status: 'Active',
    minimumOrder: 0,
    audience: 'All customers',
  },
]);
assert.equal(overPct.valid, true);
assert.equal(overPct.discountAmount, 1000);

// 3. profile/route.ts locks name for APPROVED dealers
const profileSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/app/api/storefront/customer/profile/route.ts'), 'utf8');
assert.match(profileSrc, /!isApprovedDealer\s*&&\s*typeof name === 'string'/);

console.log('PASS: Item 7 coupon targeting and profile lock checks passed');
