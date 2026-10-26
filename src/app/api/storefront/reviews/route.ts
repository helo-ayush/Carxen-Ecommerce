import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { getAuthenticatedCustomer } from '@/lib/server/customer';

const STORE_SLUG = process.env.NEXT_PUBLIC_ECOMMERCE_STORE_SLUG?.trim() || 'carxen';

const REJECTED_ORDER_STATUSES = new Set(['CANCELLED', 'REFUNDED', 'RETURNED']);

type StoreRow = {
  id: string;
  factoryId: string;
  settings: Record<string, unknown> | null;
};

type ProductRow = {
  id: string;
  publicId: number;
  status: string;
  publishedAt: string | null;
};

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  verifiedPurchase: boolean;
  createdAt: string;
  customer: { name: string | null } | { name: string | null }[] | null;
};

async function resolveStore() {
  const supabase = getSupabaseAdmin();
  const { data: store } = await supabase
    .from('ecommerce_stores')
    .select('id, factoryId, settings')
    .eq('slug', STORE_SLUG)
    .eq('isPublic', true)
    .eq('status', 'PUBLISHED')
    .maybeSingle();

  if (!store) return null;
  return { supabase, store: store as StoreRow };
}

async function resolveListing(publicId: number) {
  if (!Number.isFinite(publicId)) return null;

  const resolved = await resolveStore();
  if (!resolved) return null;
  const { supabase, store } = resolved;

  const { data: product } = await supabase
    .from('ecommerce_products')
    .select('id, publicId, status, publishedAt')
    .eq('storeId', store.id)
    .eq('publicId', publicId)
    .maybeSingle();

  if (!product) return null;

  return {
    supabase,
    store,
    product: product as ProductRow,
  };
}

function customerName(row: ReviewRow): string {
  const relation = Array.isArray(row.customer) ? row.customer[0] : row.customer;
  const name = relation?.name?.trim();
  if (!name) return 'Verified Buyer';
  const parts = name.split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
}

export async function GET(request: NextRequest) {
  const publicId = Number(request.nextUrl.searchParams.get('productId'));
  const latest = Number(request.nextUrl.searchParams.get('latest'));

  // Latest published reviews across the store, used by the homepage.
  if (!request.nextUrl.searchParams.get('productId') && Number.isFinite(latest)) {
    const resolved = await resolveStore();
    if (!resolved) {
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    }
    const limit = Math.min(12, Math.max(1, latest));
    const { data, error } = await resolved.supabase
      .from('ecommerce_reviews')
      .select('id, rating, title, body, verifiedPurchase, createdAt, product:ecommerce_products(name), customer:ecommerce_customers(name)')
      .eq('storeId', resolved.store.id)
      .eq('status', 'PUBLISHED')
      .not('publishedAt', 'is', null)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: 'Unable to load reviews.' }, { status: 500 });
    }

    const reviews = (data || []).map((row: Record<string, unknown>) => {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      return {
        id: String(row.id),
        rating: Math.min(5, Math.max(1, Math.round(Number(row.rating) || 0))),
        title: String(row.title ?? ''),
        body: String(row.body ?? ''),
        verifiedPurchase: Boolean(row.verifiedPurchase),
        createdAt: String(row.createdAt),
        customerName: customerName(row as unknown as ReviewRow),
        productName: (product as { name?: string } | null)?.name ?? '',
      };
    });

    return NextResponse.json({ reviews, summary: { count: reviews.length } });
  }

  const listing = await resolveListing(publicId);
  if (!listing) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  const { supabase, product } = listing;
  if (product.status !== 'PUBLISHED') {
    return NextResponse.json({ reviews: [], summary: { count: 0, average: 0 } });
  }

  const { data, error } = await supabase
    .from('ecommerce_reviews')
    .select('id, rating, title, body, verifiedPurchase, createdAt, customer:ecommerce_customers(name)')
    .eq('productId', product.id)
    .eq('status', 'PUBLISHED')
    .not('publishedAt', 'is', null)
    .order('createdAt', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: 'Unable to load reviews.' }, { status: 500 });
  }

  const rows = (data || []) as unknown as ReviewRow[];
  const reviews = rows.map((row) => ({
    id: row.id,
    rating: Math.min(5, Math.max(1, Math.round(Number(row.rating) || 0))),
    title: row.title?.trim() || '',
    body: row.body?.trim() || '',
    verifiedPurchase: Boolean(row.verifiedPurchase),
    createdAt: row.createdAt,
    customerName: customerName(row),
  }));

  const count = reviews.length;
  const average = count > 0
    ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / count).toFixed(1))
    : 0;

  return NextResponse.json({ reviews, summary: { count, average } });
}

export async function POST(request: NextRequest) {
  const { customer } = await getAuthenticatedCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: 'Sign in to write a review.' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null) as
    | { productId?: unknown; rating?: unknown; title?: unknown; body?: unknown }
    | null;

  if (!payload) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const publicId = Number(payload.productId);
  const rating = Math.round(Number(payload.rating));
  const title = String(payload.title ?? '').trim();
  const body = String(payload.body ?? '').trim();

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Choose a rating from 1 to 5 stars.' }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ error: 'Write a short review before submitting.' }, { status: 400 });
  }
  if (body.length > 2000 || title.length > 120) {
    return NextResponse.json({ error: 'Review is too long.' }, { status: 400 });
  }

  const listing = await resolveListing(publicId);
  if (!listing) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }
  const { supabase, store, product } = listing;
  if (product.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'This product is not available for reviews.' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('ecommerce_reviews')
    .select('id')
    .eq('productId', product.id)
    .eq('customerId', customer.id)
    .in('status', ['PENDING', 'PUBLISHED'])
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'You have already reviewed this product.' }, { status: 409 });
  }

  const { data: orders } = await supabase
    .from('ecommerce_orders')
    .select('id, status')
    .eq('customerId', customer.id)
    .limit(500);

  const orderIds = (orders || [])
    .filter((order) => !REJECTED_ORDER_STATUSES.has(String(order.status || '').toUpperCase()))
    .map((order) => order.id);

  let verifiedPurchase = false;
  if (orderIds.length > 0) {
    const { data: purchased } = await supabase
      .from('ecommerce_order_items')
      .select('id')
      .eq('productId', product.id)
      .in('orderId', orderIds)
      .limit(1);
    verifiedPurchase = Boolean(purchased && purchased.length > 0);
  }

  if (!verifiedPurchase) {
    return NextResponse.json(
      { error: 'Only customers who have ordered this product can review it.' },
      { status: 403 },
    );
  }

  const settings = store.settings || {};
  const moderation = settings.reviewModeration !== false;
  const status = moderation ? 'PENDING' : 'PUBLISHED';
  const publishedAt = moderation ? null : new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from('ecommerce_reviews')
    .insert({
      id: crypto.randomUUID(),
      productId: product.id,
      customerId: customer.id,
      storeId: store.id,
      factoryId: store.factoryId,
      rating,
      title: title || null,
      body,
      status,
      verifiedPurchase: true,
      publishedAt,
      updatedAt: new Date().toISOString(),
    })
    .select('id, createdAt')
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: 'Could not save your review. Please try again.' }, { status: 500 });
  }

  return NextResponse.json(
    {
      review: {
        id: inserted.id,
        rating,
        title,
        body,
        verifiedPurchase: true,
        createdAt: inserted.createdAt,
        customerName: customer.name || 'Verified Buyer',
      },
      status,
    },
    { status: 201 },
  );
}
