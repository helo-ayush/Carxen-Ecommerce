import { NextResponse } from 'next/server';
import { getPostgresPool } from '@/lib/server/pg-supabase-adapter';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!trimmedEmail || typeof password !== 'string' || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
      const pool = getPostgresPool();

      // Find user and verify encrypted password using pgcrypto
      const res = await pool.query(
        `SELECT id, email, raw_user_meta_data 
         FROM auth.users 
         WHERE LOWER(email) = LOWER($1) 
           AND encrypted_password = extensions.crypt($2, encrypted_password)
         LIMIT 1`,
        [trimmedEmail, password]
      );

      if (res.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid email or password.' },
          { status: 401 }
        );
      }

      const userRow = res.rows[0];
      const meta = userRow.raw_user_meta_data || {};
      const fullName = meta.full_name || meta.name || 'Driver';

      // Update last_sign_in_at
      try {
        await pool.query(
          'UPDATE auth.users SET last_sign_in_at = now() WHERE id = $1',
          [userRow.id]
        );
      } catch {}

      return NextResponse.json({
        success: true,
        user: {
          id: userRow.id,
          email: userRow.email,
          name: fullName,
          fullName,
        },
        token: userRow.id, // User ID acts as session token for direct DB auth
      });
    }

    return NextResponse.json(
      { error: 'Database is not configured.' },
      { status: 500 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error during login.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

