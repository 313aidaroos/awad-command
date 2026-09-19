"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Search, ChevronDown } from "lucide-react";
import { MODULES, PRIMARY_TABS, SIDEBAR_ITEMS } from "@/config/modules";
import { Led, type LedTone } from "@/landing/primitives";
export function HeadquartersNavigation({
  systemTone,
  criticalAlerts,
}: {
  systemTone: LedTone;
  criticalAlerts: number;
}) {
  const path = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);
  const results = MODULES.filter((m) =>
    `${m.name} ${m.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <header className="hq-topbar">
      <a className="hq-skip" href="#main-content">
        Skip to content
      </a>
      <Link className="hq-brand" href="/" aria-label="AWAD COMMAND home">
        <span className="hq-brand-mark">Λ</span>
        <span>
          <strong>AWAD COMMAND</strong>
          <small>BIGGER VISION. SMARTER AGENTS.</small>
        </span>
      </Link>
      <nav className="hq-tabs" aria-label="Primary navigation">
        {PRIMARY_TABS.filter((t) => t.label !== "More").map((t) => (
          <Link
            key={t.route}
            href={t.route}
            className={path === t.route ? "active" : ""}
            aria-current={path === t.route ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
        <details className="hq-menu">
          <summary>
            More <ChevronDown size={12} />
          </summary>
          <div>
            {SIDEBAR_ITEMS.map((t) => (
              <Link key={t.route} href={t.route}>
                {t.label}
              </Link>
            ))}
          </div>
        </details>
      </nav>
      <form
        className="hq-search"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim())
            router.push(`/projects?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <Search size={14} />
        <input
          aria-label="Global search"
          placeholder="Search anything…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
          }}
        />
        {query.trim() && (
          <div className="hq-search-results">
            <small>COMPANIES & MODULES</small>
            {results.length ? (
              results.map((m) => (
                <Link key={m.id} href={m.route} onClick={() => setQuery("")}>
                  {m.name} →
                </Link>
              ))
            ) : (
              <p>No matching modules. Press Enter to search Projects.</p>
            )}
          </div>
        )}
      </form>
      <time className="hq-clock">{time || "--:--"}</time>
      <Link
        className="hq-alert"
        href="/system"
        aria-label={`Alerts${criticalAlerts ? `: ${criticalAlerts} critical` : ""}`}
      >
        <Bell size={17} />
        {criticalAlerts > 0 && <span>{criticalAlerts}</span>}
      </Link>
      <details className="hq-menu hq-user">
        <summary>
          <span className="hq-avatar">A</span>
          <span>
            Awad<small>Commander</small>
          </span>
          <ChevronDown size={12} />
        </summary>
        <div>
          <p>
            <Led tone={systemTone} /> System status
          </p>
          <Link href="/settings">Profile & settings</Link>
          <Link href="/system">System</Link>
          <form action="/login/signout" method="post">
            <button type="submit">Logout</button>
          </form>
        </div>
      </details>
    </header>
  );
}
