import { NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/server/customer';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

const DUMMY_IDS = new Set([
  'list-fast-movers',
  'list-hyundai-pack',
  'list-suv-mahindra',
  'list-monsoon',
]);

function cleanUserAssortments(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  return items.filter((a) => {
    if (!a || typeof a !== 'object') return false;
    if (DUMMY_IDS.has(a.id)) return false;
    // Must have a title and non-empty items
    if (!a.title) return false;
    return true;
  });
}

export async function GET(request: Request) {
  try {
    const { customer, user } = await getAuthenticatedCustomer(request);
    if (!customer) {
      return NextResponse.json({ success: true, assortments: [] });
    }

    const meta = (customer.metadata || {}) as Record<string, any>;
    const rawAssortments = meta.savedAssortments || user?.user_metadata?.savedAssortments || [];
    const assortments = cleanUserAssortments(rawAssortments);

    return NextResponse.json({
      success: true,
      assortments,
    });
  } catch (err: any) {
    console.error('Failed to get wholesale assortments:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { customer, user } = await getAuthenticatedCustomer(request);
    if (!customer) {
      return NextResponse.json(
        { error: 'Authentication required to save procurement assortments.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();
    const existingMeta = (customer.metadata || {}) as Record<string, any>;
    const existingAssortments = cleanUserAssortments(existingMeta.savedAssortments || []);

    let nextAssortments: any[] = [];

    if (Array.isArray(body.assortments)) {
      nextAssortments = cleanUserAssortments(body.assortments);
    } else if (body.assortment && typeof body.assortment === 'object') {
      const incoming = body.assortment;
      const index = existingAssortments.findIndex((a) => a.id === incoming.id);
      if (index >= 0) {
        nextAssortments = [...existingAssortments];
        nextAssortments[index] = incoming;
      } else {
        nextAssortments = [incoming, ...existingAssortments];
      }
      nextAssortments = cleanUserAssortments(nextAssortments);
    } else {
      return NextResponse.json({ error: 'Invalid assortment payload' }, { status: 400 });
    }

    const updatedMeta = {
      ...existingMeta,
      savedAssortments: nextAssortments,
    };

    const { error: updateErr } = await supabase
      .from('ecommerce_customers')
      .update({
        metadata: updatedMeta,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', customer.id);

    if (updateErr) {
      console.error('Failed to persist assortments to customer metadata:', updateErr);
      return NextResponse.json({ error: 'Failed to save assortments to database' }, { status: 500 });
    }

    if (user?.id) {
      try {
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            savedAssortments: nextAssortments,
          },
        });
      } catch {
        // non-blocking
      }
    }

    return NextResponse.json({
      success: true,
      assortments: nextAssortments,
    });
  } catch (err: any) {
    console.error('Failed to save wholesale assortments:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { customer, user } = await getAuthenticatedCustomer(request);
    if (!customer) {
      return NextResponse.json(
        { error: 'Authentication required to delete assortments.' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    let id = url.searchParams.get('id');
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Assortment ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const existingMeta = (customer.metadata || {}) as Record<string, any>;
    const existingAssortments = cleanUserAssortments(existingMeta.savedAssortments || []);
    const remaining = existingAssortments.filter((a) => a.id !== id);

    const updatedMeta = {
      ...existingMeta,
      savedAssortments: remaining,
    };

    await supabase
      .from('ecommerce_customers')
      .update({
        metadata: updatedMeta,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', customer.id);

    if (user?.id) {
      try {
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            savedAssortments: remaining,
          },
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      assortments: remaining,
    });
  } catch (err: any) {
    console.error('Failed to delete wholesale assortment:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
