import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin Client
 * Uses service_role key for server-side operations
 * Has full read/write access regardless of RLS policies
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);
