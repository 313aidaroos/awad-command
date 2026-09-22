"use client";
import { AppShell } from "@/landing/AppShell";
import { buyIxisUrl } from "@/lib/apixis-wallet";
import { Coins } from "lucide-react";

export function WalletRoom({ commandOrigin }: { commandOrigin: string }) {
  const buyUrl = buyIxisUrl("command", `${commandOrigin}/wallet`);
  const walletUrl = process.env.NEXT_PUBLIC_WALLET_URL ?? "https://apixis-wallet.vercel.app";

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
            Your balance and purchase history live in Apixis Wallet. Redeem Ixis inside Command for features.
          </p>
        </section>
      )}
    </AppShell>
  );
}
