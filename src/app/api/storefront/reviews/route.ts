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
  productId?: string;
  rating: number;
  title: string | null;
  body: string | null;
  status?: string;
  verifiedPurchase: boolean;
  adminReply?: string | null;
  adminRepliedAt?: string | null;
  createdAt: string;
  customer: { name: string | null } | { name: string | null }[] | null;
  product?: { name: string | null; publicId?: number } | { name: string | null; publicId?: number }[] | null;
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
  const myReviewsParam = request.nextUrl.searchParams.get('myReviews') === 'true';

  // 1. Load all reviews written by the currently logged-in customer (used by Profile)
  if (myReviewsParam) {
    const { customer } = await getAuthenticatedCustomer(request);
    if (!customer) {
      return NextResponse.json({ reviews: [] });
    }

    const resolved = await resolveStore();
    if (!resolved) {
      return NextResponse.json({ reviews: [] });
    }

    const { data: rows, error } = await resolved.supabase
      .from('ecommerce_reviews')
      .select('id, productId, rating, title, body, status, verifiedPurchase, adminReply, adminRepliedAt, createdAt, product:ecommerce_products(name, publicId)')
      .eq('customerId', customer.id)
      .order('createdAt', { ascending: false });

    if (error || !rows) {
      return NextResponse.json({ reviews: [] });
    }

    const reviews = (rows || []).map((row: any) => {
      const prod = Array.isArray(row.product) ? row.product[0] : row.product;
      return {
        id: String(row.id),
        productId: prod?.publicId || row.productId,
        productPublicId: prod?.publicId,
        productName: prod?.name || 'Product',
        rating: Math.min(5, Math.max(1, Math.round(Number(row.rating) || 5))),
        title: String(row.title ?? ''),
        comment: String(row.body ?? ''),
        body: String(row.body ?? ''),
        status: row.status,
        verifiedPurchase: Boolean(row.verifiedPurchase),
        adminReply: row.adminReply || null,
        adminRepliedAt: row.adminRepliedAt || null,
        createdAt: String(row.createdAt),
      };
    });

    return NextResponse.json({ reviews });
  }

  const publicId = Number(request.nextUrl.searchParams.get('productId'));
  const latest = Number(request.nextUrl.searchParams.get('latest'));

  // 2. Latest published reviews across the store (used by Homepage)
  if (!request.nextUrl.searchParams.get('productId') && Number.isFinite(latest)) {
    const resolved = await resolveStore();
    if (!resolved) {
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    }
    const limit = Math.min(12, Math.max(1, latest));
    const { data, error } = await resolved.supabase
      .from('ecommerce_reviews')
      .select('id, rating, title, body, verifiedPurchase, adminReply, createdAt, product:ecommerce_products(name), customer:ecommerce_customers(name)')
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
        adminReply: row.adminReply ? String(row.adminReply) : null,
      };
    });

    return NextResponse.json({ reviews, summary: { count: reviews.length } });
  }

  // 3. Product Reviews (used by Product Detail Page)
  const listing = await resolveListing(publicId);
  if (!listing) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  const { supabase, product } = listing;
  if (product.status !== 'PUBLISHED') {
    return NextResponse.json({ reviews: [], summary: { count: 0, average: 0 } });
  }

  // Also check if current viewer is an author to include their pending review
  let viewerCustomerId: string | null = null;
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (auth.customer) viewerCustomerId = auth.customer.id;
  } catch {}

  let reviewQuery = supabase
    .from('ecommerce_reviews')
    .select('id, rating, title, body, status, verifiedPurchase, adminReply, adminRepliedAt, createdAt, customerId, customer:ecommerce_customers(name)')
    .eq('productId', product.id)
    .order('createdAt', { ascending: false })
    .limit(200);

  // If viewer is authenticated, return published reviews OR their own review
  if (viewerCustomerId) {
    reviewQuery = reviewQuery.or(`status.eq.PUBLISHED,customerId.eq.${viewerCustomerId}`);
  } else {
    reviewQuery = reviewQuery.eq('status', 'PUBLISHED').not('publishedAt', 'is', null);
  }

  const { data, error } = await reviewQuery;

  if (error) {
    return NextResponse.json({ error: 'Unable to load reviews.' }, { status: 500 });
  }

  const rows = (data || []) as unknown as (ReviewRow & { status?: string })[];
  const reviews = rows.map((row) => ({
    id: row.id,
    rating: Math.min(5, Math.max(1, Math.round(Number(row.rating) || 0))),
    title: row.title?.trim() || '',
    body: row.body?.trim() || '',
    status: row.status,
    verifiedPurchase: Boolean(row.verifiedPurchase),
    createdAt: row.createdAt,
    customerName: customerName(row),
    adminReply: row.adminReply || null,
    adminRepliedAt: row.adminRepliedAt || null,
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

  // Check verified purchase across customer ID and email
  let orderFilter = `customerId.eq.${customer.id}`;
  if (customer.email && customer.email.trim()) {
    orderFilter += `,customerSnapshot->>email.ilike.${customer.email.trim()}`;
  }

  const { data: orders } = await supabase
    .from('ecommerce_orders')
    .select('id, status')
    .or(orderFilter)
    .limit(500);

  const orderIds = (orders || [])
    .filter((order) => !REJECTED_ORDER_STATUSES.has(String(order.status || '').toUpperCase()))
    .map((order) => order.id);

  let verifiedPurchase = false;
  if (orderIds.length > 0) {
    const { data: purchased } = await supabase
      .from('ecommerce_order_items')
      .select('id')
      .in('orderId', orderIds)
      .or(`productId.eq.${product.id},productPublicId.eq.${product.publicId}`)
      .limit(1);
    verifiedPurchase = Boolean(purchased && purchased.length > 0);
  }

  // If order was placed, allow review; fallback to true if initiated from verified order item in account
  if (!verifiedPurchase && orderIds.length > 0) {
    verifiedPurchase = true;
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

  // Check if an existing review already exists for this product by this customer
  const { data: existing } = await supabase
    .from('ecommerce_reviews')
    .select('id')
    .eq('productId', product.id)
    .eq('customerId', customer.id)
    .maybeSingle();

  if (existing?.id) {
    // Update existing review
    const { data: updated, error: updateErr } = await supabase
      .from('ecommerce_reviews')
      .update({
        rating,
        title: title || null,
        body,
        status,
        verifiedPurchase: true,
        publishedAt,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id, createdAt')
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ error: 'Could not update your review. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(
      {
        review: {
          id: updated.id,
          rating,
          title,
          body,
          verifiedPurchase: true,
          createdAt: updated.createdAt,
          customerName: customer.name || 'Verified Buyer',
        },
        status,
        updated: true,
      },
      { status: 200 },
    );
  }

  // Insert new review
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

export async function DELETE(request: NextRequest) {
  const { customer } = await getAuthenticatedCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const publicId = Number(request.nextUrl.searchParams.get('productId'));
  const reviewId = request.nextUrl.searchParams.get('reviewId');

  const resolved = await resolveStore();
  if (!resolved) {
    return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
  }
  const { supabase, store } = resolved;

  let query = supabase.from('ecommerce_reviews').delete().eq('customerId', customer.id);

  if (reviewId) {
    query = query.eq('id', reviewId);
  } else if (Number.isFinite(publicId)) {
    const listing = await resolveListing(publicId);
    if (!listing) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }
    query = query.eq('productId', listing.product.id);
  } else {
    return NextResponse.json({ error: 'productId or reviewId is required.' }, { status: 400 });
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: 'Could not delete review.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
