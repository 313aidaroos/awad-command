'use server';

import { createServerSupabase } from '@/lib/supabase/server';

export async function sendMagicLink(email: string): Promise<{ error?: string }> {
  const allowed = (await import('@/lib/env')).allowedEmail().toLowerCase().trim();
  if (!allowed || email.toLowerCase().trim() !== allowed) {
    return { error: 'This command center is private.' };
  }
  const supabase = await createServerSupabase();
  if (!supabase) return { error: 'Auth is not configured.' };
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:43180';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };
  return {};
}
