"use server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { isOwnerEmail } from "@/lib/env";
import { resendRequest } from "@/lib/cixyEmail";
import { redirect } from "next/navigation";

const CALLBACK_URL = "https://awad-command.vercel.app/auth/callback";

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

async function ensureOwnerUser(
  admin: NonNullable<ReturnType<typeof createServiceSupabase>>,
  email: string,
) {
  const generated = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: CALLBACK_URL },
  });
  if (!generated.error) return generated;
  const message = generated.error.message?.toLowerCase() ?? "";
  if (!message.includes("user") && generated.error.status !== 404) {
    return generated;
  }
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (created.error) return generated;
  return admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: CALLBACK_URL },
  });
}

export async function sendMagicLink(
  email: string,
): Promise<{ error?: string }> {
  if (!isOwnerEmail(email)) return { error: "This command center is private." };
  const normalizedEmail = email.trim().toLowerCase();
  const admin = createServiceSupabase();
  if (!admin)
    return {
      error:
        "The private login connection is not configured in this deployment.",
    };

  const generated = await ensureOwnerUser(admin, normalizedEmail);
  const hashed = generated.data?.properties?.hashed_token;
  const link = hashed
    ? `${CALLBACK_URL}?token_hash=${encodeURIComponent(hashed)}&type=magiclink`
    : generated.data?.properties?.action_link;

  if (link && !generated.error && process.env.RESEND_API_KEY) {
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
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : "The email service could not send your link.";
      return { error: detail };
    }
  }

  if (generated.error && process.env.RESEND_API_KEY) {
    return {
      error:
        "Could not create a sign-in link for this owner email. Confirm the account exists in Supabase Auth.",
    };
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
      shouldCreateUser: true,
      emailRedirectTo: CALLBACK_URL,
    },
  });
  return error
    ? {
        error:
          error.code === "over_email_send_rate_limit"
            ? "The email service has reached its sending limit. Please wait before retrying."
            : error.code === "email_address_not_authorized"
              ? "The sign-in email service has not authorized this recipient. Verify the Resend domain and API key."
              : error.message ||
                "The email service could not send your link. Please try again later.",
      }
    : {};
}
