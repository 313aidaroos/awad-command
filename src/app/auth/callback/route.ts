import { allowedEmail } from "@/lib/env";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;
  if (code) {
    const supabase = await createServerSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (
        error ||
        data.user?.email?.toLowerCase() !== allowedEmail().toLowerCase()
      ) {
        await supabase.auth.signOut({ scope: "local" });
        return NextResponse.redirect(new URL("/login", origin));
      }
    }
  }
  return NextResponse.redirect(new URL("/", origin));
}
