"use server";
import { isLeadOwner } from "@/lib/leadOwner";
import { createServerSupabase } from "@/lib/supabase/server";
export async function saveOwnerPassword(password: string) {
  if (!(await isLeadOwner())) return { error: "Owner sign-in required." };
  if (password.length < 12 || password.length > 128)
    return { error: "Use a password between 12 and 128 characters." };
  const db = await createServerSupabase();
  if (!db) return { error: "Account service unavailable." };
  const { error } = await db.auth.updateUser({ password });
  return error
    ? {
        error:
          "Password could not be updated. Your account may require recent sign-in or a stronger password.",
      }
    : { saved: true };
}
