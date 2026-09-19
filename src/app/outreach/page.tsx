"use client";
import { useState } from "react";
import { AppShell } from "@/landing/AppShell";
import { projects } from "@/projects/registry";

export default function OutreachPage() {
  const [slug, setSlug] = useState("lyrixis");
  const [csv, setCsv] = useState(
    "name,house,email,why\nAmira,House Audio,rights@example.com,Needs spoken editions",
  );
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  async function queue() {
    setBusy(true);
    const rows = csv
      .trim()
      .split(/\n/)
      .slice(1)
      .map((line) => {
        const [name, house, email, ...rest] = line.split(",");
        return {
          name: name?.trim() ?? "",
          house: house?.trim() ?? "",
          email: email?.trim() ?? "",
          why: rest.join(",").trim(),
        };
      })
      .filter((r) => r.email);
    const res = await fetch("/api/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectSlug: slug, rows }),
    });
    setOut(JSON.stringify(await res.json(), null, 2));
    setBusy(false);
  }

  return (
    <AppShell>
      {() => (
        <section className="mx-auto max-w-3xl px-4 py-8 text-slate-200">
          <p className="text-xs tracking-[.25em] text-amber-200">COMMAND / OUTREACH</p>
          <h1 className="mt-2 font-serif text-3xl text-amber-100">50 names · one send</h1>
          <p className="mt-3 text-slate-400">
            Paste your list. Drafts go to Mailroom. Nothing leaves until you Approve.
          </p>
          <label className="mt-6 block text-sm">
            Company
            <select
              className="mt-2 block w-full bg-black/40 p-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <textarea
            className="mt-4 h-48 w-full bg-black/40 p-3 font-mono text-xs"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <button
            className="mt-4 rounded-full bg-amber-200 px-5 py-2 text-slate-950"
            disabled={busy}
            onClick={() => void queue()}
          >
            {busy ? "Queuing…" : "Queue drafts"}
          </button>
          {out && <pre className="mt-4 overflow-auto text-xs text-lime-200">{out}</pre>}
        </section>
      )}
    </AppShell>
  );
}
