import { createServerSupabase } from "@/lib/supabase/server";
import { allowedEmail } from "@/lib/env";
export async function isLeadOwner() {
  const auth = await createServerSupabase();
  if (!auth) return false;
  const {
    data: { user },
  } = await auth.auth.getUser();
  return !!user && user.email?.toLowerCase() === allowedEmail().toLowerCase();
}
