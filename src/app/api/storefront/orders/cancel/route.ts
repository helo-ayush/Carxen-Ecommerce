import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { getAuthenticatedCustomer } from '@/lib/server/customer';
import { ORDER_ACCESS_COOKIE_NAME } from '@/lib/storefront/order-access';
import { getStorefrontOrder } from '@/lib/storefront/orders';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orderNumber, reason, accessToken } = body || {};

    if (!orderNumber || typeof orderNumber !== 'string') {
      return NextResponse.json(
        { error: 'Order reference number is required.' },
        { status: 400 }
      );
    }

    const cleanOrderNumber = orderNumber.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(cleanOrderNumber)) {
      return NextResponse.json(
        { error: 'Invalid order reference number.' },
        { status: 400 }
      );
    }

    // 1. Authenticate caller (Account session or Guest order token)
    let authUser: any = null;
    let customer: any = null;
    try {
      const auth = await getAuthenticatedCustomer(request);
      authUser = auth.user;
      customer = auth.customer;
    } catch {
      // Guest or anonymous
    }

    const cookieStore = await cookies();
    const guestAccessToken =
      (typeof accessToken === 'string' && accessToken.trim()) ||
      cookieStore.get(ORDER_ACCESS_COOKIE_NAME)?.value ||
      null;

    const hasAuth = Boolean(authUser || customer);
    const hasGuestToken = Boolean(guestAccessToken);

    if (!hasAuth && !hasGuestToken) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to manage or cancel your order.' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 2. Query order from database using separate parameterised .eq() calls
    let order: any = null;
    let orderErr: any = null;
    {
      const byOrderNum = await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('orderNumber', cleanOrderNumber)
        .maybeSingle();
      order = byOrderNum.data;
      orderErr = byOrderNum.error;
    }
    if (!order && !orderErr) {
      const byId = await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('id', cleanOrderNumber)
        .maybeSingle();
      order = byId.data;
      orderErr = byId.error;
    }

    if (orderErr || !order) {
      return NextResponse.json(
        { error: 'Order not found.' },
        { status: 404 }
      );
    }

    // 3. Strict Authorization & Ownership Verification
    let isAuthorized = false;

    if (hasAuth) {
      const custId = customer?.id || '';
      const authUserId = customer?.authUserId || authUser?.id || '';
      const orderCustomerId = order.customerId || '';
      const isAdmin = authUser?.role === 'admin' || authUser?.app_metadata?.role === 'admin';

      if (
        isAdmin ||
        (custId && orderCustomerId && custId === orderCustomerId) ||
        (authUserId && orderCustomerId && authUserId === orderCustomerId)
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && hasGuestToken) {
      try {
        const guestOrder = await getStorefrontOrder(order.orderNumber, guestAccessToken!);
        if (guestOrder && guestOrder.orderNumber === order.orderNumber) {
          isAuthorized = true;
        }
      } catch (err) {
        console.warn('Guest access token verification failed for order cancellation:', err);
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You are not authorized to cancel this order.' },
        { status: 403 }
      );
    }

    // 4. Verify 6-hour relief period window (fail closed on missing/invalid date)
    const placedTimestamp = order.placedAt || order.createdAt;
    const placedTime = placedTimestamp ? new Date(placedTimestamp).getTime() : NaN;
    const hoursElapsed = (Date.now() - placedTime) / (1000 * 60 * 60);

    if (!placedTimestamp || !Number.isFinite(placedTime) || !Number.isFinite(hoursElapsed) || hoursElapsed > 6) {
      return NextResponse.json(
        {
          error:
            'This order is not eligible for online self-cancellation (the 6-hour relief period has expired or order timestamp is unavailable). Please contact CarXen customer support.',
        },
        { status: 400 }
      );
    }

    // 5. Block self-cancellation for paid orders (refunds must go through support)
    const paymentUpper = String(order.paymentStatus || '').toUpperCase();
    if (paymentUpper === 'PAID' || paymentUpper === 'CAPTURED' || paymentUpper === 'SETTLED') {
      return NextResponse.json(
        {
          error:
            'Paid orders cannot be self-cancelled online. Please contact CarXen customer support to request cancellation and refund.',
        },
        { status: 400 }
      );
    }

    // 6. Verify order status allows cancellation (unshipped statuses only)
    const ALLOWED_CANCEL_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING'];
    const statusUpper = String(order.status || '').toUpperCase();
    const fulfillmentUpper = String(order.fulfillmentStatus || '').toUpperCase();

    if (statusUpper === 'CANCELLED' || fulfillmentUpper === 'CANCELLED') {
      return NextResponse.json(
        { error: `Order #${order.orderNumber} is already cancelled.` },
        { status: 400 }
      );
    }

    if (!ALLOWED_CANCEL_STATUSES.includes(statusUpper) || !['PENDING', 'CONFIRMED', 'PROCESSING', 'UNFULFILLED', ''].includes(fulfillmentUpper)) {
      return NextResponse.json(
        { error: `Order #${order.orderNumber} is already in "${order.status}" state and cannot be cancelled online.` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 7. Atomically transition status to CANCELLED (re-checking allowed statuses to prevent double-cancel races)
    const { data: updatedOrder, error: updateErr } = await supabase
      .from('ecommerce_orders')
      .update({
        status: 'CANCELLED',
        fulfillmentStatus: 'CANCELLED',
        updatedAt: now,
        customerSnapshot: {
          ...(order.customerSnapshot || {}),
          cancellationReason: typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 300) : 'Cancelled by customer within 6h relief window',
          cancelledAt: now,
        },
      })
      .eq('id', order.id)
      .in('status', ALLOWED_CANCEL_STATUSES)
      .select('id')
      .maybeSingle();

    if (updateErr) {
      console.error('Failed to update order status in DB:', updateErr);
      return NextResponse.json(
        { error: 'Database update failed while cancelling the order. Please try again.' },
        { status: 500 }
      );
    }

    if (!updatedOrder) {
      return NextResponse.json(
        { error: `Order #${order.orderNumber} was already cancelled or shipped.` },
        { status: 409 }
      );
    }

    // 7b. Restore campaign usageCount if a coupon was applied
    if (order.couponCode && order.storeId) {
      try {
        const { data: camp } = await supabase
          .from('ecommerce_campaigns')
          .select('id, usageCount')
          .eq('storeId', order.storeId)
          .eq('code', order.couponCode)
          .maybeSingle();
        if (camp && Number(camp.usageCount) > 0) {
          await supabase
            .from('ecommerce_campaigns')
            .update({ usageCount: Math.max(0, Number(camp.usageCount) - 1), updatedAt: now })
            .eq('id', camp.id);
        }
      } catch (campErr) {
        console.warn('Could not restore campaign usageCount during cancellation:', campErr);
      }
    }

    // 7. Also update any related shipment records and release active stock reservations
    try {
      await supabase
        .from('ecommerce_shipments')
        .update({
          status: 'CANCELLED',
          updatedAt: now,
        })
        .eq('orderId', order.id);
    } catch (shipErr) {
      console.warn('Could not update shipment status to CANCELLED:', shipErr);
    }

    try {
      await supabase
        .from('ecommerce_inventory_reservations')
        .update({
          status: 'RELEASED',
          releasedAt: now,
          updatedAt: now,
        })
        .eq('orderId', order.id)
        .eq('status', 'ACTIVE');
    } catch (resErr) {
      console.warn('Could not release active reservations during order cancellation:', resErr);
    }

    // 8. Record order cancellation event for audit trail
    try {
      await supabase.from('ecommerce_order_events').insert({
        id: `evt_${crypto.randomUUID().replace(/-/g, '')}`,
        orderId: order.id,
        eventType: 'ORDER_CANCELLED',
        description: `Order cancelled by customer within 6-hour relief period. Reason: ${reason?.trim() || 'Customer requested cancellation'}`,
        metadata: {
          cancelledBy: authUser?.email || customer?.email || 'Guest verified with order token',
          cancelledAt: now,
        },
        createdAt: now,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      status: 'CANCELLED',
      message: `Order #${order.orderNumber} has been successfully cancelled.`,
    });
  } catch (err: any) {
    console.error('Order cancellation exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected server error processing order cancellation.' },
      { status: 500 }
    );
  }
}
