/**
 * Email alerts to the owner (Awad asked for all four, 2026-10-02):
 *  - every robot buy/sell fill (paper + real money; tests excluded),
 *  - every team meeting's opening report,
 *  - each team's start-of-day report (00:05 UTC cron).
 * Never throws: an email failure is logged as an event and the robot carries on.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resendRequest } from "@/lib/cixyEmail";
import { reportRecipient } from "./dailyReport";
import { EventLog } from "./events";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function alertsEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (env.CRYPTO_FLOOR_EMAIL_ALERTS ?? "on").trim().toLowerCase() !== "off";
}

export async function sendFloorEmail(
  db: SupabaseClient | null,
  msg: { subject: string; lines: string[]; key: string; site?: string },
): Promise<boolean> {
  if (!alertsEnabled() || !process.env.RESEND_API_KEY) return false;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://awad-command.vercel.app").replace(/\/$/, "");
  const text = [...msg.lines, "", `Open the floor: ${site}/crypto-floor`].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#030910;color:#e6f3ff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:18px"><div style="font-size:11px;letter-spacing:2px;color:#42d5ff">AWAD COMMAND · THE CRYPTO FLOOR</div><h2 style="margin:6px 0 10px;font-size:18px">${esc(msg.subject)}</h2>${msg.lines.map((l) => `<p style="margin:0 0 6px;white-space:pre-wrap">${esc(l)}</p>`).join("")}<p style="margin-top:14px"><a href="${esc(site)}/crypto-floor" style="color:#42d5ff">Open the Crypto Floor</a></p></div></body></html>`;
  try {
    await resendRequest("/emails", {
      method: "POST",
      headers: { "Idempotency-Key": msg.key.slice(0, 250) },
      body: JSON.stringify({
        from: process.env.CRYPTO_FLOOR_EMAIL_FROM?.trim() || "AWAD COMMAND Crypto Floor <awad@apixis.dev>",
        to: [reportRecipient()],
        subject: msg.subject.slice(0, 240),
        text,
        html,
      }),
    });
    return true;
  } catch (err) {
    if (db) await new EventLog(db).log({ type: "system", agentRole: "system", title: `Email alert failed (${msg.subject.slice(0, 80)}): ${err instanceof Error ? err.message.slice(0, 200) : "error"}` });
    return false;
  }
}

/** One email per filled robot order (idempotent per order). */
export async function tradeAlert(
  db: SupabaseClient,
  o: { clientOrderId: string; desk: string | null; side: "buy" | "sell"; symbol: string; qty: number; price: number | null; reason: string | null; live: boolean; agent?: string | null },
) {
  const coin = o.symbol.split("/")[0];
  const usd = o.price ? o.qty * o.price : null;
  const team = (o.desk ?? "floor").toUpperCase();
  const verb = o.side === "buy" ? "BOUGHT" : "SOLD";
  const money = usd === null ? "" : ` · $${usd.toFixed(2)}`;
  const price = o.price === null ? "market" : o.price < 0.01 ? `$${o.price.toPrecision(4)}` : `$${o.price.toFixed(2)}`;
  await sendFloorEmail(db, {
    subject: `${o.live ? "REAL MONEY · " : ""}${team} ${verb} ${coin}${money}`,
    lines: [
      `${team}${o.agent ? ` (${o.agent})` : ""} ${verb.toLowerCase()} ${o.qty.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${coin} at ${price}${money}.`,
      o.side === "buy" ? `Why: ${o.reason ?? "strategy signal"}` : `Exit: ${o.reason ?? "strategy exit"}`,
      o.live ? "This was REAL MONEY on Coinbase." : "Paper money (Alpaca paper account).",
    ],
    key: `cf-trade-${o.clientOrderId}`,
  });
}
