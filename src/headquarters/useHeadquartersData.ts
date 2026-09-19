"use client";
import { useEffect, useState } from "react";
import type { FeedSnapshot, OpsSnapshot } from "./types";
export function useHeadquartersData(product = "BTC-USD", granularity = 3600) {
  const [feeds, setFeeds] = useState<FeedSnapshot | null>(null),
    [ops, setOps] = useState<OpsSnapshot | null>(null),
    [feedError, setFeedError] = useState(""),
    [opsError, setOpsError] = useState(""),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setFeeds(null);
    async function pull() {
      try {
        const r = await fetch(
          `/api/headquarters/feeds?product=${product}&granularity=${granularity}`,
          { signal: controller.signal },
        );
        if (!r.ok) throw new Error("Public feeds are temporarily unavailable.");
        const data = await r.json();
        if (alive) {
          setFeeds(data);
          setFeedError("");
        }
      } catch (e) {
        if (alive && !controller.signal.aborted)
          setFeedError(e instanceof Error ? e.message : "Feed error");
      }
    }
    void pull();
    const timer = setInterval(pull, 300000);
    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [product, granularity, refresh]);
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    async function pull() {
      try {
        const r = await fetch("/api/headquarters/operations", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!r.ok)
          throw new Error(
            r.status === 401
              ? "Sign in to view private operations."
              : "Operations feed is unavailable.",
          );
        const data = await r.json();
        if (alive) {
          setOps(data);
          setOpsError("");
        }
      } catch (e) {
        if (alive && !controller.signal.aborted) {
          setOps(null);
          setOpsError(
            e instanceof Error ? e.message : "Operations unavailable",
          );
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
  return {
    feeds,
    ops,
    feedError,
    opsError,
    reload: () => setRefresh((x) => x + 1),
  };
}
