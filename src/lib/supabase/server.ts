import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AWAD_COMMAND_SCHEMA, supabaseAnonKey, supabaseUrl } from '@/lib/env';

export async function createServerSupabase() {
  const url = supabaseUrl();
  const anon = supabaseAnonKey();
  if (!url || !anon) return null;
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    db: { schema: AWAD_COMMAND_SCHEMA },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
