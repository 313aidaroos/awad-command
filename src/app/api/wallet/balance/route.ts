import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { readWalletBalance } from "@/lib/walletEmbed";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** User balance from Wallet. Missing session or a failed read is not a number. */
export async function GET() {
  const auth = await createServerSupabase();
  if (!auth) {
    return NextResponse.json({ available: false }, { headers: noStore });
  }
  const { data: userData } = await auth.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ available: false }, { headers: noStore });
  }
  const { data: sessionData } = await auth.auth.getSession();
  const balance = await readWalletBalance(sessionData.session?.access_token);
  return NextResponse.json(balance, { headers: noStore });
}
