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

    // 2. Query order from database
    const { data: order, error: orderErr } = await supabase
      .from('ecommerce_orders')
      .select('*')
      .or(`orderNumber.eq.${cleanOrderNumber},id.eq.${cleanOrderNumber}`)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: 'Order not found.' },
        { status: 404 }
      );
    }

    // 3. Strict Authorization & Ownership Verification
    let isAuthorized = false;

    if (hasAuth) {
      const authEmail = (authUser?.email || customer?.email || '').toLowerCase().trim();
      const custId = customer?.id || '';
      const authUserId = customer?.authUserId || authUser?.id || '';
      const orderCustomerId = order.customerId || '';
      const orderEmail = ((order.customerSnapshot as any)?.email || '').toLowerCase().trim();
      const isAdmin = authUser?.role === 'admin' || authUser?.app_metadata?.role === 'admin';

      if (
        isAdmin ||
        (custId && orderCustomerId && custId === orderCustomerId) ||
        (authUserId && orderCustomerId && authUserId === orderCustomerId) ||
        (authEmail && orderEmail && authEmail === orderEmail)
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

    // 4. Verify 6-hour relief period window
    const placedTimestamp = order.placedAt || order.createdAt;
    const placedTime = new Date(placedTimestamp).getTime();
    const hoursElapsed = (Date.now() - placedTime) / (1000 * 60 * 60);

    if (Number.isFinite(hoursElapsed) && hoursElapsed > 6) {
      return NextResponse.json(
        {
          error:
            'The 6-hour cancellation relief period has expired for this order. Please contact CarXen customer support to request cancellation.',
          hoursElapsed: Math.round(hoursElapsed),
        },
        { status: 400 }
      );
    }

    // 5. Verify order status allows cancellation
    const statusUpper = (order.status || '').toUpperCase();
    const fulfillmentUpper = (order.fulfillmentStatus || '').toUpperCase();

    if (statusUpper === 'CANCELLED' || fulfillmentUpper === 'CANCELLED') {
      return NextResponse.json(
        { error: `Order #${order.orderNumber} is already cancelled.` },
        { status: 400 }
      );
    }

    if (statusUpper === 'DELIVERED' || fulfillmentUpper === 'DELIVERED') {
      return NextResponse.json(
        { error: `Order #${order.orderNumber} has already been delivered and cannot be cancelled.` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 6. Update order status to CANCELLED in database
    const { error: updateErr } = await supabase
      .from('ecommerce_orders')
      .update({
        status: 'CANCELLED',
        fulfillmentStatus: 'CANCELLED',
        updatedAt: now,
        customerSnapshot: {
          ...(order.customerSnapshot || {}),
          cancellationReason: reason?.trim() || 'Cancelled by customer within 6h relief window',
          cancelledAt: now,
        },
      })
      .eq('id', order.id);

    if (updateErr) {
      console.error('Failed to update order status in DB:', updateErr);
      return NextResponse.json(
        { error: 'Database update failed while cancelling the order. Please try again.' },
        { status: 500 }
      );
    }

    // 7. Also update any related shipment records
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
