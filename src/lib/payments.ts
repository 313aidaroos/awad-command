// TODO: stripe package missing from npm install (timed out). Temporarily disabled.
// import Stripe from "stripe";
import { z } from "zod";
import { isLeadOwner } from "@/lib/leadOwner";
import { createServiceSupabase } from "@/lib/supabase/service";
export const PaymentRequestSchema = z.object({
  merchant: z.string().trim().min(1).max(160),
  purpose: z.string().trim().min(3).max(2000),
  amountCents: z.number().int().positive().max(100000000),
  currency: z.literal("usd"),
  url: z
    .string()
    .url()
    .refine((value) => {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    })
    .optional(),
});
async function ownerDb() {
  if (!(await isLeadOwner())) throw new Error("Owner sign-in required.");
  const db = createServiceSupabase();
  if (!db) throw new Error("Payments storage unavailable.");
  return db;
}
export async function requestPayment(input: unknown) {
  const parsed = PaymentRequestSchema.parse(input),
    db = await ownerDb();
  const r = await db
    .from("payment_requests")
    .insert({
      merchant: parsed.merchant,
      purpose: parsed.purpose,
      amount_cents: parsed.amountCents,
      currency: parsed.currency,
      checkout_url: parsed.url ?? null,
    })
    .select("id")
    .single();
  if (r.error) throw new Error("Could not save payment request.");
  return {
    requestId: r.data.id,
    status: "pending",
    reviewUrl: "/payments",
    paid: false,
  };
}
export async function listPaymentRequests() {
  const db = await ownerDb();
  const r = await db
    .from("payment_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (r.error) throw new Error("Payment requests unavailable.");
  return r.data;
}
export async function decidePayment(
  id: string,
  decision: "approved" | "declined",
) {
  z.string().uuid().parse(id);
  const db = await ownerDb();
  const r = await db
    .from("payment_requests")
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (r.error || !r.data)
    throw new Error("Request was not updated; refresh its status.");
  return {
    status: decision,
    paid: false,
    message:
      decision === "approved"
        ? "Approved for manual checkout. No card was charged."
        : "Request declined.",
  };
}
export function chicagoDayStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const field = (name: string) =>
    Number(parts.find((p) => p.type === name)?.value);
  const wall = Date.UTC(field("year"), field("month") - 1, field("day"));
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const offset =
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        timeZoneName: "shortOffset",
      })
        .formatToParts(new Date(guess))
        .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const match = offset.match(/GMT([+-])(\d+)(?::(\d+))?/);
    const minutes = match
      ? (match[1] === "-" ? -1 : 1) *
        (Number(match[2]) * 60 + Number(match[3] ?? 0))
      : 0;
    guess = wall - minutes * 60000;
  }
  return Math.floor(guess / 1000);
}
export async function stripeSummary() {
  if (!(await isLeadOwner())) throw new Error("Owner sign-in required.");
  // TODO: stripe package missing. Returning stub.
  return { connected: false, notice: "Stripe connection unavailable (package not installed)." };
  /*
  const key = process.env.STRIPE_READONLY_KEY || process.env.STRIPE_SECRET_KEY;
  if (!key) return { connected: false, notice: "Stripe connection missing." };
  const stripe = new Stripe(key, { maxNetworkRetries: 1, timeout: 12000 }),
    since = chicagoDayStart();
  const [account, balance, charges, refunds] = await Promise.all([
    stripe.accounts.retrieve(null),
    stripe.balance.retrieve(),
    stripe.charges
      .list({ created: { gte: since }, limit: 100 })
      .autoPagingToArray({ limit: 1000 }),
    stripe.refunds
      .list({ created: { gte: since }, limit: 100 })
      .autoPagingToArray({ limit: 1000 }),
  ]);
  const truncated = charges.length >= 1000 || refunds.length >= 1000;
  const totals: Record<
    string,
    { payments: number; refunds: number; afterRefunds: number }
  > = {};
  for (const charge of charges) {
    if (!charge.paid || charge.status !== "succeeded" || !charge.captured)
      continue;
    totals[charge.currency] ??= { payments: 0, refunds: 0, afterRefunds: 0 };
    totals[charge.currency].payments += charge.amount_captured;
  }
  for (const refund of refunds) {
    if (refund.status !== "succeeded") continue;
    totals[refund.currency] ??= { payments: 0, refunds: 0, afterRefunds: 0 };
    totals[refund.currency].refunds += refund.amount;
  }
  for (const t of Object.values(totals))
    t.afterRefunds = t.payments - t.refunds;
  return {
    connected: true,
    account: account.business_profile?.name || account.id,
    live: balance.livemode,
    since: new Date(since * 1000).toISOString(),
    timeZone: "America/Chicago",
    truncated,
    totals: truncated ? null : totals,
    available: balance.available.map((b) => ({
      currency: b.currency,
      amount: b.amount,
    })),
    pending: balance.pending.map((b) => ({
      currency: b.currency,
      amount: b.amount,
    })),
    notice:
      "One connected Stripe account. Payments are captured charges created today; refunds are refunds created today. These figures exclude fees and other business expenses and are not profit.",
  };
  */
}
