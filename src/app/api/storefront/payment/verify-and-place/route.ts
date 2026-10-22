import { NextResponse } from 'next/server';
import {
  verifyRazorpaySignature,
  fetchAndVerifyRazorpayPayment,
  getRazorpayConfig,
} from '@/lib/server/razorpay';
import { calculateAuthoritativeCartTotals } from '@/lib/server/checkout-pricing';
import {
  parseCheckoutPayload,
  placeStorefrontOrder,
  StorefrontOrderError,
} from '@/lib/storefront/orders';
import {
  ORDER_ACCESS_COOKIE_MAX_AGE,
  ORDER_ACCESS_COOKIE_NAME,
  ORDER_ACCESS_COOKIE_PATH,
} from '@/lib/storefront/order-access';
import { getAuthenticatedCustomer, loadCustomerOrders } from '@/lib/server/customer';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
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

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      checkout,
    } = body || {};

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { error: 'Missing Razorpay order ID or payment ID.' },
        { status: 400 }
      );
    }

    if (!checkout) {
      return NextResponse.json(
        { error: 'Missing checkout order data.' },
        { status: 400 }
      );
    }

    // Step 1: Parse and validate checkout payload
    const parsedPayload = parseCheckoutPayload(checkout);

    // Step 2: Get authenticated buyer context for wholesale validation
    let buyerContext: WholesaleBuyerContext | undefined;
    let customerId: string | null = null;
    try {
      const { customer: authCust } = await getAuthenticatedCustomer(request);
      if (authCust) {
        customerId = authCust.id;
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
        const guestEmail = (parsedPayload.customer?.email || (parsedPayload.shippingAddress as any)?.email)?.trim();
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
      // Guest or anonymous
    }

    // Step 3: Authoritatively calculate order totals on the server
    const totals = await calculateAuthoritativeCartTotals({
      items: parsedPayload.items,
      shippingSpeed: parsedPayload.shippingSpeed,
      couponCode: parsedPayload.couponCode,
      buyerContext,
    });

    // Step 4: Cryptographic HMAC-SHA256 signature verification
    const isValidSignature = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: razorpay_signature || '',
    });

    if (!isValidSignature) {
      console.error('Tampering alert: Razorpay signature verification failed for order', razorpay_order_id);
      return NextResponse.json(
        { error: 'Payment signature verification failed. Potential payment tampering detected.' },
        { status: 400 }
      );
    }

    // Step 5: Direct Razorpay API verification (checks status, order_id, and amount)
    let verifiedPayment: any;
    try {
      verifiedPayment = await fetchAndVerifyRazorpayPayment({
        razorpay_payment_id,
        expected_order_id: razorpay_order_id,
        expected_amount_in_paise: totals.amountInPaise,
      });
    } catch (paymentErr: any) {
      console.error('Razorpay payment validation failed:', paymentErr);
      return NextResponse.json(
        { error: paymentErr?.message || 'Payment could not be verified with Razorpay.' },
        { status: 400 }
      );
    }

    // Step 6: Anti-replay protection — check if payment ID was already used
    const supabaseAdmin = getSupabaseAdmin();
    const { data: existingPaymentOrder } = await supabaseAdmin
      .from('ecommerce_orders')
      .select('id, orderNumber')
      .contains('metadata', { razorpay_payment_id })
      .maybeSingle();

    if (existingPaymentOrder) {
      console.error('Duplicate payment reuse attempt:', razorpay_payment_id);
      return NextResponse.json(
        { error: 'This payment transaction has already been recorded for an existing order.' },
        { status: 409 }
      );
    }

    // Step 7: Place order into database with PAID status
    const placement = await placeStorefrontOrder({
      ...parsedPayload,
      paymentMethod:
        verifiedPayment?.method === 'upi'
          ? 'UPI'
          : verifiedPayment?.method === 'card'
          ? 'Card'
          : verifiedPayment?.method === 'netbanking'
          ? 'Net banking'
          : 'Card',
    });

    // Step 8: Update order row with paymentStatus: 'PAID' and Razorpay metadata
    const carrier = parsedPayload.shippingSpeed === 'exp' ? 'Blue Dart Air Express' : 'Delhivery Priority Express';
    const trackingNum = `CX-EXP-${Math.floor(100000 + Math.random() * 900000)}`;
    const estimatedDelivery = parsedPayload.shippingSpeed === 'exp' ? 'Within 48 hours' : 'Within 3-4 days';
    const now = new Date().toISOString();

    const { data: orderRow } = await supabaseAdmin
      .from('ecommerce_orders')
      .select('id, storeId, factoryId, shippingAddressSnapshot')
      .eq('orderNumber', placement.order.orderNumber)
      .maybeSingle();

    if (orderRow) {
      const orderUpdate: Record<string, any> = {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        metadata: {
          razorpay_order_id,
          razorpay_payment_id,
          payment_method: verifiedPayment?.method || 'razorpay',
          paid_amount_in_paise: totals.amountInPaise,
          paid_at: now,
          is_mock: Boolean(verifiedPayment?.isMock),
        },
        updatedAt: now,
      };

      if (customerId) {
        orderUpdate.customerId = customerId;
      }

      await supabaseAdmin.from('ecommerce_orders').update(orderUpdate).eq('id', orderRow.id);

      // Create shipment tracking record
      await supabaseAdmin.from('ecommerce_shipments').insert({
        id: `ship_${crypto.randomUUID().replace(/-/g, '')}`,
        orderId: orderRow.id,
        storeId: orderRow.storeId,
        factoryId: orderRow.factoryId,
        shipmentNumber: `SHP-${placement.order.orderNumber}`,
        status: 'CONFIRMED',
        carrier,
        trackingNumber: trackingNum,
        shippingAddressSnapshot: orderRow.shippingAddressSnapshot || parsedPayload.shippingAddress,
        metadata: { estimatedDelivery },
        createdAt: now,
        updatedAt: now,
      });
    }

    // Step 9: Return response with secure order access cookie
    const response = NextResponse.json(
      {
        success: true,
        order: {
          ...placement.order,
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
        },
        carrier,
        trackingNumber: trackingNum,
        estimatedDelivery,
      },
      {
        status: 201,
        headers: { 'Cache-Control': 'no-store' },
      }
    );

    response.cookies.set({
      name: ORDER_ACCESS_COOKIE_NAME,
      value: placement.orderAccessToken,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: ORDER_ACCESS_COOKIE_PATH,
      maxAge: ORDER_ACCESS_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error: any) {
    if (error instanceof StorefrontOrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Failed to verify payment and place order:', error);
    return NextResponse.json(
      { error: error?.message || 'Payment verification failed.' },
      { status: 500 }
    );
  }
}