import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getStorefrontOrder,
  StorefrontOrderError,
  validateOrderNumber,
} from '@/lib/storefront/orders';
import { ORDER_ACCESS_COOKIE_NAME, isOrderAccessToken } from '@/lib/storefront/order-access';
import { getAuthenticatedCustomer } from '@/lib/server/customer';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import type { StorefrontOrderSnapshot, StorefrontOrderItemSnapshot } from '@/lib/storefront/order-types';

export const dynamic = 'force-dynamic';

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderNumber: string }> },
) {
  try {
    const { orderNumber: rawOrderNumber } = await context.params;
    const orderNumber = validateOrderNumber(rawOrderNumber);
    const accessToken = (await cookies()).get(ORDER_ACCESS_COOKIE_NAME)?.value;

    let order: StorefrontOrderSnapshot | null = null;

    if (accessToken && isOrderAccessToken(accessToken)) {
      try {
        order = await getStorefrontOrder(orderNumber, accessToken);
      } catch {
        // Fall through to customer auth check
      }
    }

    if (!order) {
      // Check if authenticated customer owns this order
      const { user, customer } = await getAuthenticatedCustomer(_request);
      if (user || customer) {
        const supabase = getSupabaseAdmin();
        const { data: dbOrder } = await supabase
          .from('ecommerce_orders')
          .select('*')
          .eq('orderNumber', orderNumber)
          .maybeSingle();

        if (dbOrder) {
          const authEmail = (user?.email || customer?.email || '').toLowerCase().trim();
          const custId = customer?.id || user?.id || '';
          const snapEmail = ((dbOrder.customerSnapshot as any)?.email || '').toLowerCase().trim();
          const orderCustId = dbOrder.customerId || '';

          const isAuthorized =
            (custId && orderCustId && custId === orderCustId) ||
            (authEmail && snapEmail && authEmail === snapEmail) ||
            user?.role === 'admin';

          if (isAuthorized) {
            // Fetch line items
            const { data: dbItems } = await supabase
              .from('ecommerce_order_items')
              .select('*')
              .eq('orderId', dbOrder.id);

            const items: StorefrontOrderItemSnapshot[] = (dbItems || []).map((it: any) => ({
              productId: it.productId,
              name: it.title || it.name || 'Auto Part',
              quantity: it.quantity || 1,
              unitPrice: Number(it.unitPrice || 0),
              lineSubtotal: Number(it.totalPrice || it.lineSubtotal || 0),
            }));

            order = {
              orderNumber: dbOrder.orderNumber,
              currency: dbOrder.currency || 'INR',
              status: dbOrder.status || 'CONFIRMED',
              subtotal: Number(dbOrder.subtotal || 0),
              discountAmount: Number(dbOrder.discountAmount || 0),
              shippingAmount: Number(dbOrder.shippingAmount || 0),
              totalAmount: Number(dbOrder.totalAmount || 0),
              paymentStatus: dbOrder.paymentStatus || 'PAID',
              fulfillmentStatus: dbOrder.fulfillmentStatus || 'PROCESSING',
              couponCode: dbOrder.couponCode || null,
              customer: (dbOrder.customerSnapshot as any) || {
                name: customer?.name || user?.user_metadata?.full_name || 'Driver',
              },
              shippingAddress: (dbOrder.shippingAddressSnapshot as any) || {},
              placedAt: dbOrder.placedAt || dbOrder.createdAt,
              items,
            };
          }
        }
      }
    }

    if (!order) {
      return errorResponse('Order not found.', 404);
    }

    return NextResponse.json(
      { order },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (error) {
    if (error instanceof StorefrontOrderError) {
      if (error.status >= 500) {
        console.error('Storefront order lookup failed', error.logCode);
      }
      return errorResponse(error.message, error.status);
    }

    console.error('Storefront order lookup failed', 'unexpected_failure');
    return errorResponse('The order service could not load this order right now.', 502);
  }
}
