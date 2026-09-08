import { createBrowserClient } from '@supabase/ssr';
import { AWAD_COMMAND_SCHEMA, supabaseAnonKey, supabaseUrl } from '@/lib/env';

export function createBrowserSupabase() {
  const url = supabaseUrl();
  const anon = supabaseAnonKey();
  if (!url || !anon) return null;
  return createBrowserClient(url, anon, {
    db: { schema: AWAD_COMMAND_SCHEMA },
  });
}
