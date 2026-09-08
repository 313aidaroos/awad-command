import { createClient } from '@supabase/supabase-js';
import { AWAD_COMMAND_SCHEMA, supabaseUrl } from '@/lib/env';

/** Service-role client for server routes. Never import from client components. */
export function createServiceSupabase() {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    db: { schema: AWAD_COMMAND_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
