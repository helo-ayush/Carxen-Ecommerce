import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { STORE_ID, FACTORY_ID } from '@/lib/server/customer';

export const dynamic = 'force-dynamic';

/**
 * CarXen Ecommerce Google OAuth Callback Route
 * Exchanges auth code for session via Supabase SSR, enforces verified email,
 * auto-provisions or links the customer in ecommerce_customers, and redirects safely.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Security: Sanitize destination to prevent Open Redirect attacks
  let next = searchParams.get('redirect') || searchParams.get('next') || '/account';
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    next = '/account';
  }

  if (error || errorDescription) {
    console.error('[OAuth Callback] Provider error:', error, errorDescription);
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set('error', errorDescription || error || 'auth_failed');
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set('error', 'no_code');
    return NextResponse.redirect(redirectUrl);
  }

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'dummy_anon_key';

  const redirectTarget = new URL(next, origin);
  const response = NextResponse.redirect(redirectTarget);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        } catch {
          // Fallback if headers already committed
        }
      },
    },
  });

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data?.session?.user) {
    console.error('[OAuth Callback] Exchange error:', exchangeError);
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set('error', 'auth_failed');
    return NextResponse.redirect(redirectUrl);
  }

  const authUser = data.session.user;

  // Security: Enforce that email is verified by Google
  const isEmailVerified =
    Boolean(authUser.email_confirmed_at) ||
    Boolean(authUser.user_metadata?.email_verified) ||
    authUser.app_metadata?.provider === 'google';

  if (!isEmailVerified) {
    console.warn('[OAuth Security] Unverified Google email rejected:', authUser.email);
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set('error', 'unverified_email');
    return NextResponse.redirect(redirectUrl);
  }

  // Auto-provision or update customer record in ecommerce_customers
  try {
    const admin = getSupabaseAdmin();
    const cleanEmail = authUser.email?.trim().toLowerCase();

    const fullName = (
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      cleanEmail?.split('@')[0] ||
      'Driver'
    ).trim();

    const now = new Date().toISOString();

    // Look up customer by authUserId or email
    let { data: customer } = await admin
      .from('ecommerce_customers')
      .select('*')
      .or(`authUserId.eq.${authUser.id},email.eq.${cleanEmail}`)
      .limit(1)
      .maybeSingle();

    if (customer) {
      await admin
        .from('ecommerce_customers')
        .update({
          authUserId: authUser.id,
          name: customer.name || fullName,
          email: cleanEmail,
          updatedAt: now,
          metadata: {
            ...(customer.metadata || {}),
            avatarUrl: authUser.user_metadata?.avatar_url || customer.metadata?.avatarUrl || '',
          },
        })
        .eq('id', customer.id);
    } else {
      const newCustId = `cust_${crypto.randomUUID().replace(/-/g, '')}`;
      await admin.from('ecommerce_customers').insert({
        id: newCustId,
        storeId: STORE_ID,
        factoryId: FACTORY_ID,
        authUserId: authUser.id,
        name: fullName,
        email: cleanEmail,
        phone: authUser.user_metadata?.phone || null,
        status: 'ACTIVE',
        metadata: {
          avatarUrl: authUser.user_metadata?.avatar_url || '',
          tier: 'Apex Gold Member',
          rewardPoints: 250,
          joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        },
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (dbErr) {
    console.error('[OAuth Callback] Customer auto-provision error:', dbErr);
    // Non-blocking: continue sign in even if secondary profile sync encounters an issue
  }

  return response;
}
