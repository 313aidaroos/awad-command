"use client";
import { useEffect, useMemo, useState } from "react";
import { Coins, RefreshCw } from "lucide-react";
import { AppShell } from "@/landing/AppShell";
import { walletAppOrigin, walletBuyUrl } from "@/lib/walletEmbed";
import { compact, money, relativeTime } from "@/lib/format";
import type {
  WalletSummary,
  WalletSummaryDay,
  WalletSummaryResult,
} from "@/lib/walletStats";

const RANGES = [
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
  { days: 365, label: "1Y" },
] as const;
const POLL_MS = 20_000;

const TYPE_LABEL: Record<string, string> = {
  purchase: "Bought Ixis",
  refund: "Refund",
  dispute_lost: "Chargeback lost",
  capture: "Redeemed",
  redeem: "Redeemed in Wallet",
};

function usd(cents: number) {
  return money(cents / 100);
}

function useWalletSummary(days: number) {
  const [result, setResult] = useState<WalletSummaryResult | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    async function pull() {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch(`/api/wallet/summary?days=${days}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await res.json()) as WalletSummaryResult & { error?: string };
        if (!live) return;
        setResult(
          res.ok ? body : { available: false, reason: body.error ?? `HTTP ${res.status}` },
        );
        setFetchedAt(Date.now());
      } catch {
        if (live && !controller.signal.aborted)
          setResult({ available: false, reason: "COMMAND could not reach its Wallet route." });
      }
    }
    void pull();
    const id = window.setInterval(() => void pull(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void pull();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      controller.abort();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [days, tick]);
  return { result, fetchedAt, refresh: () => setTick((n) => n + 1) };
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="text-[10px] tracking-[.2em] text-slate-500">{label}</div>
      <div className="mt-1 font-serif text-2xl text-amber-100">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

/** Daily cash-in area chart with hover readout. Plain SVG, no chart library. */
function CashChart({ series }: { series: WalletSummaryDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = 180;
  const values = series.map((d) => (d.cashInCents - d.refundCents) / 100);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const x = (i: number) => (series.length < 2 ? W / 2 : (i / (series.length - 1)) * W);
  const y = (v: number) => H - ((v - min) / (max - min || 1)) * (H - 12) - 6;
  const line = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `0,${y(0)} ${line} ${W},${y(0)}`;
  const point = hover === null ? null : series[hover];
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-48 w-full"
        role="img"
        aria-label="Daily net cash in"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - box.left) / box.width) * (series.length - 1));
          setHover(Math.max(0, Math.min(series.length - 1, i)));
        }}
      >
        <defs>
          <linearGradient id="wallet-cash" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fcd34d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,.12)" />
        <polygon points={area} fill="url(#wallet-cash)" />
        <polyline
          points={line}
          fill="none"
          stroke="#fcd34d"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1="0"
            y2={H}
            stroke="rgba(255,255,255,.3)"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>{series[0]?.day}</span>
        <span>{series.at(-1)?.day}</span>
      </div>
      {point && (
        <div className="pointer-events-none absolute right-2 top-2 rounded-lg border border-white/10 bg-slate-950/90 px-3 py-2 text-xs">
          <div className="text-slate-400">{point.day}</div>
          <div className="text-amber-100">Cash in {usd(point.cashInCents)}</div>
          {point.refundCents > 0 && <div className="text-rose-300">Refunds {usd(point.refundCents)}</div>}
          <div className="text-slate-300">
            {point.purchases} purchases · {point.redemptions} redemptions
          </div>
        </div>
      )}
    </div>
  );
}

/** Ixis sold vs redeemed per day. */
function IxisBars({ series }: { series: WalletSummaryDay[] }) {
  const max = Math.max(1, ...series.flatMap((d) => [d.ixisSold, d.ixisRedeemed]));
  return (
    <div className="flex h-28 items-end gap-[2px]" role="img" aria-label="Ixis sold vs redeemed per day">
      {series.map((d) => (
        <div
          key={d.day}
          className="flex h-full flex-1 items-end gap-[1px]"
          title={`${d.day}: sold ${d.ixisSold.toLocaleString()} · redeemed ${d.ixisRedeemed.toLocaleString()} Ixis`}
        >
          <div className="flex-1 rounded-t bg-amber-300/80" style={{ height: `${(d.ixisSold / max) * 100}%` }} />
          <div className="flex-1 rounded-t bg-cyan-300/80" style={{ height: `${(d.ixisRedeemed / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

function Dashboard({ summary }: { summary: WalletSummary }) {
  const t = summary.totals;
  const today = summary.series.at(-1);
  const topApp = Math.max(1, ...summary.byApp.map((a) => a.ixisRedeemed));
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="CASH IN" value={usd(t.cashInCents)} hint={`${t.purchases} purchases`} />
        <Kpi label="NET AFTER REFUNDS" value={usd(t.netCashCents)} hint={t.refundCents ? `${usd(t.refundCents)} refunded` : "No refunds"} />
        <Kpi label="TODAY" value={usd(today?.cashInCents ?? 0)} hint={`${today?.redemptions ?? 0} redemptions today`} />
        <Kpi label="ACTIVE SUBSCRIPTIONS" value={summary.activeEntitlements === null ? "—" : String(summary.activeEntitlements)} />
        <Kpi label="IXIS SOLD" value={compact(t.ixisSold)} hint={usd(t.ixisSold)} />
        <Kpi label="IXIS REDEEMED" value={compact(t.ixisRedeemed)} hint={`${t.redemptions} redemptions`} />
        <Kpi label="UNSPENT IXIS (OWED)" value={compact(summary.holdings.availableIxis)} hint={`${money(summary.holdings.liabilityUsd)} of service owed`} />
        <Kpi label="CUSTOMERS HOLDING" value={String(summary.holdings.customers)} hint={summary.holdings.reservedIxis ? `${compact(summary.holdings.reservedIxis)} on hold` : undefined} />
      </div>

      <section className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
        <h2 className="text-xs tracking-[.2em] text-slate-400">NET CASH IN PER DAY</h2>
        <CashChart series={summary.series} />
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-black/30 p-4">
          <h2 className="text-xs tracking-[.2em] text-slate-400">IXIS SOLD vs REDEEMED</h2>
          <div className="mb-2 mt-1 flex gap-4 text-[11px] text-slate-400">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-300" />Sold</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-cyan-300" />Redeemed</span>
          </div>
          <IxisBars series={summary.series} />
        </section>
        <section className="rounded-xl border border-white/10 bg-black/30 p-4">
          <h2 className="text-xs tracking-[.2em] text-slate-400">REDEMPTIONS BY SITE</h2>
          {!summary.byApp.length && <p className="mt-3 text-sm text-slate-500">No redemptions in this range.</p>}
          <ul className="mt-3 space-y-2">
            {summary.byApp.map((a) => (
              <li key={a.app} className="text-sm">
                <div className="flex justify-between">
                  <span className="capitalize">{a.app}</span>
                  <span className="text-slate-400">
                    {compact(a.ixisRedeemed)} Ixis · {a.redemptions}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-white/5">
                  <div className="h-1.5 rounded bg-cyan-300/80" style={{ width: `${(a.ixisRedeemed / topApp) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
        <h2 className="text-xs tracking-[.2em] text-slate-400">LIVE ACTIVITY</h2>
        {!summary.recent.length && <p className="mt-3 text-sm text-slate-500">No Wallet activity in this range yet.</p>}
        <ul className="mt-2 divide-y divide-white/5 text-sm">
          {summary.recent.map((r) => (
            <li key={r.reference} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className={r.type === "purchase" ? "text-amber-200" : r.type === "refund" || r.type === "dispute_lost" ? "text-rose-300" : "text-cyan-200"}>
                  {TYPE_LABEL[r.type] ?? r.type}
                </span>
                {r.app && <span className="text-slate-400"> · {r.app}</span>}
                {r.product && <span className="text-slate-500"> · {r.product}</span>}
                {r.email && <span className="block text-xs text-slate-500">{r.email}</span>}
              </span>
              <span className="text-right text-slate-300">
                {r.cents !== null ? usd(Math.abs(r.cents)) : r.ixis !== null ? `${Math.abs(r.ixis).toLocaleString()} Ixis` : ""}
                <span className="block text-xs text-slate-500">
                  {relativeTime(Date.parse(r.at))} ago · {r.reference}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function WalletRoom({ commandOrigin }: { commandOrigin: string }) {
  const [days, setDays] = useState<number>(30);
  const { result, fetchedAt, refresh } = useWalletSummary(days);
  const buyUrl = useMemo(() => walletBuyUrl(commandOrigin), [commandOrigin]);
  const walletUrl = walletAppOrigin();

  return (
    <AppShell headquarters>
      {() => (
        <section className="mx-auto max-w-5xl px-4 py-8 text-slate-200">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[.25em] text-amber-200">AWAD COMMAND / CASH REGISTER</p>
              <h1 className="mt-3 font-serif text-4xl text-amber-100">APIXIS WALLET</h1>
              <p className="mt-2 text-sm text-slate-400">
                Live from the Wallet ledger · 100 Ixis = $1 · all sales final
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div role="tablist" aria-label="Range" className="flex rounded-full border border-white/10 p-1">
                {RANGES.map((r) => (
                  <button
                    key={r.days}
                    role="tab"
                    aria-selected={days === r.days}
                    onClick={() => setDays(r.days)}
                    className={`rounded-full px-3 py-1 text-xs ${days === r.days ? "bg-amber-200 text-slate-950" : "text-slate-300"}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button onClick={refresh} aria-label="Refresh" className="rounded-full border border-white/10 p-2 text-slate-300">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500" role="status">
            {result === null
              ? "Loading Wallet…"
              : result.available
                ? `LIVE · updates every ${POLL_MS / 1000}s · last ${fetchedAt ? relativeTime(fetchedAt) : "—"}`
                : `NOT CONNECTED · ${result.reason}`}
          </p>

          {result?.available ? (
            <Dashboard summary={result.summary} />
          ) : (
            result && (
              <div className="mt-6 rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
                The graph appears once <code>WALLET_STATS_KEY</code> is set to the same value on the
                Wallet and COMMAND Vercel projects. No numbers are shown until then. See
                <code> docs/KEYS_TOMORROW.md</code>.
              </div>
            )
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-sm font-medium text-slate-950"
            >
              <Coins size={16} /> Buy Ixis
            </a>
            <a
              href={walletUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm text-amber-100"
            >
              Open Wallet
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Packs: Spark $10 · Starter $100 · Studio $500 · Empire $1,500. Cash is taken only on Apixis Wallet.
          </p>
        </section>
      )}
    </AppShell>
  );
}
