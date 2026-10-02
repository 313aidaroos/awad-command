import { createServerSupabase } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/env";

/** Signed-in owner's email, or null. Server routes only. */
export async function ownerEmail(): Promise<string | null> {
  const auth = await createServerSupabase();
  if (!auth) return null;
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user && isOwnerEmail(user.email) ? (user.email ?? "owner") : null;
}

/** Same-origin check for owner POSTs (CSRF). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
