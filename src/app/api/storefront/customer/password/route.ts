import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return NextResponse.json(
        { error: 'You must be signed in to change your password.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { newPassword } = body || {};

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: 'Authentication session expired. Please log in again.' },
        { status: 401 }
      );
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userData.user.id, {
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update password';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
