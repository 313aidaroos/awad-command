"use server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { isOwnerEmail } from "@/lib/env";
import { resendRequest } from "@/lib/cixyEmail";
import { redirect } from "next/navigation";
export async function signInOwner(
  email: string,
  password: string,
): Promise<{ error?: string }> {
  if (!isOwnerEmail(email) || !password || password.length > 1024)
    return { error: "Invalid email or password." };
  const db = await createServerSupabase();
  if (!db)
    return {
      error:
        "The private login connection is not configured in this deployment.",
    };
  const { data, error } = await db.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !isOwnerEmail(data.user?.email))
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
  if (!isOwnerEmail(email)) return { error: "This command center is private." };
  const normalizedEmail = email.trim().toLowerCase();
  const admin = createServiceSupabase();
  if (admin && process.env.RESEND_API_KEY) {
    const generated = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        redirectTo: "https://awad-command.vercel.app/auth/callback",
      },
    });
    const link = generated.data.properties?.action_link;
    if (link && !generated.error) {
      try {
        await resendRequest("/emails", {
          method: "POST",
          body: JSON.stringify({
            from: "AWAD COMMAND <awad@apixis.dev>",
            reply_to: "awad@apixis.dev",
            to: [normalizedEmail],
            subject: "Your private AWAD COMMAND sign-in link",
            text: `Use this private one-time link to enter AWAD COMMAND:\n\n${link}\n\nIf you did not request this, ignore this email.`,
          }),
        });
        return {};
      } catch {
        // Fall back to Supabase's configured mailer below.
      }
    }
  }
  const db = await createServerSupabase();
  if (!db)
    return {
      error:
        "The private login connection is not configured in this deployment.",
    };
  const { error } = await db.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: "https://awad-command.vercel.app/auth/callback",
    },
  });
  return error
    ? {
        error:
          error.code === "over_email_send_rate_limit"
            ? "The email service has reached its sending limit. Please wait before retrying."
            : error.code === "email_address_not_authorized"
              ? "The sign-in email service has not authorized this recipient. Its sending configuration needs to be fixed."
              : "The email service could not send your link. Please try again later.",
      }
    : {};
}
