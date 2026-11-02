import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPostgresPool } from '@/lib/server/pg-supabase-adapter';

const STORE_SLUG = process.env.NEXT_PUBLIC_ECOMMERCE_STORE_SLUG?.trim() || 'carxen';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body || {};

    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedName = typeof fullName === 'string' ? fullName.trim() : 'Driver';

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 1. Direct PostgreSQL implementation using DATABASE_URL (Highest Priority)
    if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
      const pool = getPostgresPool();

      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [trimmedEmail]
      );

      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in.' },
          { status: 409 }
        );
      }

      // Insert new user into auth.users using pgcrypto bcrypt
      const insertUserRes = await pool.query(
        `INSERT INTO auth.users (
          id,
          instance_id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          '00000000-0000-0000-0000-000000000000',
          'authenticated',
          'authenticated',
          $1,
          extensions.crypt($2, extensions.gen_salt('bf')),
          now(),
          '{"provider":"email","providers":["email"]}',
          $3,
          now(),
          now()
        ) RETURNING id, email`,
        [trimmedEmail, password, JSON.stringify({ full_name: trimmedName })]
      );

      const newUser = insertUserRes.rows[0];

      // Resolve store and factory
      let storeId = 'store_carxen';
      let factoryId = 'fac_demo';
      try {
        const storeRes = await pool.query(
          'SELECT id, "factoryId" FROM ecommerce_stores WHERE slug = $1 LIMIT 1',
          [STORE_SLUG]
        );
        if (storeRes.rows[0]) {
          storeId = storeRes.rows[0].id;
          factoryId = storeRes.rows[0].factoryId || factoryId;
        }
      } catch {}

      // Create matching ecommerce_customers row
      try {
        await pool.query(
          `INSERT INTO ecommerce_customers (
            id,
            "storeId",
            "factoryId",
            "authUserId",
            name,
            email,
            status,
            metadata,
            "createdAt",
            "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'ACTIVE', '{}', now(), now()
          ) ON CONFLICT DO NOTHING`,
          [
            'cust_' + newUser.id.replace(/-/g, '').slice(0, 20),
            storeId,
            factoryId,
            newUser.id,
            trimmedName,
            trimmedEmail,
          ]
        );
      } catch (custErr) {
        console.warn('Could not insert customer record:', custErr);
      }

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: trimmedName,
        },
      });
    }

    // 2. Fallback to Supabase HTTP Admin API if secretKey exists
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !secretKey) {
      return NextResponse.json(
        { error: 'Database credentials are not configured. Set DATABASE_URL.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: trimmedName },
    });

    if (error) {
      if (
        error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already exists')
      ) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: trimmedName,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error occurred during sign up.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
