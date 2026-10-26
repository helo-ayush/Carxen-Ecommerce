import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

const STORE_SLUG = process.env.NEXT_PUBLIC_ECOMMERCE_STORE_SLUG?.trim() || 'carxen';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null) as
    | { name?: unknown; email?: unknown; message?: unknown; company?: unknown }
    | null;

  if (!payload) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Honeypot: real customers never fill this hidden field.
  if (String(payload.company ?? '').trim()) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const name = String(payload.name ?? '').trim();
  const email = String(payload.email ?? '').trim().toLowerCase();
  const message = String(payload.message ?? '').trim();

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: 'Enter your name (2–80 characters).' }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 160) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (message.length < 10 || message.length > 2000) {
    return NextResponse.json({ error: 'Describe your query in 10–2000 characters.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: store } = await supabase
    .from('ecommerce_stores')
    .select('id, factoryId')
    .eq('slug', STORE_SLUG)
    .eq('isPublic', true)
    .eq('status', 'PUBLISHED')
    .maybeSingle();

  if (!store) {
    return NextResponse.json({ error: 'Support is unavailable right now.' }, { status: 503 });
  }

  // A repeated submit (double click or retry) within a minute is treated as the
  // same request instead of creating a duplicate ticket.
  const since = new Date(Date.now() - 60_000).toISOString();
  const { data: duplicate } = await supabase
    .from('ecommerce_support_requests')
    .select('id')
    .eq('storeId', store.id)
    .eq('email', email)
    .eq('message', message)
    .gte('createdAt', since)
    .limit(1);

  if (duplicate && duplicate.length > 0) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('ecommerce_support_requests').insert({
    id: crypto.randomUUID(),
    storeId: store.id,
    factoryId: store.factoryId,
    name,
    email,
    message,
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
  });

  if (error) {
    return NextResponse.json({ error: 'Could not send your request. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
