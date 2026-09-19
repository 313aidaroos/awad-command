"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/landing/AppShell";
import type { FeedSnapshot } from "@/headquarters/types";
export default function Page() {
  const [feed, setFeed] = useState<FeedSnapshot | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    async function pull() {
      try {
        const r = await fetch("/api/headquarters/feeds", { signal: c.signal });
        if (!r.ok) throw new Error("Headlines are temporarily unavailable.");
        setFeed(await r.json());
        setError("");
      } catch (e) {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "News unavailable");
      }
    }
    void pull();
    const timer = setInterval(pull, 300000);
    return () => {
      c.abort();
      clearInterval(timer);
    };
  }, []);
  return (
    <AppShell>
      {() => (
        <div className="workspace-headlines">
          {(["world", "crypto"] as const).map((kind) => (
            <section key={kind}>
              <h2>{kind === "world" ? "World News" : "Crypto News"}</h2>
              {feed?.[kind].map((n) => (
                <a
                  key={n.url}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {n.title}
                  <small>
                    {n.source}
                    {n.publishedAt
                      ? ` · ${new Date(n.publishedAt).toLocaleDateString()}`
                      : ""}{" "}
                    ↗
                  </small>
                </a>
              ))}
              {!feed?.[kind].length && (
                <p>
                  {error ||
                    (feed
                      ? "This source is temporarily unavailable."
                      : "Loading headlines…")}
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
