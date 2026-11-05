import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { getAuthenticatedCustomer } from '@/lib/server/customer';
import { getPostgresPool } from '@/lib/server/pg-supabase-adapter';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { user: authUser } = await getAuthenticatedCustomer(request);

    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'You must be signed in to change your password.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body || {};

    if (typeof currentPassword !== 'string' || !currentPassword.trim()) {
      return NextResponse.json(
        { error: 'Current password is required to verify your identity.' },
        { status: 400 }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password cannot be the same as your current password.' },
        { status: 400 }
      );
    }

    // 1. Direct PostgreSQL authentication check (Highest accuracy & security)
    if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
      const pool = getPostgresPool();

      // Verify current password against encrypted_password hash using pgcrypto crypt
      const verifyRes = await pool.query(
        `SELECT id, email, encrypted_password 
         FROM auth.users 
         WHERE id = $1 
           AND encrypted_password = extensions.crypt($2, encrypted_password)
         LIMIT 1`,
        [authUser.id, currentPassword]
      );

      if (verifyRes.rows.length === 0) {
        return NextResponse.json(
          { error: 'Current password is incorrect. Please try again.' },
          { status: 400 }
        );
      }

      // Update password hash with blowfish salt
      await pool.query(
        `UPDATE auth.users 
         SET encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')),
             updated_at = now()
         WHERE id = $2`,
        [newPassword, authUser.id]
      );

      // Keep Supabase Auth in sync if admin client exists
      try {
        const supabase = getSupabaseAdmin();
        await supabase.auth.admin.updateUserById(authUser.id, {
          password: newPassword,
        });
      } catch (adminErr) {
        console.warn('Supabase admin updateUserById sync warning:', adminErr);
      }

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully.',
      });
    }

    // 2. Fallback via Supabase Auth API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (supabaseUrl && anonKey && authUser.email) {
      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error: signInError } = await authClient.auth.signInWithPassword({
        email: authUser.email,
        password: currentPassword,
      });

      if (signInError) {
        return NextResponse.json(
          { error: 'Current password is incorrect. Please try again.' },
          { status: 400 }
        );
      }

      const supabaseAdmin = getSupabaseAdmin();
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: newPassword,
      });

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully.',
      });
    }

    return NextResponse.json(
      { error: 'Authentication service is unavailable. Please try again later.' },
      { status: 500 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update password';
    console.error('Password update error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
