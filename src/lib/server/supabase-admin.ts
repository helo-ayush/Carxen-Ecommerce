import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createPostgresSupabaseAdapter } from './pg-supabase-adapter';

let cachedClient: any = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  // 1. Direct PostgreSQL connection via DATABASE_URL or DIRECT_URL takes highest priority
  if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
    cachedClient = createPostgresSupabaseAdapter() as unknown as SupabaseClient;
    return cachedClient;
  }

  // 2. Fallback to Supabase HTTP REST API client
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  if (!supabaseUrl || !secretKey) {
    throw new Error('Database credentials are not configured. Set DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.');
  }

  cachedClient = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return cachedClient;
}
