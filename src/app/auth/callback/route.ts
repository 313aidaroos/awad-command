import { isOwnerEmail } from "@/lib/env";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

const OTP_TYPES: EmailOtpType[] = [
  "magiclink",
  "email",
  "signup",
  "invite",
  "recovery",
  "email_change",
];

function otpType(raw: string | null): EmailOtpType {
  return raw && OTP_TYPES.includes(raw as EmailOtpType)
    ? (raw as EmailOtpType)
    : "magiclink";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const origin = url.origin;
  const login = new URL("/login", origin);
  const supabase = await createServerSupabase();

  if (!supabase) {
    return NextResponse.redirect(login);
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !isOwnerEmail(data.user?.email)) {
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.redirect(login);
    }
    return NextResponse.redirect(new URL("/", origin));
  }

  if (tokenHash) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: otpType(url.searchParams.get("type")),
      token_hash: tokenHash,
    });
    if (error || !isOwnerEmail(data.user?.email)) {
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.redirect(login);
    }
    return NextResponse.redirect(new URL("/", origin));
  }

  return NextResponse.redirect(login);
}
