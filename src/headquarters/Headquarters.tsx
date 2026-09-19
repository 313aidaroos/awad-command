"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronRight,
  Coins,
  Globe2,
  ListTodo,
  Plus,
  Radio,
  RefreshCw,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { AppShell } from "@/landing/AppShell";
import { CeoConsole } from "@/ui/CeoConsole";
import { ApprovalCard } from "@/ui/ApprovalCard";
import { ComputerPanel } from "@/ui/ComputerPanel";
import { useCommandStore } from "@/store/useCommandStore";
import { useHeadquartersData } from "./useHeadquartersData";
import { notebookKey, readNotebook } from "./notebook";
import type { Candle, NewsItem, NotebookItem, FinancePoint } from "./types";
import "./headquarters.css";
const usd = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n);
function Box({
  title,
  icon,
  children,
  action,
  id,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`room-box ${className}`}>
      <header>
        <h2>
          {icon}
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
function NewsBox({
  items,
  title,
  crypto,
  error,
}: {
  items: NewsItem[];
  title: string;
  crypto?: boolean;
  error: string;
}) {
  return (
    <Box
      title={title}
      icon={crypto ? <Coins size={17} /> : <Globe2 size={17} />}
      action={
        <span className="room-source">{crypto ? "COINDESK" : "BBC WORLD"}</span>
      }
    >
      <div className="room-news">
        {items.slice(0, 3).map((item, i) => (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            key={item.url}
          >
            <span className={`room-news-icon news-${i}`}>
              {crypto ? <Coins size={27} /> : <Globe2 size={27} />}
            </span>
            <div>
              <h3>{item.title}</h3>
              <small>
                {item.source} ·{" "}
                {item.publishedAt
                  ? new Date(item.publishedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : "Latest"}{" "}
                <ArrowUpRight size={10} />
              </small>
            </div>
          </a>
        ))}
        {!items.length && (
          <p className="room-empty">
            {error || "Checking the latest headlines…"}
          </p>
        )}
      </div>
    </Box>
  );
}
function Candles({ data }: { data: Candle[] }) {
  if (!data.length)
    return <p className="room-empty">Waiting for market candles.</p>;
  const candles = data.slice(-54),
    lo = Math.min(...candles.map((c) => c.low)),
    hi = Math.max(...candles.map((c) => c.high)),
    range = hi - lo || 1,
    maxVolume = Math.max(...candles.map((c) => c.volume), 1),
    y = (n: number) => 15 + ((hi - n) / range) * 125;
  return (
    <svg
      viewBox="0 0 440 180"
      className="room-candles"
      role="img"
      aria-label="Historical market candlestick chart from Coinbase"
    >
      <g>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <path d={`M38 ${18 + i * 40}H440`} stroke="#183344" />
            <text x="1" y={22 + i * 40} fill="#829eaf" fontSize="9">
              {Math.round(hi - (range / 3) * i).toLocaleString()}
            </text>
          </g>
        ))}
        {candles.map((c, i) => {
          const x = 43 + i * 7.2,
            color = c.close >= c.open ? "#3ddab1" : "#f0717b";
          return (
            <g key={c.time}>
              <title>
                {new Date(c.time * 1000).toISOString()} Open {c.open} Close{" "}
                {c.close}
              </title>
              <path d={`M${x} ${y(c.high)}V${y(c.low)}`} stroke={color} />
              <rect
                x={x - 2}
                y={Math.min(y(c.open), y(c.close))}
                width="4"
                height={Math.max(1, Math.abs(y(c.close) - y(c.open)))}
                fill={color}
              />
              <rect
                x={x - 2}
                y={173 - (c.volume / maxVolume) * 21}
                width="4"
                height={(c.volume / maxVolume) * 21}
                fill={color}
                opacity=".3"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
function LedgerChart({ points }: { points: FinancePoint[] }) {
  if (!points.length)
    return (
      <p className="room-empty">
        Connect the ledger to show your revenue and expense history.
      </p>
    );
  const max = Math.max(
      ...points.map((p) => Math.max(p.revenue, p.expenses)),
      1,
    ),
    path = (key: "revenue" | "expenses") =>
      points
        .map(
          (p, i) =>
            `${i ? "L" : "M"}${15 + (i * 400) / Math.max(1, points.length - 1)} ${130 - (p[key] / max) * 105}`,
        )
        .join(" ");
  return (
    <svg
      viewBox="0 0 440 155"
      className="room-ledger"
      role="img"
      aria-label="Recorded daily USD revenue and expenses"
    >
      <path d="M15 25H425M15 60H425M15 95H425M15 130H425" stroke="#193245" />
      <path d={path("revenue")} fill="none" stroke="#44d8ad" strokeWidth="2" />
      <path d={path("expenses")} fill="none" stroke="#dc829b" strokeWidth="2" />
      <text x="15" y="150" fontSize="9" fill="#8ca5b5">
        {points[0]?.date}
      </text>
      <text x="350" y="150" fontSize="9" fill="#8ca5b5">
        {points.at(-1)?.date}
      </text>
    </svg>
  );
}
export default function Headquarters() {
  const [product, setProduct] = useState("BTC-USD"),
    [granularity, setGranularity] = useState(3600),
    [period, setPeriod] = useState(30),
    [notes, setNotes] = useState<NotebookItem[]>([]),
    [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState(""),
    [adding, setAdding] = useState<NotebookItem["kind"] | null>(null),
    [title, setTitle] = useState(""),
    [when, setWhen] = useState("");
  const { feeds, ops, feedError, opsError, reload } = useHeadquartersData(
    product,
    granularity,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (adding) dialogRef.current?.showModal();
  }, [adding]);
  const pending = useCommandStore(
    (s) => s.approvals.filter((a) => a.status === "pending").length,
  );
  const panel = useCommandStore((s) => s.contextPanel);
  useEffect(() => {
    try {
      setNotes(readNotebook(localStorage.getItem(notebookKey)));
    } catch {
      setStorageError("Device storage unavailable. Notes cannot be saved.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(notebookKey, JSON.stringify(notes));
      setStorageError("");
    } catch {
      setStorageError("Changes could not be saved on this device.");
    }
  }, [notes, ready]);
  useEffect(() => {
    const p = new URLSearchParams(location.search).get("panel");
    const target =
      p === "approval"
        ? "hq-attention"
        : p === "briefing"
          ? "hq-cixy"
          : p === "analytics"
            ? "hq-finances"
            : null;
    if (target)
      setTimeout(
        () =>
          document.getElementById(target)?.scrollIntoView({ block: "center" }),
        150,
      );
    if (p === "computer") useCommandStore.getState().openPanel(p);
  }, []);
  useEffect(() => {
    if (panel === "briefing" || panel === "analytics" || panel === "agent") {
      document
        .getElementById(panel === "analytics" ? "hq-finances" : "hq-cixy")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      useCommandStore.getState().closePanel();
    }
  }, [panel]);
  const recentPoints = ops?.finance.points.slice(-period) ?? [];
  const revenue =
    ops?.finance.revenue === null
      ? null
      : ops
        ? recentPoints.length
          ? recentPoints.reduce((sum, p) => sum + p.revenue, 0)
          : period === 30
            ? ops.finance.revenue
            : null
        : null;
  const expenses =
    ops?.finance.expenses === null
      ? null
      : ops
        ? recentPoints.length
          ? recentPoints.reduce((sum, p) => sum + p.expenses, 0)
          : period === 30
            ? ops.finance.expenses
            : null
        : null;
  const net =
    ops?.finance.net === null
      ? null
      : revenue !== null && expenses !== null
        ? revenue - expenses
        : null;
  const agenda = notes
      .filter((n) => n.kind === "schedule" && !n.done)
      .sort((a, b) => a.when.localeCompare(b.when)),
    content = notes
      .filter((n) => n.kind === "content" && !n.done)
      .sort((a, b) => a.when.localeCompare(b.when));
  const attention =
    (ops?.tasks.filter(
      (t) => t.status === "failed" || t.status === "waiting_approval",
    ).length ?? 0) +
    notes.filter((n) => !n.done && n.when && new Date(n.when) < new Date())
      .length +
    pending;
  const context = useMemo(
    () => ({
      source: "Headquarters dashboard",
      privateOperations: ops,
      deviceNotebook: notes,
      publicNews: { world: feeds?.world, crypto: feeds?.crypto },
      market: { product, lastCandle: feeds?.candles.at(-1) },
      calendarProvider: "Not connected",
      contentPublisher: "Not connected",
    }),
    [ops, notes, feeds, product],
  );
  function add() {
    if (!title.trim() || !adding || notes.length >= 200) return;
    setNotes((n) => [
      ...n,
      {
        id: crypto.randomUUID(),
        kind: adding,
        title: title.trim().slice(0, 180),
        when,
        done: false,
      },
    ]);
    setAdding(null);
    setTitle("");
    setWhen("");
  }
  function toggle(id: string) {
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }
  return (
    <AppShell headquarters embeddedCixy>
      {(d) => (
        <div className="headquarters-room">
          <div className="room-heading">
            <div>
              <span>AWAD COMMAND / EXECUTIVE ROOM</span>
              <h1>YOUR HEADQUARTERS</h1>
              <p>One conversation. Your entire operation.</p>
            </div>
            <div>
              <button
                className="room-refresh"
                onClick={reload}
                aria-label="Refresh headquarters data"
              >
                <RefreshCw size={15} />
              </button>
              <blockquote>
                “Discipline today builds the freedom tomorrow.”
                <small>— Awad</small>
              </blockquote>
            </div>
          </div>
          <div className="room-wayfinding">
            <Link href="/business-world">
              <Globe2 size={15} /> Business World <ArrowUpRight size={12} />
            </Link>
            <Link href="/crypto-floor">
              <Coins size={15} /> Crypto Floor <ArrowUpRight size={12} />
            </Link>
            <a href="#hq-attention">
              <ListTodo size={15} /> Needs attention <b>{attention}</b>
            </a>
            <span>
              <i
                className={
                  d.mission?.cixy.provider === "anthropic" ? "online" : ""
                }
              />{" "}
              {d.mission?.cixy.provider === "anthropic"
                ? "CIXY CONNECTED"
                : d.loading
                  ? "CHECKING CIXY"
                  : "CIXY CONNECTION LIMITED"}
            </span>
          </div>
          <div className="room-main-grid">
            <div className="room-news-column">
              <NewsBox
                title="WORLD NEWS"
                items={feeds?.world ?? []}
                error={
                  feedError ||
                  feeds?.errors.find((e) => e.startsWith("World")) ||
                  ""
                }
              />
              <NewsBox
                title="CRYPTO NEWS"
                crypto
                items={feeds?.crypto ?? []}
                error={
                  feedError ||
                  feeds?.errors.find((e) => e.startsWith("Crypto")) ||
                  ""
                }
              />
            </div>
            <div id="hq-cixy" className="room-cixy-column">
              <CeoConsole embedded dashboardContext={context} />
            </div>
            <div className="room-work-column">
              <Box
                title="YOUR TASKS"
                icon={<CheckSquare size={17} />}
                id="hq-attention"
                action={
                  <button
                    onClick={() => setAdding("task")}
                    aria-label="Add a personal task"
                  >
                    <Plus size={15} />
                  </button>
                }
              >
                <div className="room-task-list">
                  {notes
                    .filter((n) => n.kind === "task")
                    .slice(0, 8)
                    .map((n) => (
                      <div
                        key={n.id}
                        className={`room-task ${n.done ? "done" : ""}`}
                      >
                        <button
                          role="checkbox"
                          aria-checked={n.done}
                          aria-label={`Complete ${n.title}`}
                          onClick={() => toggle(n.id)}
                        >
                          {n.done && <Check size={13} />}
                        </button>
                        <span>
                          {n.title}
                          <small>Personal · this device</small>
                        </span>
                        <button
                          aria-label={`Delete ${n.title}`}
                          onClick={() =>
                            setNotes((ns) => ns.filter((x) => x.id !== n.id))
                          }
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  {ops?.tasks.slice(0, 4).map((t) => (
                    <Link
                      className="room-agent-task"
                      key={t.id}
                      href={`/business-world?agent=${encodeURIComponent(t.agentId)}`}
                    >
                      <span
                        className={`room-task-dot ${t.status === "failed" ? "failed" : ""}`}
                      />
                      <span>
                        {t.title}
                        <small>
                          {t.agentId} · {t.status.replaceAll("_", " ")}
                        </small>
                      </span>
                      <ChevronRight size={12} />
                    </Link>
                  ))}
                  {!notes.some((n) => n.kind === "task") &&
                    !ops?.tasks.length && (
                      <p className="room-empty">
                        {opsError || "No active tasks in the connected queue."}
                        <button onClick={() => setAdding("task")}>
                          Add your first personal task →
                        </button>
                        {opsError && <Link href="/login">Sign in →</Link>}
                      </p>
                    )}
                </div>
                <p className="room-note">
                  Agent tasks are read-only here. Personal checklist saves on
                  this device.
                </p>
                {pending > 0 && (
                  <button
                    className="room-attention"
                    onClick={() =>
                      useCommandStore.getState().openPanel("approval")
                    }
                  >
                    {pending} pending approval{pending === 1 ? "" : "s"} ·
                    Review
                  </button>
                )}
              </Box>
              <Box
                title="UPCOMING SCHEDULE"
                icon={<CalendarDays size={17} />}
                action={
                  <button
                    onClick={() => setAdding("schedule")}
                    aria-label="Add an agenda reminder"
                  >
                    <Plus size={15} />
                  </button>
                }
              >
                <div className="room-agenda">
                  {agenda.slice(0, 4).map((n) => (
                    <div key={n.id}>
                      <time>
                        {n.when
                          ? new Date(n.when).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </time>
                      <span>
                        {n.title}
                        <small>
                          {n.when
                            ? new Date(n.when).toLocaleDateString()
                            : "No time"}{" "}
                          · device reminder
                        </small>
                      </span>
                      <button
                        aria-label={`Complete ${n.title}`}
                        onClick={() => toggle(n.id)}
                      >
                        <Check size={13} />
                      </button>
                    </div>
                  ))}
                  {!agenda.length && (
                    <p className="room-empty">
                      No calendar feed is connected yet.
                      <button onClick={() => setAdding("schedule")}>
                        Add an agenda reminder →
                      </button>
                    </p>
                  )}
                </div>
                <p className="room-note">
                  Reminders stay on this device; they do not create calendar
                  events or notifications.
                </p>
              </Box>
            </div>
          </div>
          <div className="room-lower-grid">
            <Box
              title="ECOSYSTEM FINANCES"
              icon={<Coins size={17} />}
              id="hq-finances"
              action={
                <div className="room-periods">
                  {[7, 14, 30].map((days) => (
                    <button
                      aria-pressed={period === days}
                      key={days}
                      onClick={() => setPeriod(days)}
                    >
                      {days}D
                    </button>
                  ))}
                </div>
              }
            >
              <div className="room-kpis">
                <div>
                  <small>REVENUE</small>
                  <strong>{usd(revenue)}</strong>
                </div>
                <div>
                  <small>EXPENSES</small>
                  <strong>{usd(expenses)}</strong>
                </div>
                <div>
                  <small>NET P&L</small>
                  <strong>{usd(net)}</strong>
                </div>
                <div>
                  <small>CASH</small>
                  <strong>—</strong>
                </div>
              </div>
              <LedgerChart points={recentPoints} />
              <div className="room-legend">
                <span>● Revenue</span>
                <span>● Expenses</span>
                <small>Recorded USD · UTC</small>
              </div>
              <p className="room-note">
                {opsError ||
                  ops?.notice ||
                  "Waiting for recorded financial data."}{" "}
                Cash accounts are not linked.
              </p>
            </Box>
            <Box
              title="MARKET WATCH"
              icon={<Radio size={17} />}
              action={
                <select
                  aria-label="Market pair"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                >
                  {["BTC-USD", "ETH-USD", "SOL-USD"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              }
            >
              <div className="room-market-heading">
                <strong>{usd(feeds?.candles.at(-1)?.close)}</strong>
                <div className="room-periods">
                  {[
                    [900, "15M"],
                    [3600, "1H"],
                    [86400, "1D"],
                  ].map(([g, label]) => (
                    <button
                      key={g}
                      aria-pressed={granularity === g}
                      onClick={() => setGranularity(Number(g))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Candles data={feeds?.candles ?? []} />
              <p className="room-note">
                <a
                  href="https://www.coinbase.com/advanced-trade/spot/BTC-USD"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Coinbase Exchange
                </a>{" "}
                · Historical candles · refreshed every 5 minutes.{" "}
                {feeds?.candles.at(-1)
                  ? `Latest bucket ${new Date(feeds.candles.at(-1)!.time * 1000).toLocaleString()}`
                  : feedError ||
                    feeds?.errors.find((e) => e.startsWith("Market"))}
              </p>
            </Box>
            <Box
              title="CONTENT QUEUE"
              icon={<Video size={17} />}
              action={
                <button
                  onClick={() => setAdding("content")}
                  aria-label="Add a content reminder"
                >
                  <Plus size={15} />
                </button>
              }
            >
              <div className="room-content-queue">
                {content.slice(0, 4).map((n, i) => (
                  <div key={n.id}>
                    <span className={`room-content-thumb news-${i % 3}`}>
                      <Video size={24} />
                    </span>
                    <span>
                      {n.title}
                      <small>
                        {n.when ? new Date(n.when).toLocaleString() : "No date"}{" "}
                        · Reminder only
                      </small>
                    </span>
                    <button
                      aria-label={`Complete ${n.title}`}
                      onClick={() => toggle(n.id)}
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ))}
                {!content.length && (
                  <p className="room-empty">
                    No scheduled publishing feed is connected.
                    <button onClick={() => setAdding("content")}>
                      Track a content reminder →
                    </button>
                  </p>
                )}
              </div>
              <div className="room-content-links">
                <Link href="/projects/socixis">
                  Socixis <ArrowUpRight size={12} />
                </Link>
                <Link href="/content">
                  Content Studio <ArrowUpRight size={12} />
                </Link>
              </div>
              <p className="room-note">
                Device reminders do not schedule or publish posts.
              </p>
            </Box>
          </div>
          {storageError && (
            <p role="alert" className="room-error">
              {storageError}
            </p>
          )}
          <footer className="room-footer">
            <span>AWAD COMMAND · HEADQUARTERS</span>
            <Link href="/business-world">ENTER YOUR BUSINESS WORLD →</Link>
            <span>{d.health.overall}</span>
          </footer>
          {adding && (
            <dialog
              ref={dialogRef}
              className="room-modal"
              onCancel={() => setAdding(null)}
              aria-label="Add a personal reminder"
            >
              <form
                className="room-note-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  add();
                }}
              >
                <header>
                  <h2>ADD {adding.toUpperCase()}</h2>
                  <button
                    type="button"
                    aria-label="Close reminder form"
                    onClick={() => setAdding(null)}
                  >
                    <X size={18} />
                  </button>
                </header>
                <label>
                  Title
                  <input
                    autoFocus
                    required
                    maxLength={180}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to happen?"
                  />
                </label>
                <label>
                  Date and time (optional)
                  <input
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                  />
                </label>
                <p>
                  Saved on this device. This does not schedule a post, send a
                  message or create a calendar event.
                </p>
                <button
                  className="room-save"
                  disabled={!title.trim() || notes.length >= 200}
                >
                  SAVE REMINDER
                </button>
              </form>
            </dialog>
          )}
          <ApprovalCard />
          <ComputerPanel />
        </div>
      )}
    </AppShell>
  );
}
