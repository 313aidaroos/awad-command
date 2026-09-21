"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/landing/AppShell";
import { formatIxis } from "@/lib/ixis";
import { Metric } from "@/ui/Metric";
import { useWalletDeepLink } from "@/ui/useWalletDeepLink";
import { Coins } from "lucide-react";

type Balance = { available: true; ixis: number } | { available: false };

export function WalletRoom({ commandOrigin }: { commandOrigin: string }) {
  const href = useWalletDeepLink(commandOrigin);
  const [balance, setBalance] = useState<Balance | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/wallet/balance", { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as {
          available?: unknown;
          ixis?: unknown;
        } | null;
        if (!live) return;
        if (
          res.ok &&
          body?.available === true &&
          typeof body.ixis === "number" &&
          Number.isFinite(body.ixis)
        ) {
          setBalance({ available: true, ixis: body.ixis });
        } else {
          setBalance({ available: false });
        }
      })
      .catch(() => {
        if (live) setBalance({ available: false });
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <AppShell headquarters>
      {() => (
        <section className="mx-auto max-w-3xl px-4 py-8 text-slate-200">
          <p className="text-xs tracking-[.25em] text-amber-200">
            AWAD COMMAND / CASH REGISTER
          </p>
          <h1 className="mt-3 font-serif text-4xl text-amber-100">
            APIXIS WALLET
          </h1>
          <p className="mt-3 max-w-xl text-slate-400">
            Family store. Every apple redeems Ixis here. No second checkout.
          </p>
          <dl className="mt-8 grid gap-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <dt className="text-slate-500">Peg</dt>
              <dd>100 Ixis = $1</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <dt className="text-slate-500">Packs</dt>
              <dd>Starter $100 · Studio $500 · Empire $1,500</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <dt className="text-slate-500">Unit</dt>
              <dd>Files / skins / site packs = 1,000 Ixis ($10)</dd>
            </div>
          </dl>
          {balance?.available ? (
            <p className="mt-8 text-sm text-slate-300">
              Available <Metric value={formatIxis(balance.ixis)} />
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-sm font-medium text-slate-950"
            >
              <Coins size={16} /> Buy Ixis
            </a>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm text-amber-100"
            >
              {balance?.available ? "Wallet" : "Open Wallet"}
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Stripe keys still live only on the Wallet project. Command does not
            take cards.
          </p>
        </section>
      )}
    </AppShell>
  );
}
