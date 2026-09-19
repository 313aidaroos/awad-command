"use server";
import { createServerSupabase } from "@/lib/supabase/server";
import { allowedEmail } from "@/lib/env";
import { redirect } from "next/navigation";
export async function signInOwner(
  email: string,
  password: string,
): Promise<{ error?: string }> {
  if (
    email.trim().toLowerCase() !== allowedEmail().toLowerCase() ||
    !password ||
    password.length > 1024
  )
    return { error: "Invalid email or password." };
  const db = await createServerSupabase();
  if (!db) return { error: "Private access is temporarily unavailable." };
  const { data, error } = await db.auth.signInWithPassword({
    email: allowedEmail(),
    password,
  });
  if (error || data.user?.email?.toLowerCase() !== allowedEmail().toLowerCase())
    return { error: "Invalid email or password." };
  redirect("/");
}
export async function signOutOwner() {
  const db = await createServerSupabase();
  if (db) await db.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function sendMagicLink(
  email: string,
): Promise<{ error?: string }> {
  if (email.trim().toLowerCase() !== allowedEmail().toLowerCase())
    return { error: "This command center is private." };
  const db = await createServerSupabase();
  if (!db) return { error: "Private access is temporarily unavailable." };
  const { error } = await db.auth.signInWithOtp({
    email: allowedEmail(),
    options: {
      shouldCreateUser: false,
      emailRedirectTo: "https://awad-command.vercel.app/auth/callback",
    },
  });
  return error
    ? {
        error:
          "Could not send the sign-in link. Please wait before trying again.",
      }
    : {};
}
