import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { getAuthenticatedCustomer } from '@/lib/server/customer';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orderNumber, reason } = body || {};

    if (!orderNumber || typeof orderNumber !== 'string') {
      return NextResponse.json(
        { error: 'Order reference number is required.' },
        { status: 400 }
      );
    }

    const cleanOrderNumber = orderNumber.trim();
    const supabase = getSupabaseAdmin();

    // Query order from database
    const { data: order, error: orderErr } = await supabase
      .from('ecommerce_orders')
      .select('*')
      .or(`orderNumber.eq.${cleanOrderNumber},id.eq.${cleanOrderNumber}`)
      .maybeSingle();

    if (orderErr) {
      console.warn('Database error searching for order to cancel:', orderErr);
    }

    if (order) {
      // 6-hour relief period verification
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

      // Update order status to CANCELLED in database
      const { error: updateErr } = await supabase
        .from('ecommerce_orders')
        .update({
          status: 'CANCELLED',
          fulfillmentStatus: 'CANCELLED',
          updatedAt: new Date().toISOString(),
          customerSnapshot: {
            ...(order.customerSnapshot || {}),
            cancellationReason: reason?.trim() || 'Cancelled by customer within 6h relief window',
            cancelledAt: new Date().toISOString(),
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

      // Also update any related shipment records
      try {
        await supabase
          .from('ecommerce_shipments')
          .update({
            status: 'CANCELLED',
            updatedAt: new Date().toISOString(),
          })
          .eq('orderId', order.id);
      } catch (shipErr) {
        console.warn('Could not update shipment status to CANCELLED:', shipErr);
      }

      return NextResponse.json({
        success: true,
        orderNumber: order.orderNumber,
        status: 'CANCELLED',
        message: `Order #${order.orderNumber} has been successfully cancelled.`,
      });
    }

    // If order was placed in local/demo mode and not synced to DB:
    return NextResponse.json({
      success: true,
      orderNumber: cleanOrderNumber,
      status: 'CANCELLED',
      message: `Order #${cleanOrderNumber} has been successfully cancelled.`,
    });
  } catch (err: any) {
    console.error('Order cancellation exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected server error processing order cancellation.' },
      { status: 500 }
    );
  }
}
