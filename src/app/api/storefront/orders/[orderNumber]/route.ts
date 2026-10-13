import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getStorefrontOrder,
  StorefrontOrderError,
  validateOrderNumber,
} from '@/lib/storefront/orders';
import { ORDER_ACCESS_COOKIE_NAME } from '@/lib/storefront/order-access';

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
    if (!accessToken) {
      return errorResponse('Order not found.', 404);
    }

    const order = await getStorefrontOrder(orderNumber, accessToken);

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
