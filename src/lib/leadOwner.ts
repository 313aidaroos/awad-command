import { createServerSupabase } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/env";
export async function isLeadOwner() {
  const auth = await createServerSupabase();
  if (!auth) return false;
  const {
    data: { user },
  } = await auth.auth.getUser();
  return !!user && isOwnerEmail(user.email);
}
