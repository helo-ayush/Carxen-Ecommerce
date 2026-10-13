import { NextResponse } from 'next/server';
import {
  CatalogConfigurationError,
  CatalogNotFoundError,
  getStorefrontProducts,
} from '@/lib/storefront/catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const catalog = await getStorefrontProducts();

    return NextResponse.json(catalog, {
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
