"use client";
import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Globe2,
  Users,
  RefreshCw,
} from "lucide-react";

import { ArtLoop } from "@/art-motion/ArtLoop";
import { AppShell } from "@/landing/AppShell";
import { MODULES } from "@/config/modules";
import { getProject, projects } from "@/projects/registry";
import type { OpsSnapshot } from "@/headquarters/types";
import "./world.css";
const family = MODULES.filter(
  (m) => m.category === "company" && /xis$/i.test(m.name),
);
const others = [
  "awadbot",
  "qahwahworld",
  "recovra",
  "nursery-toons",
  "content",
  "books",
].map((slug) => MODULES.find((m) => m.slug === slug)!);
const studio = projects.find((p) => p.slug === "studios")!;
const companies = [
  ...family,
  ...others,
  {
    slug: studio.slug,
    name: studio.name,
    description: studio.tagline,
    route: "/projects/studios",
    accent: studio.accent,
    glyph: "▣",
  },
];
const projectFor = (slug: string) =>
  getProject(slug === "books" ? "publishing" : slug);
const artIndex = (slug: string) => companies.findIndex((m) => m.slug === slug);
function Office({
  index,
  large = false,
  paused = false,
}: {
  index: number;
  large?: boolean;
  paused?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`world-office ${large ? "large" : ""}`}
      style={{
        backgroundImage: `url('/business-world/${index < 8 ? "offices" : "more-offices"}.png')`,
        backgroundPosition: `${((index % 4) * 100) / 3}% ${Math.floor((index % 8) / 4) * 100}%`,
      }}
    >
      {
        <ArtLoop
          src={`/business-world/${index < 8 ? "offices" : "more-offices"}-loop.mp4`}
          tile={index % 8}
          paused={paused}
        />
      }
    </div>
  );
}
export default function BusinessWorld() {
  const [paused, setPaused] = useState(false);
  const [company, setCompany] = useState<string | null>(null),
    [agent, setAgent] = useState<string | null>(null),
    [ops, setOps] = useState<OpsSnapshot | null>(null),
    [error, setError] = useState("Checking connected tasks…"),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const q = new URLSearchParams(location.search),
      id = q.get("agent"),
      slug = q.get("company");
    if (id) {
      const owner = companies.find((m) =>
        projectFor(m.slug)?.agents.some((a) => a.id === id),
      );
      if (owner) {
        setCompany(owner.slug);
        setAgent(id);
      }
    } else if (companies.some((m) => m.slug === slug)) setCompany(slug);
  }, []);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    async function pull() {
      try {
        const r = await fetch("/api/headquarters/operations", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!r.ok)
          throw new Error(
            r.status === 401
              ? "Sign in to see private agent tasks."
              : "Live task feed unavailable.",
          );
        const data = (await r.json()) as OpsSnapshot;
        if (alive) {
          setOps(data);
          setError(
            data.tasksAvailable ? "" : "The agent task table is unavailable.",
          );
        }
      } catch (e) {
        if (alive && !controller.signal.aborted) {
          setOps(null);
          setError(e instanceof Error ? e.message : "Task feed unavailable");
        }
      }
    }
    void pull();
    const timer = setInterval(pull, 60000);
    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [refresh]);
  const selected = companies.find((m) => m.slug === company),
    roster = selected ? (projectFor(selected.slug)?.agents ?? []) : [],
    person = roster.find((a) => a.id === agent);
  function enter(slug: string) {
    setCompany(slug);
    setAgent(null);
  }
  return (
    <AppShell leadSlug={company}>
      {() => (
        <div className="business-world">
          <header className="world-heading">
            <div>
              <span>AWAD COMMAND / BUSINESS CAMPUS</span>
              <h1>{selected ? selected.name : "YOUR BUSINESS WORLD"}</h1>
              <p>
                {selected
                  ? selected.description
                  : "Your companies. Your people. One connected campus."}
              </p>
            </div>
            <Link href="/command">
              Cixy Headquarters <ArrowUpRight size={15} />
            </Link>
          </header>
          <div className="world-toolbar">
            <button
              className="scene-motion-control"
              aria-pressed={paused}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? "▶ Resume room activity" : "Ⅱ Pause room activity"}
            </button>
            <span>
              <Globe2 size={16} /> {companies.length} company offices
            </span>
            <span>
              <Users size={16} />{" "}
              {companies.reduce(
                (n, m) => n + (projectFor(m.slug)?.agents.length ?? 0),
                0,
              )}{" "}
              defined agents
            </span>
            <button
              onClick={() => setRefresh((n) => n + 1)}
              aria-label="Refresh agent tasks"
            >
              <RefreshCw size={15} />
            </button>
            <small>
              {ops
                ? `Tasks checked ${new Date(ops.checkedAt).toLocaleTimeString()}`
                : error}
            </small>
          </div>
          <p className="world-caption">
            Animated original artwork. Motion is illustrative; task status comes
            from connected operations. Agent names come from your project
            registry; task labels come from connected operations.
          </p>
          {!selected ? (
            <>
              <Link href="/crypto-floor" className="world-exchange">
                <Office index={15} paused={paused} />
                <div>
                  <span>THE EXCHANGE</span>
                  <h2>THE CRYPTO FLOOR</h2>
                  <p>Your trading teams, together on one floor.</p>
                  <strong>ENTER TRADING FLOOR →</strong>
                  <small>
                    Illustrated paper preview · trading engine status shown
                    inside
                  </small>
                </div>
              </Link>
              <div className="world-campus">
                {companies.map((m, i) => {
                  const team = projectFor(m.slug)?.agents ?? [],
                    tasks =
                      ops?.tasks.filter((t) =>
                        team.some((a) => a.id === t.agentId),
                      ) ?? [];
                  return (
                    <button
                      key={m.slug}
                      className="world-building"
                      style={{ "--office-accent": m.accent } as CSSProperties}
                      onClick={() => enter(m.slug)}
                    >
                      <div className="world-building-label">
                        <span>
                          {m.glyph} {m.name.toUpperCase()}
                        </span>
                        <ArrowUpRight size={15} />
                      </div>
                      <Office index={i} paused={paused} />
                      <div className="world-building-footer">
                        <strong>
                          {team.length
                            ? `${team.length} agents in roster`
                            : "Roster not configured"}
                        </strong>
                        <span>
                          {tasks.length
                            ? `${tasks.length} recorded tasks`
                            : "ENTER OFFICE →"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div
              className="world-inside"
              style={{ "--office-accent": selected.accent } as CSSProperties}
            >
              <div className="world-inside-top">
                <button
                  onClick={() => {
                    setCompany(null);
                    setAgent(null);
                  }}
                >
                  <ArrowLeft size={16} /> Back to campus
                </button>
                <Link href={`/agents?company=${projectFor(selected.slug)?.slug ?? selected.slug}`}>Manage team →</Link>
                <Link href={selected.route}>
                  Company dashboard <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="world-inside-layout">
                <div className="world-stage">
                  <Office
                    index={artIndex(selected.slug)}
                    large
                    paused={paused}
                  />
                  <div className="world-stage-plaque">
                    {selected.name.toUpperCase()}
                    <small>ILLUSTRATED WORKSPACE</small>
                  </div>
                </div>
                <aside className="world-roster">
                  <h2>MEET YOUR TEAM</h2>
                  {!roster.length && (
                    <p>
                      This company has an office in your registry, but no agent
                      roster is configured yet.
                    </p>
                  )}
                  {roster.map((a, i) => {
                    const tasks =
                      ops?.tasks.filter((t) => t.agentId === a.id) ?? [];
                    return (
                      <button
                        aria-pressed={a.id === agent}
                        onClick={() => setAgent(a.id)}
                        key={a.id}
                      >
                        <span
                          className="world-avatar"
                          style={{
                            backgroundPosition: `${((i % 4) * 100) / 3}% ${(Math.floor((i % 16) / 4) * 100) / 3}%`,
                          }}
                        />
                        <span>
                          <strong>{a.name}</strong>
                          <small>{a.role}</small>
                          <em>
                            {tasks.length
                              ? `${tasks.length} task${tasks.length === 1 ? "" : "s"} · ${tasks[0].status.replaceAll("_", " ")}`
                              : ops?.tasksAvailable
                                ? "No task in current queue"
                                : "Live task status unavailable"}
                          </em>
                        </span>
                      </button>
                    );
                  })}
                </aside>
              </div>
              {person ? (
                <section className="world-agent-detail">
                  <div>
                    <span>AGENT PROFILE</span>
                    <h2>{person.name}</h2>
                    <p>{person.objective}</p>
                    <small>
                      Configured tools:{" "}
                      {person.tools.join(", ") || "None listed"}
                    </small>
                  </div>
                  <div>
                    <h3>CONNECTED TASKS</h3>
                    {ops?.tasks
                      .filter((t) => t.agentId === person.id)
                      .map((t) => (
                        <p key={t.id}>
                          <b>{t.title}</b>
                          <small>
                            {t.status.replaceAll("_", " ")} ·{" "}
                            {new Date(t.createdAt).toLocaleString()}
                          </small>
                        </p>
                      ))}
                    {!ops?.tasks.some((t) => t.agentId === person.id) && (
                      <p>
                        {error ||
                          "No task for this agent in the current queue."}
                      </p>
                    )}
                    <Link href="/command">
                      Talk to Cixy <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </section>
              ) : (
                roster.length > 0 && (
                  <p className="world-caption">
                    Select a teammate to inspect their role and connected tasks.
                  </p>
                )
              )}
            </div>
          )}
          <footer className="world-footer">
            <span>
              BUSINESS CAMPUS ·{" "}
              {ops?.tasksAvailable ? "CONNECTED TASK QUEUE" : "REGISTRY VIEW"}
            </span>
            <Link href="/crypto-floor">Visit the Crypto Floor →</Link>
          </footer>
        </div>
      )}
    </AppShell>
  );
}
