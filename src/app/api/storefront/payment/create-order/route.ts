import { NextResponse } from 'next/server';
import { getRazorpayConfig, createRazorpayOrder } from '@/lib/server/razorpay';
import { calculateAuthoritativeCartTotals } from '@/lib/server/checkout-pricing';
import { getAuthenticatedCustomer, loadCustomerOrders } from '@/lib/server/customer';
import type { WholesaleBuyerContext } from '@/lib/storefront/coupons';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }

    const { items, shippingSpeed, couponCode, customer, shippingAddress } = body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty. Please select products to purchase.' }, { status: 400 });
    }

    // Authenticate user to get wholesale status and buyer context
    let buyerContext: WholesaleBuyerContext | undefined;
    try {
      const { customer: authCust } = await getAuthenticatedCustomer(request);
      if (authCust) {
        let orderCount = 0;
        try {
          const pastOrders = await loadCustomerOrders(authCust.id, authCust.email);
          const completedOrders = (pastOrders || []).filter((o: any) => {
            const st = (o.status || '').toLowerCase();
            return st !== 'cancelled' && st !== 'refunded';
          });
          orderCount = completedOrders.length;
        } catch (e) {
          console.warn('Could not load customer order count:', e);
        }

        buyerContext = {
          isWholesaleApproved: authCust.b2bStatus === 'APPROVED',
          businessName: authCust.businessName || undefined,
          email: authCust.email || undefined,
          userId: authCust.id,
          orderCount,
          isVerifiedBuyer: orderCount >= 3,
        };
      } else {
        const guestEmail = (customer?.email || shippingAddress?.email)?.trim();
        if (guestEmail) {
          try {
            const pastOrders = await loadCustomerOrders('', guestEmail);
            const completedOrders = (pastOrders || []).filter((o: any) => {
              const st = (o.status || '').toLowerCase();
              return st !== 'cancelled' && st !== 'refunded';
            });
            const orderCount = completedOrders.length;
            buyerContext = {
              isWholesaleApproved: false,
              email: guestEmail,
              orderCount,
              isVerifiedBuyer: orderCount >= 3,
            };
          } catch {
            buyerContext = {
              isWholesaleApproved: false,
              email: guestEmail,
              orderCount: 0,
              isVerifiedBuyer: false,
            };
          }
        }
      }
    } catch {
      // Unauthenticated / guest checkout fallback
    }

    // Calculate authoritative totals (prevents client-side price/coupon manipulation)
    const totals = await calculateAuthoritativeCartTotals({
      items,
      shippingSpeed: shippingSpeed === 'exp' ? 'exp' : 'std',
      couponCode: couponCode || null,
      buyerContext,
    });

    if (totals.finalTotal <= 0) {
      return NextResponse.json(
        { error: 'Order total is zero. Razorpay payment is not required.' },
        { status: 400 }
      );
    }

    // Generate unique receipt reference
    const receipt = `cx_rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Create Razorpay order on Razorpay servers
    const rzpOrder = await createRazorpayOrder({
      amountInPaise: totals.amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        storeSlug: 'carxen',
        customerName: customer?.name || shippingAddress?.name || 'Customer',
        customerEmail: customer?.email || '',
        customerPhone: customer?.phone || shippingAddress?.phone || '',
        couponCode: totals.appliedCoupon || '',
      },
    });

    const { keyId } = getRazorpayConfig();

    return NextResponse.json(
      {
        success: true,
        razorpayOrderId: rzpOrder.id,
        amount: totals.amountInPaise,
        currency: 'INR',
        keyId,
        isMock: rzpOrder.isMock,
        summary: {
          subtotal: totals.subtotal,
          couponDiscount: totals.couponDiscount,
          shippingCost: totals.shippingCost,
          finalTotal: totals.finalTotal,
          appliedCoupon: totals.appliedCoupon,
          couponName: totals.couponName,
        },
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (err: any) {
    console.error('Failed to create Razorpay checkout order:', err);
    return NextResponse.json(
      { error: err?.message || 'Unable to initialize Razorpay checkout. Please try again.' },
      { status: 400 }
    );
  }
}