"use client";

import Link from "next/link";
import { AppShell } from "@/landing/AppShell";
import { QuickCommands } from "@/landing/Panels";
import { RetroPanel } from "@/landing/primitives";

export default function Page() {
  return (
    <AppShell>
      {(d) => (
        <div className="space-y-4">
          <h1 className="font-display text-[14px]">SETTINGS</h1>
          <Link href="/payments" className="block text-cyan-300">
            PAYMENTS, WALLET & STRIPE →
          </Link>
          <Link href="/settings/security" className="block text-amber-200">
            OWNER LOGIN & PASSWORD →
          </Link>
          <p className="text-[12px] text-[var(--muted)]">
            Owner/admin and access.
          </p>
          <Link href="/agents" className="block text-cyan-300">
            MANAGE BUSINESS TEAMS & SPECIALIST BRIEFS →
          </Link>
          <Link href="/email" className="block text-cyan-300">
            CIXY MAILROOM →
          </Link>
          <div className="grid gap-4 lg:grid-cols-3">
            <RetroPanel title="ACCOUNT">
              <p className="text-[12px]">
                Owner / admin: {d.mission?.ownerAdminEmail ?? "awad@apixis.dev"}
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Support intake command@apixis.dev → owner.
              </p>
            </RetroPanel>
            <QuickCommands />
          </div>
        </div>
      )}
    </AppShell>
  );
}
