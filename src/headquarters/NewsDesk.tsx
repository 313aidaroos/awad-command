"use client";
import { useEffect, useState } from "react";
import { newsTopics, type NewsTopic, type BriefItem } from "./news-topics";
export function NewsDesk() {
  const [topic, setTopic] = useState<NewsTopic>("us"),
    [mode, setMode] = useState("x"),
    [items, setItems] = useState<BriefItem[]>([]),
    [notice, setNotice] = useState("Checking news connection…"),
    [checked, setChecked] = useState(""),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    setItems([]);
    setChecked("");
    async function load() {
      setBusy(true);
      try {
        const r = await fetch(
          `/api/headquarters/news?topic=${topic}&mode=${mode}`,
          { signal: c.signal, cache: "no-store" },
        );
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "News unavailable");
        setItems(d.items);
        setNotice(d.notice);
        setChecked(d.checkedAt);
      } catch {
        if (!c.signal.aborted) setNotice("News unavailable. Please try again.");
      } finally {
        if (!c.signal.aborted) setBusy(false);
      }
    }
    void load();
    const t = setInterval(load, 300000);
    return () => {
      c.abort();
      clearInterval(t);
    };
  }, [topic, mode, refresh]);
  return (
    <section className="room-box news-desk">
      <header>
        <h2>YOUR NEWS DESK</h2>
        <button
          disabled={busy}
          onClick={() => setRefresh((n) => n + 1)}
          aria-label="Refresh news"
        >
          {busy ? "Checking…" : "Refresh"}
        </button>
      </header>
      <div className="news-controls">
        <label>
          Topic
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value as NewsTopic)}
          >
            {Object.entries(newsTopics).map(([key, v]) => (
              <option key={key} value={key}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label="News source type">
          <button aria-pressed={mode === "x"} onClick={() => setMode("x")}>
            X posts
          </button>
          <button
            aria-pressed={mode === "reporting"}
            onClick={() => setMode("reporting")}
          >
            Reporting
          </button>
        </div>
        <small>
          {checked
            ? `Checked ${new Date(checked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · refreshes every 5 min`
            : "Connecting…"}
        </small>
      </div>
      <div className="room-news news-scroll">
        {items.map((item) => (
          <a key={item.url} href={item.url} target="_blank" rel="noreferrer">
            <div>
              <small>
                {item.source} · {item.kind}
              </small>
              <h3>{item.title}</h3>
              <small>
                {item.publishedAt
                  ? new Date(item.publishedAt).toLocaleString()
                  : "Date unavailable"}{" "}
                ↗
              </small>
            </div>
          </a>
        ))}
      </div>
      <p className="news-notice" role="status">
        {notice}
      </p>
      {!busy && !items.length && (
        <p className="news-notice">
          {mode === "x" ? (
            <>
              You can read{" "}
              <button onClick={() => setMode("reporting")}>Reporting</button>{" "}
              while the X reading connection is checked.
            </>
          ) : (
            "No matching stories were returned for this topic."
          )}
        </p>
      )}
      <details className="news-notice">
        <summary>Sources &amp; perspective</summary>
        <p>
          X uses a curated group of publishers and official accounts. Reporting
          sources: {newsTopics[topic].feeds.map((f) => f[0]).join(", ")}.
          Sources may disagree; inclusion does not endorse a claim. Official
          statements and historical context are labeled separately. Opinions can
          appear within publisher posts—read the original before drawing
          conclusions.
        </p>
      </details>
    </section>
  );
}
