"use client";
import { useEffect, useState } from "react";
import "@/workforce/teams.css";
type RequestRow = {
  id: string;
  merchant: string;
  purpose: string;
  amount_cents: number;
  currency: string;
  status: string;
  checkout_url: string | null;
};
type StripeView = {
  connected: boolean;
  account?: string;
  live?: boolean;
  notice: string;
  truncated?: boolean;
  totals?: Record<
    string,
    { payments: number; refunds: number; afterRefunds: number }
  > | null;
  available?: { currency: string; amount: number }[];
  pending?: { currency: string; amount: number }[];
};
const amount = (value: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    value /
      (new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits === 0
        ? 1
        : 100),
  );
export function PaymentDesk() {
  const [rows, setRows] = useState<RequestRow[]>([]),
    [stripe, setStripe] = useState<StripeView | null>(null),
    [notice, setNotice] = useState("Loading private payments…"),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/payments", { cache: "no-store", signal: c.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setRows(d.requests);
        setStripe(d.stripe);
        setNotice(
          d.requestsError ??
            "Payment requests require your decision. Approval does not charge a card.",
        );
      })
      .catch((e) => {
        if (!c.signal.aborted) setNotice(e.message);
      });
    return () => c.abort();
  }, [refresh]);
  async function decide(id: string, decision: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decide", id, decision }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setNotice(d.message);
      setRefresh((n) => n + 1);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Decision unconfirmed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="team-desk">
      <header>
        <div>
          <small>CIXY / FINANCE OFFICE</small>
          <h1>PAYMENTS & WALLET</h1>
          <p>Your decisions. Your money. Verified account data.</p>
        </div>
        <button disabled={busy} onClick={() => setRefresh((n) => n + 1)}>
          Refresh
        </button>
      </header>
      <p role="status">{notice}</p>
      <div className="team-connections">
        <h2>Payment method & spending access</h2>
        <p>
          Mode: payment requests you approve. No card or spendable wallet is
          connected to Cixy. Use the merchant’s secure checkout after reviewing
          a request; card details are never stored in this app.
        </p>
        <p>
          Ask Cixy: “Request approval for $25 at [merchant] for [purpose].” She
          will save it here. Approval is recorded here; payment happens
          separately.
        </p>
      </div>
      <div className="team-brief">
        <h2>Stripe · today in Chicago</h2>
        <p>{stripe?.notice ?? "Checking Stripe…"}</p>
        {stripe?.connected && (
          <>
            <p>
              {stripe.account} ·{" "}
              {stripe.live ? "Live account" : "TEST MODE — not real money"}
            </p>
            {stripe.truncated ? (
              <p>
                Too many records to calculate a complete total; open Stripe for
                the full report.
              </p>
            ) : Object.entries(stripe.totals ?? {}).length ? (
              Object.entries(stripe.totals ?? {}).map(([currency, t]) => (
                <p key={currency}>
                  Payments: {amount(t.payments, currency)} · Refunds:{" "}
                  {amount(t.refunds, currency)} · After refunds:{" "}
                  {amount(t.afterRefunds, currency)}
                </p>
              ))
            ) : (
              <p>No captured payments or completed refunds found for today.</p>
            )}
            <h2>Stripe balance</h2>
            {stripe.available?.map((b) => (
              <p key={b.currency}>Available: {amount(b.amount, b.currency)}</p>
            ))}
            {stripe.pending?.map((b) => (
              <p key={b.currency}>Pending: {amount(b.amount, b.currency)}</p>
            ))}
            <p>Stripe balances are not a wallet Cixy can spend.</p>
          </>
        )}
        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Stripe dashboard ↗
        </a>
      </div>
      <h2>Requests awaiting your decision</h2>
      <div className="team-grid">
        {rows.length ? (
          rows.map((r) => (
            <article className="team-agent" key={r.id}>
              <h2>
                {r.merchant} · {amount(r.amount_cents, r.currency)}
              </h2>
              <p>{r.purpose}</p>
              <p>Status: {r.status}</p>
              {r.checkout_url && (
                <p>Merchant checkout: {new URL(r.checkout_url).hostname}</p>
              )}
              {r.status === "pending" && (
                <div className="flex gap-3">
                  <button
                    disabled={busy}
                    onClick={() => decide(r.id, "approved")}
                  >
                    Approve for checkout
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => decide(r.id, "declined")}
                  >
                    Decline
                  </button>
                </div>
              )}
              {r.status === "approved" &&
                (r.checkout_url ? (
                  <a
                    href={r.checkout_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open merchant checkout ↗
                  </a>
                ) : (
                  <p>Open the merchant directly to complete payment.</p>
                ))}
            </article>
          ))
        ) : (
          <p>No payment requests yet.</p>
        )}
      </div>
    </section>
  );
}
