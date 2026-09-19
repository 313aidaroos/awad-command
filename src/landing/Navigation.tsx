"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HeadquartersNavigation } from "@/landing/HeadquartersNavigation";
import { PRIMARY_TABS, SIDEBAR_ITEMS } from "@/config/modules";
import { Led, type LedTone } from "@/landing/primitives";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

export function TopNavigation({
  systemTone,
  criticalAlerts,
  headquarters = false,
}: {
  systemTone: LedTone;
  criticalAlerts: number;
  headquarters?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const now = useClock();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");

  const isActive = (route: string) =>
    route === "/" ? path === "/" : path.startsWith(route);

  if (headquarters)
    return (
      <HeadquartersNavigation
        systemTone={systemTone}
        criticalAlerts={criticalAlerts}
      />
    );

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(7,11,15,0.92)] backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <span className="grid h-8 w-8 place-items-center border border-[var(--amber)] text-[var(--amber)]">
            ◈
          </span>
          <span className="leading-tight">
            <span className="font-display block text-[11px] text-[var(--text)]">
              AWAD COMMAND
            </span>
            <span className="block text-[9px] tracking-[0.2em] text-[var(--muted)]">
              BIGGER VISION. SMARTER AGENTS.
            </span>
          </span>
        </Link>

        <form
          className="mx-auto hidden w-full max-w-md items-center gap-2 border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 md:flex"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim())
              router.push(`/projects?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <span className="text-[var(--muted)]">›</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search anything..."
            className="w-full bg-transparent text-[12px] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
            aria-label="Global search"
          />
        </form>

        <div className="ml-auto flex items-center gap-4">
          <span
            className="font-num hidden text-[11px] text-[var(--muted)] lg:block"
            suppressHydrationWarning
          >
            {now
              ? now.toLocaleString([], {
                  weekday: "short",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })
              : "--"}
          </span>
          <Link
            href="/system"
            className="relative text-[var(--muted)] hover:text-[var(--text)]"
            aria-label="Alerts"
          >
            ⚑
            {criticalAlerts > 0 ? (
              <span className="font-num absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center bg-[var(--red)] px-1 text-[9px] text-black">
                {criticalAlerts}
              </span>
            ) : null}
          </Link>
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <Led tone={systemTone} />
            SYS
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              className="flex items-center gap-2 border border-[var(--line)] px-2 py-1 text-left"
            >
              <span className="grid h-6 w-6 place-items-center bg-[var(--panel-2)] text-[10px]">
                A
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-[11px]">Awad</span>
                <span className="block text-[9px] tracking-[0.18em] text-[var(--muted)]">
                  COMMANDER
                </span>
              </span>
            </button>
            {menu ? (
              <div className="retro-panel absolute right-0 mt-1 w-40 p-1 text-[11px]">
                {[
                  ["Profile", "/settings"],
                  ["Settings", "/settings"],
                  ["System", "/system"],
                ].map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setMenu(false)}
                    className="block px-3 py-1.5 hover:bg-[var(--panel-2)]"
                  >
                    {label}
                  </Link>
                ))}
                <form action="/login/signout" method="post">
                  <button
                    type="submit"
                    className="block w-full px-3 py-1.5 text-left text-[var(--red)] hover:bg-[var(--panel-2)]"
                  >
                    Logout
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4">
        {PRIMARY_TABS.map((tab) => (
          <Link
            key={tab.route}
            href={tab.route}
            className={`nav-tab ${isActive(tab.route) ? "active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden w-[190px] shrink-0 border-r border-[var(--line)] lg:block">
      <nav className="sticky top-[92px] flex flex-col py-3">
        {SIDEBAR_ITEMS.map((item) => {
          const active = path.startsWith(item.route);
          return (
            <Link
              key={item.route}
              href={item.route}
              className={`flex items-center gap-3 px-4 py-2 text-[11px] tracking-[0.1em] uppercase ${active ? "text-[var(--amber)] bg-[var(--panel)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
            >
              <span className="w-4 text-center">{item.glyph}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNavigation() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-[var(--line)] bg-[rgba(7,11,15,0.95)] py-2 lg:hidden">
      {SIDEBAR_ITEMS.slice(0, 5).map((item) => (
        <Link
          key={item.route}
          href={item.route}
          className={`flex flex-col items-center text-[9px] uppercase tracking-[0.1em] ${path.startsWith(item.route) ? "text-[var(--amber)]" : "text-[var(--muted)]"}`}
        >
          <span className="text-base">{item.glyph}</span>
          {item.label.split(" ")[0]}
        </Link>
      ))}
    </nav>
  );
}
