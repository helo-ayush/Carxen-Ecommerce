import { NextResponse } from 'next/server';
import {
  CatalogConfigurationError,
  CatalogNotFoundError,
  getStorefrontProducts,
} from '@/lib/storefront/catalog';
import { getAuthenticatedCustomer } from '@/lib/server/customer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    let isWholesale = false;
    try {
      const { customer } = await getAuthenticatedCustomer(request);
      if (customer && customer.b2bStatus === 'APPROVED') {
        isWholesale = true;
      }
    } catch {
      // In guest mode, default to non-wholesale
    }

    const catalog = await getStorefrontProducts({ isWholesale });

    return NextResponse.json({
      ...catalog,
      wholesaleMode: isWholesale,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof CatalogConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof CatalogNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('Storefront catalog request failed', error);
    return NextResponse.json(
      { error: 'The storefront catalog could not be loaded from the database.' },
      { status: 502 },
    );
  }
}
