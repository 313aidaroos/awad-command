"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { projects } from "@/projects/registry";
import { BUSINESS_EXPERTISE } from "@/projects/expertise";
import "./teams.css";
type SavedAgent = {
  id: string;
  name: string;
  role: string;
  objective: string;
  status: string;
  current_task?: string;
};
type Snapshot = {
  agents: SavedAgent[];
  worker: { connected: boolean; halted: boolean };
};
export function TeamDesk() {
  const [company, setCompany] = useState(projects[0].slug);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [notice, setNotice] = useState("Checking saved agents…");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const slug = new URLSearchParams(location.search).get("company");
    if (projects.some((p) => p.slug === slug)) setCompany(slug!);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workforce", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Cannot load workforce.");
        setSnapshot(data);
        setNotice("Saved agent records loaded.");
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setSnapshot(null);
          setNotice(e.message);
        }
      });
    return () => controller.abort();
  }, [refresh]);
  const project = projects.find((p) => p.slug === company)!;
  return (
    <section className="team-desk">
      <header>
        <div>
          <small>AWAD COMMAND / WORKFORCE</small>
          <h1>YOUR BUSINESS TEAMS</h1>
          <p>
            12 agents per business. Clear ownership, business-specific briefs,
            and saved task records.
          </p>
        </div>
        <button onClick={() => setRefresh((r) => r + 1)}>Refresh status</button>
      </header>
      <div className="team-toolbar">
        <label>
          Business{" "}
          <select value={company} onChange={(e) => setCompany(e.target.value)}>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <Link
          href={`/business-world?company=${company === "publishing" ? "books" : company}`}
        >
          Enter office →
        </Link>
        <span>
          {snapshot
            ? snapshot.worker.connected
              ? "Worker online"
              : snapshot.worker.halted
                ? "Worker paused"
                : "Worker offline · queued work waits"
            : "Worker status unavailable"}
        </span>
      </div>
      <p role="status">
        {notice} {!snapshot && <Link href="/login">Sign in</Link>}
      </p>
      <div className="team-brief">
        <h2>{project.name} · business expertise</h2>
        <p>{BUSINESS_EXPERTISE[company]}</p>
      </div>
      <div className="team-connections">
        <strong>Execution readiness</strong>
        <p>
          These agents share the existing worker. A saved profile is not proof
          of a connected inbox, repository, ad account, or running automation.
        </p>
        <p>
          Meta & Google Ads: execution connection not verified. Customer email:
          execution connection not verified. Tasks below prepare plans and
          drafts; they do not launch paid ads or send emails.
        </p>
      </div>
      <div className="team-grid">
        {project.agents.map((agent) => (
          <AgentDesk
            key={agent.id}
            agent={agent}
            saved={snapshot?.agents.find((a) => a.id === agent.id)}
            canEdit={!!snapshot}
          />
        ))}
      </div>
    </section>
  );
}
function AgentDesk({
  agent,
  saved,
  canEdit,
}: {
  agent: (typeof projects)[number]["agents"][number];
  saved?: SavedAgent;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false),
    [brief, setBrief] = useState(""),
    [task, setTask] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    setBrief(saved?.objective ?? agent.objective);
  }, [saved?.objective, agent.objective]);
  async function submit(kind: "PATCH" | "POST") {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/workforce", {
        method: kind,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          ...(kind === "PATCH" ? { objective: brief } : { instruction: task }),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not confirm the result.");
      setMessage(
        kind === "PATCH"
          ? "Brief saved. The worker reads it on the next task."
          : `Draft task queued · ${data.taskId}. This does not mean it has run.`,
      );
      if (kind === "POST") setTask("");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Result unconfirmed. Refresh before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="team-agent">
      <div>
        <small>{saved?.role ?? agent.role}</small>
        <h2>{saved?.name ?? agent.name}</h2>
        <span>
          {saved
            ? `Registered · ${saved.status.replaceAll("_", " ")}`
            : "Registration not verified"}
        </span>
      </div>
      <p>{agent.responsibilities?.join(" · ") || "Business specialist"}</p>
      <p>{saved?.objective ?? agent.objective}</p>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Close controls" : "Manage agent & assign work"}
      </button>
      {open && (
        <div className="team-controls">
          <label>
            Specialist brief
            <textarea
              value={brief}
              maxLength={3000}
              onChange={(e) => setBrief(e.target.value)}
            />
          </label>
          <button
            disabled={busy || !canEdit || brief.trim().length < 10}
            onClick={() => submit("PATCH")}
          >
            Save brief
          </button>
          <label>
            Research or draft assignment
            <textarea
              placeholder="Describe the result you need…"
              value={task}
              maxLength={4000}
              onChange={(e) => setTask(e.target.value)}
            />
          </label>
          <button
            disabled={busy || !canEdit || task.trim().length < 3}
            onClick={() => submit("POST")}
          >
            {busy ? "Saving…" : "Queue draft task"}
          </button>
          <p role="status">{message}</p>
        </div>
      )}
    </article>
  );
}
