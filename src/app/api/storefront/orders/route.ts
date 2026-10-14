import { NextResponse } from 'next/server';
import {
  MAX_CHECKOUT_BODY_BYTES,
  parseCheckoutPayload,
  placeStorefrontOrder,
  StorefrontOrderError,
} from '@/lib/storefront/orders';
import {
  ORDER_ACCESS_COOKIE_MAX_AGE,
  ORDER_ACCESS_COOKIE_NAME,
  ORDER_ACCESS_COOKIE_PATH,
} from '@/lib/storefront/order-access';

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

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_CHECKOUT_BODY_BYTES) {
    return errorResponse('The checkout payload is too large.', 413);
  }

  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return errorResponse('The checkout payload could not be read.', 400);
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_CHECKOUT_BODY_BYTES) {
    return errorResponse('The checkout payload is too large.', 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse('Checkout payload must be valid JSON.', 400);
  }

  try {
    const payload = parseCheckoutPayload(body);
    const placement = await placeStorefrontOrder(payload);
    const response = NextResponse.json(
      { order: placement.order },
      {
        status: 201,
        headers: { 'Cache-Control': 'no-store' },
      },
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

    try {
      const { getSupabaseAdmin } = await import('@/lib/server/supabase-admin');
      const { getAuthenticatedCustomer } = await import('@/lib/server/customer');
      const supabaseAdmin = getSupabaseAdmin();

      const { customer } = await getAuthenticatedCustomer(request);
      let customerId = customer?.id || null;

      if (!customerId && payload.customer?.email) {
        const { data: matchedCust } = await supabaseAdmin
          .from('ecommerce_customers')
          .select('id')
          .ilike('email', payload.customer.email.trim())
          .limit(1)
          .maybeSingle();
        if (matchedCust) customerId = matchedCust.id;
      }

      const { data: orderRow } = await supabaseAdmin
        .from('ecommerce_orders')
        .select('id, storeId, factoryId, shippingAddressSnapshot')
        .eq('orderNumber', placement.order.orderNumber)
        .maybeSingle();

      if (orderRow) {
        if (customerId) {
          await supabaseAdmin
            .from('ecommerce_orders')
            .update({ customerId, updatedAt: new Date().toISOString() })
            .eq('id', orderRow.id);
        }

        const trackingNum = `CX-EXP-${Math.floor(100000 + Math.random() * 900000)}`;
        const carrier = payload.shippingSpeed === 'exp' ? 'Blue Dart Air Express' : 'Delhivery Priority Express';
        const now = new Date().toISOString();

        await supabaseAdmin.from('ecommerce_shipments').insert({
          id: `ship_${crypto.randomUUID().replace(/-/g, '')}`,
          orderId: orderRow.id,
          storeId: orderRow.storeId,
          factoryId: orderRow.factoryId,
          shipmentNumber: `SHP-${placement.order.orderNumber}`,
          status: 'CONFIRMED',
          carrier,
          trackingNumber: trackingNum,
          shippingAddressSnapshot: orderRow.shippingAddressSnapshot || payload.shippingAddress,
          metadata: { estimatedDelivery: payload.shippingSpeed === 'exp' ? 'Within 48 hours' : 'Within 3-4 days' },
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (linkErr) {
      console.warn('Could not link customer/shipment to placed order:', linkErr);
    }

    return response;
  } catch (error) {
    if (error instanceof StorefrontOrderError) {
      if (error.status >= 500) {
        console.error('Storefront order creation failed', error.logCode);
      }
      return errorResponse(error.message, error.status);
    }

    console.error('Storefront order creation failed', 'unexpected_failure');
    return errorResponse('The order service could not save this order right now.', 502);
  }
}
