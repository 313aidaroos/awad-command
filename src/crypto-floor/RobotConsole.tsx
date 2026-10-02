"use client";
/**
 * Crypto Floor robot console (v2, 2026-10-02): status bar + kill switch, desks / trades / log (ROBOT tab),
 * talk to the desk agents (CHAT tab), backtests and strategy tests (LAB tab), in-page manual order form.
 * Data: GET /api/crypto-floor/snapshot (robot), owner actions: /control, /lab, /chat, /review, /place-order.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { RobotState } from "@/lib/crypto-floor/state";

export type ChatTarget = { thread: "floor" | "samurai" | "neon" | "orbit" | "phantom"; agent: string | null };

const usd = (n: number | null | undefined, sign = false) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const s = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Math.abs(n));
  return `${n < 0 ? "−" : sign && n > 0 ? "+" : ""}${s}`;
};
const pct = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}%`;
const tone = (n: number | null | undefined) => (n === null || n === undefined ? "" : n > 0 ? "cf-positive" : n < 0 ? "cf-negative" : "");
const ago = (iso: string | null | undefined) => {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const dayHhmm = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

async function postJson<T = Record<string, unknown>>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function Panel({ title, tag, children, style }: { title: string; tag?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section className="cf-panel" style={style}>
      <header>
        <h2>{title}</h2>
        {tag && <span className="cf-tag">{tag}</span>}
      </header>
      {children}
    </section>
  );
}

/** Bold **segments** in agent replies; everything else stays plain text. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}
    </>
  );
}

// ───────────────────────────── status bar + kill switch

export function RobotStatusBar({
  robot,
  error,
  onRefresh,
  onTalk,
  killOpen,
  setKillOpen,
}: {
  robot: RobotState | null;
  error: string | null;
  onRefresh: () => void;
  onTalk: () => void;
  killOpen: boolean;
  setKillOpen: (open: boolean) => void;
}) {
  if (!robot) {
    return (
      <div className="rc-bar">
        <span className="rc-pill">
          <i /> {error ? "NOT CONNECTED" : "LOADING"}
        </span>
        <div className="rc-bar-main">{error ? <span className="rc-error">{error}</span> : <span>Reading the robot…</span>}</div>
        <div className="rc-bar-actions" />
      </div>
    );
  }
  const status = robot.status;
  const f = robot.floor;
  return (
    <div className="rc-bar">
      <span className={`rc-pill ${status.toLowerCase()}`} title={robot.lastTickTitle ?? ""}>
        <i /> ROBOT {status}
      </span>
      <div className="rc-bar-main">
        <span>
          Last tick <b>{ago(robot.lastTickAt)}</b>
          {robot.nextTickInSec !== null && status !== "OFFLINE" ? <> · next in ~{Math.max(1, Math.round(robot.nextTickInSec / 60))}m</> : null} · {robot.ticks24h} ticks/24h ({Math.round(robot.uptimePct)}%) · Floor <b>{usd(f.equity)}</b> · today{" "}
          <b className={tone(f.dayPnl)}>{usd(f.dayPnl, true)}</b> ({pct(f.dayPnlPct)}) · <b>{f.openPositions}</b> open
        </span>
        <span className="rc-bar-watch">{robot.watchLine ? `Watching: ${robot.watchLine}` : "Watching: waiting for the first v2 tick"}</span>
      </div>
      <div className="rc-bar-actions">
        <button className="rc-btn primary" onClick={onTalk}>
          Talk to the team
        </button>
        <button className={`rc-btn ${robot.killSwitch.halted ? "" : "danger"}`} onClick={() => setKillOpen(!killOpen)}>
          {robot.killSwitch.halted ? "Reset kill switch" : "Kill switch"}
        </button>
      </div>
      {robot.killSwitch.halted && (
        <p className="rc-warn red">
          KILL SWITCH ON since {robot.killSwitch.at ? dayHhmm(robot.killSwitch.at) : "?"} by {robot.killSwitch.by ?? "?"}: {robot.killSwitch.reason ?? "no reason"}. No orders until you reset it.
        </p>
      )}
      {robot.floorPause && <p className="rc-warn">Floor day-loss pause until {dayHhmm(robot.floorPause.until)} — no new entries, exits still run. {robot.floorPause.reason}</p>}
      {robot.dataStale && <p className="rc-warn">Market data stale — new entries blocked: {robot.dataStaleReason}</p>}
      {status === "STALE" && <p className="rc-warn">The robot has not ticked for {ago(robot.lastTickAt)}. Check the Vercel cron for /api/crypto-floor/tick.</p>}
      {robot.dedicatedAccount === false && (
        <p className="rc-warn">
          Shares AwadBot&apos;s Alpaca paper account. Each desk trades its own ledger, but a separate paper account (CRYPTO_FLOOR_ALPACA_API_KEY / SECRET) keeps the two bots fully apart.
        </p>
      )}
      {killOpen && <KillSwitchForm robot={robot} onDone={() => { setKillOpen(false); onRefresh(); }} />}
    </div>
  );
}

function KillSwitchForm({ robot, onDone }: { robot: RobotState; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const halted = robot.killSwitch.halted;
  return (
    <div className="rc-warn" style={{ display: "grid", gap: 8 }}>
      {halted ? (
        <span>Reset the kill switch? The robot resumes on its next tick (within 5 minutes).</span>
      ) : (
        <>
          <span>Stop ALL robot orders now (entries and exits) until you reset it. Open positions stay as they are. Unfilled robot orders get a cancel request.</span>
          <input className="rc-input" placeholder="Reason (optional)" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </>
      )}
      <div className="rc-row">
        <button
          className={`rc-btn ${halted ? "primary" : "danger"}`}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await postJson("/api/crypto-floor/control", halted ? { action: "kill_off" } : { action: "kill_on", reason });
              onDone();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Working…" : halted ? "Yes, reset" : "STOP THE ROBOT"}
        </button>
        {err && <span className="rc-error">{err}</span>}
      </div>
    </div>
  );
}

// ───────────────────────────── manual order (replaces prompt()/alert())

export function ManualOrderForm({ onDone }: { onDone?: () => void }) {
  const [symbol, setSymbol] = useState("BTC/USD");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("0.001");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div style={{ marginTop: 12 }}>
      <div className="rc-form-grid">
        <label className="rc-field">
          Coin
          <select className="rc-input" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="rc-field">
          Side
          <select className="rc-input" value={side} onChange={(e) => setSide(e.target.value as "buy" | "sell")}>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </label>
        <label className="rc-field">
          Quantity
          <input className="rc-input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
      </div>
      {!confirming ? (
        <button className="cf-order-button" onClick={() => { setMsg(null); setConfirming(true); }} disabled={!(Number(qty) > 0)}>
          Place manual paper order
        </button>
      ) : (
        <div className="rc-row">
          <span className="rc-note">
            {side.toUpperCase()} {qty} {symbol} at market on Alpaca PAPER?
          </span>
          <button
            className="rc-btn primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await postJson<{ message: string }>("/api/crypto-floor/place-order", { symbol, side, qty });
                setMsg({ ok: true, text: r.message });
                onDone?.();
              } catch (e) {
                setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
              } finally {
                setBusy(false);
                setConfirming(false);
              }
            }}
          >
            {busy ? "Sending…" : "Confirm"}
          </button>
          <button className="rc-btn" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      )}
      {msg && <p className={msg.ok ? "rc-ok" : "rc-error"} style={{ marginTop: 8 }}>{msg.text}</p>}
      <p className="cf-footnote">Manual orders are booked as MANUAL — never mixed into a desk&apos;s ledger.</p>
    </div>
  );
}

// ───────────────────────────── ROBOT tab

const EVENT_TONE: Record<string, string> = {
  order_filled: "good",
  shadow_fill: "good",
  order_rejected: "red",
  system: "red",
  kill_switch: "red",
  halt: "warn",
  data_stale: "warn",
  param_change: "good",
};

export function RobotView({
  robot,
  onRefresh,
  onTalk,
  onLab,
}: {
  robot: RobotState;
  onRefresh: () => void;
  onTalk: (t: ChatTarget) => void;
  onLab: (desk: string) => void;
}) {
  const [orderFilter, setOrderFilter] = useState<"all" | "paper" | "shadow">("all");
  const [logDesk, setLogDesk] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const orders = robot.orders.filter((o) => orderFilter === "all" || o.mode === orderFilter);
  const events = robot.events.filter((e) => !logDesk || e.desk === logDesk);
  const positions = robot.desks.flatMap((d) => d.positions.map((p) => ({ ...p, desk: d })));

  async function act(key: string, body: unknown, done: string) {
    setBusy(key);
    setNote(null);
    try {
      await postJson("/api/crypto-floor/control", body);
      setNote({ ok: true, text: done });
      onRefresh();
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {note && <p className={note.ok ? "rc-ok" : "rc-error"} style={{ margin: "6px 0" }}>{note.text}</p>}
      <div className="rc-grid">
        {robot.desks.map((d) => {
          const lead = d.agents[1];
          return (
            <section key={d.id} className="cf-panel rc-desk" style={{ "--desk-color": d.color } as CSSProperties}>
              <div className="rc-desk-head">
                <div>
                  <h3>{d.name}</h3>
                  <p>
                    {d.strategyLabel} · {d.strategy} v{d.version} · {usd(d.capital)} paper
                  </p>
                </div>
                <div className="rc-badges">
                  <span className={`rc-badge ${d.enabled ? "on" : "off"}`}>{d.enabled ? "ON" : "OFF"}</span>
                  {d.pausedUntil && <span className="rc-badge warn">PAUSED → {hhmm(d.pausedUntil)}</span>}
                  {robot.killSwitch.halted && <span className="rc-badge red">KILL SWITCH</span>}
                  <span className="cf-paper">PAPER</span>
                </div>
              </div>
              <div className="rc-stats">
                <div>
                  <small>Equity</small>
                  <b>{usd(d.equity)}</b>
                </div>
                <div>
                  <small>Today</small>
                  <b className={tone(d.dayPnl)}>{usd(d.dayPnl, true)}</b>
                </div>
                <div>
                  <small>Realized</small>
                  <b className={tone(d.realizedPnl)}>{usd(d.realizedPnl, true)}</b>
                </div>
                <div>
                  <small>7d trades · win</small>
                  <b>
                    {d.stats7d.trades} · {d.stats7d.winRate === null ? "—" : `${Math.round(d.stats7d.winRate * 100)}%`}
                  </b>
                </div>
              </div>
              <p className="rc-summary">{d.summary}</p>
              {d.pauseReason && <p className="rc-warn" style={{ marginTop: 6 }}>{d.pauseReason}</p>}
              {d.positions.length > 0 ? (
                <div className="cf-table-scroll" style={{ marginTop: 8 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Coin</th>
                        <th>Qty</th>
                        <th>Entry</th>
                        <th>Now</th>
                        <th>P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.positions.map((p) => (
                        <tr key={p.symbol}>
                          <td>
                            {p.symbol}
                            {p.tranches && p.tranches > 1 ? ` ×${p.tranches}` : ""}
                          </td>
                          <td>{p.qty.toPrecision(5)}</td>
                          <td>{usd(p.avgEntryPrice)}</td>
                          <td>{usd(p.currentPrice)}</td>
                          <td className={tone(p.unrealizedPnl)}>
                            {usd(p.unrealizedPnl, true)} ({pct(p.unrealizedPnlPct)})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rc-note" style={{ marginTop: 8 }}>No open positions.</p>
              )}
              {d.lastEvent && (
                <p className="cf-footnote">
                  {ago(d.lastEvent.ts)} — {d.lastEvent.title}
                </p>
              )}
              <details className="rc-params">
                <summary>Settings (v{d.version})</summary>
                <dl>
                  {Object.entries(d.params).map(([k, v]) => (
                    <div key={k} style={{ display: "contents" }}>
                      <dt>{k}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              <div className="rc-actions">
                <button className="rc-btn primary small" onClick={() => onTalk({ thread: d.id as ChatTarget["thread"], agent: lead?.name ?? null })}>
                  Talk to {lead?.name ?? "the lead"}
                </button>
                <button className="rc-btn small" onClick={() => onLab(d.id)}>
                  Backtest / test settings
                </button>
                <button
                  className="rc-btn small"
                  disabled={busy !== null}
                  onClick={() => {
                    if (d.enabled && !window.confirm(`Switch ${d.name} OFF? It stops opening new positions; exits keep running.`)) return;
                    void act(`desk-${d.id}`, { action: d.enabled ? "desk_off" : "desk_on", desk: d.id }, `${d.name} switched ${d.enabled ? "off" : "on"}.`);
                  }}
                >
                  {busy === `desk-${d.id}` ? "…" : d.enabled ? "Switch off" : "Switch on"}
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="cf-expanded-grid">
        <Panel title="Open positions (all desks)" tag={`${positions.length} OPEN · PAPER`}>
          {positions.length ? (
            <div className="cf-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Desk</th>
                    <th>Coin</th>
                    <th>Since</th>
                    <th>Entry → now</th>
                    <th>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={`${p.desk.id}-${p.symbol}`}>
                      <td style={{ color: p.desk.color }}>{p.desk.name}</td>
                      <td>{p.symbol}</td>
                      <td>{p.enteredAt ? ago(p.enteredAt) : "—"}</td>
                      <td>
                        {usd(p.avgEntryPrice)} → {usd(p.currentPrice)}
                      </td>
                      <td className={tone(p.unrealizedPnl)}>
                        {usd(p.unrealizedPnl, true)} ({pct(p.unrealizedPnlPct)})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rc-note">The desks are flat. They buy when their setups appear — see the log for what each scout is watching.</p>
          )}
        </Panel>

        <Panel title="Daily brief" tag="EMAIL · 13:00 UTC">
          <p className="rc-note">
            {robot.report
              ? `Last brief ${robot.report.day}: ${robot.report.email_status}${robot.report.email_to ? ` to ${robot.report.email_to}` : ""}${robot.report.error ? ` — ${robot.report.error}` : ""}.`
              : "The first brief goes out at 13:00 UTC (8 AM Central) to awad@apixis.dev."}
          </p>
          <div className="rc-row" style={{ marginTop: 10 }}>
            <button
              className="rc-btn"
              disabled={busy !== null}
              onClick={async () => {
                setBusy("report");
                setNote(null);
                try {
                  const r = await postJson<{ emailed: boolean; emailTo: string; error?: string }>("/api/crypto-floor/review", {});
                  setNote({ ok: r.emailed, text: r.emailed ? `Today's brief sent to ${r.emailTo}.` : r.error ?? "Not sent." });
                  onRefresh();
                } catch (e) {
                  setNote({ ok: false, text: e instanceof Error ? e.message : "Failed" });
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "report" ? "Sending…" : "Send today's brief now"}
            </button>
          </div>
          <h3 style={{ fontSize: 12, marginTop: 14 }}>What the robot learned</h3>
          {robot.paramChanges.length ? (
            robot.paramChanges.slice(0, 6).map((c, i) => (
              <p key={i} className="cf-footnote">
                {dayHhmm(c.created_at)} · {(c.desk ?? "floor").toUpperCase()} v{c.version ?? "?"} ({c.source}) — {c.reason}
              </p>
            ))
          ) : (
            <p className="cf-footnote">No setting changes yet. The daily review tunes momentum and dip thresholds once a desk has 3+ closed trades in 7 days.</p>
          )}
        </Panel>

        <Panel title="Robot trades" tag="ALPACA PAPER + TESTS">
          <div className="rc-row" style={{ marginBottom: 8 }}>
            {(["all", "paper", "shadow"] as const).map((f) => (
              <button key={f} className="rc-btn small" aria-pressed={orderFilter === f} onClick={() => setOrderFilter(f)}>
                {f === "all" ? "All" : f === "paper" ? "Paper orders" : "Strategy tests"}
              </button>
            ))}
          </div>
          {orders.length ? (
            <div className="cf-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Desk</th>
                    <th>Side</th>
                    <th>Coin</th>
                    <th>Qty</th>
                    <th>Status</th>
                    <th>Fill</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.client_order_id} title={`${o.reason ?? ""}${o.error ? `\n${o.error}` : ""}`}>
                      <td>{dayHhmm(o.created_at)}</td>
                      <td>
                        {(o.desk ?? o.book).toUpperCase()} {o.mode === "shadow" ? <span className="rc-badge test">TEST</span> : o.book === "manual" ? <span className="rc-badge">MANUAL</span> : null}
                      </td>
                      <td className={o.side === "buy" ? "cf-positive" : "cf-negative"}>{o.side.toUpperCase()}</td>
                      <td>{o.symbol}</td>
                      <td>{(o.filled_qty || o.qty).toPrecision(5)}</td>
                      <td>{o.status}</td>
                      <td>{o.filled_avg_price ? usd(o.filled_avg_price) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rc-note">No robot orders yet. Each desk buys only when its own setup appears.</p>
          )}
        </Panel>

        <Panel title="Robot log" tag="EVERY DECISION">
          <div className="rc-row" style={{ marginBottom: 8 }}>
            <select className="rc-input" style={{ maxWidth: 200 }} value={logDesk} onChange={(e) => setLogDesk(e.target.value)} aria-label="Filter log by desk">
              <option value="">All desks</option>
              {robot.desks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="rc-log">
            {events.length ? (
              events.slice(0, 80).map((e) => (
                <div className="rc-log-line" key={e.id}>
                  <time title={e.ts}>{dayHhmm(e.ts)}</time>
                  <span>
                    <em className={`rc-chip ${EVENT_TONE[e.type] ?? ""}`}>{e.type.replace("_", " ")}</em>
                    {e.agent ? <b>{e.agent}: </b> : null}
                    {e.title}
                  </span>
                </div>
              ))
            ) : (
              <p className="rc-note">No events yet.</p>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

// ───────────────────────────── CHAT tab

type ChatMessage = { id: string; created_at: string; agent: string | null; role: "owner" | "agent" | "system"; content: string };

const SUGGESTIONS: Record<string, string[]> = {
  floor: [
    "What is each desk watching right now?",
    "Which desk is doing best this week, and why?",
    "Backtest every desk over 30 days and tell me who's strongest.",
  ],
  desk: [
    "What are you watching, and how close is your next entry?",
    "Backtest a tighter stop over 30 days. Does it help?",
    "Start a 7-day test of the setting you think is best.",
    "Walk me through your last trade.",
  ],
};

export function ChatView({ robot, target, setTarget }: { robot: RobotState; target: ChatTarget; setTarget: (t: ChatTarget) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const desk = robot.desks.find((d) => d.id === target.thread) ?? null;
  const agentName = target.thread === "floor" ? "Desk leads" : target.agent ?? desk?.agents[1]?.name ?? "Lead";

  async function load(thread: string) {
    try {
      const res = await fetch(`/api/crypto-floor/chat?thread=${thread}`, { cache: "no-store" });
      const body = (await res.json()) as { messages?: ChatMessage[]; error?: string };
      if (!res.ok) throw new Error(body.error || "Could not load the conversation");
      setMessages(body.messages ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load the conversation");
    }
  }
  useEffect(() => {
    setErr(null);
    setMessages([]);
    void load(target.thread);
  }, [target.thread]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setErr(null);
    const optimistic: ChatMessage = { id: `local-${Date.now()}`, created_at: new Date().toISOString(), agent: null, role: "owner", content: trimmed };
    setMessages((m) => [...m, optimistic]);
    setText("");
    try {
      await postJson("/api/crypto-floor/chat", { thread: target.thread, agent: target.thread === "floor" ? null : target.agent, message: trimmed, requestId: crypto.randomUUID() });
      await load(target.thread);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No reply");
    } finally {
      setSending(false);
    }
  }

  const threads: ChatTarget["thread"][] = ["floor", "samurai", "neon", "orbit", "phantom"];
  return (
    <Panel title={`Talk to ${target.thread === "floor" ? "the desk leads" : `${agentName} · ${desk?.name ?? ""}`}`} tag={robot.aiConnected ? "LIVE AGENTS · PAPER" : "AI NOT CONNECTED"}>
      <div className="rc-chat">
        <div>
          <div className="rc-threads" role="tablist" aria-label="Who to talk to">
            {threads.map((t) => {
              const d = robot.desks.find((x) => x.id === t);
              return (
                <button key={t} aria-pressed={target.thread === t} style={d ? { color: d.color } : undefined} onClick={() => setTarget({ thread: t, agent: d?.agents[1]?.name ?? null })}>
                  {t === "floor" ? "Whole floor (4 leads)" : d?.name ?? t.toUpperCase()}
                </button>
              );
            })}
          </div>
          {desk && (
            <div className="rc-agents">
              {desk.agents.map((a) => (
                <button key={a.name} aria-pressed={(target.agent ?? desk.agents[1]?.name) === a.name} onClick={() => setTarget({ thread: target.thread, agent: a.name })}>
                  {a.name}
                  <small>{a.role}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="rc-messages" ref={listRef}>
          {messages.length === 0 && !sending && (
            <div className="rc-note">
              {target.thread === "floor"
                ? "Ask the four desk leads anything — how the floor is doing, what to test next, why a trade happened."
                : `${agentName} runs on live floor data. They can backtest settings on real Alpaca history and start shadow tests. Promoting a test onto the live desk stays your button in the Lab.`}
              <div className="rc-suggestions" style={{ marginTop: 10 }}>
                {(target.thread === "floor" ? SUGGESTIONS.floor : SUGGESTIONS.desk).map((s) => (
                  <button key={s} onClick={() => void send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`rc-msg ${m.role === "owner" ? "owner" : "agent"}`}>
              <header>{m.role === "owner" ? "YOU" : m.agent === "LEADS" ? "DESK LEADS" : m.agent ?? "AGENT"} · {hhmm(m.created_at)}</header>
              <RichText text={m.content} />
            </div>
          ))}
          {sending && (
            <div className="rc-msg agent">
              <header>{agentName.toUpperCase()}</header>
              Thinking… (backtests can take ~20s)
            </div>
          )}
        </div>
        <div>
          {err && <p className="rc-error" style={{ marginBottom: 6 }}>{err}</p>}
          <div className="rc-compose">
            <textarea
              className="rc-input"
              placeholder={target.thread === "floor" ? "Message the desk leads…" : `Message ${agentName}…`}
              value={text}
              maxLength={4000}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(text);
                }
              }}
            />
            <button className="rc-btn primary" disabled={sending || !text.trim()} onClick={() => void send(text)}>
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ───────────────────────────── LAB tab

type BacktestResponse = {
  line: string;
  baselineLine: string | null;
  params: Record<string, number | boolean>;
  result: { returnPct: number; trades: number; winRate: number | null; avgTradePct: number | null; maxDrawdownPct: number; openAtEnd: number; recentTrades: Array<{ symbol: string; entryAt: string; exitAt: string; pnlPct: number; exitReason: string | null }> };
};

export function LabView({ robot, desk: initialDesk, onRefresh }: { robot: RobotState; desk: string; onRefresh: () => void }) {
  const [deskId, setDeskId] = useState(initialDesk);
  const desk = robot.desks.find((d) => d.id === deskId) ?? robot.desks[0];
  const catalog = robot.catalog.find((c) => c.desk === desk?.id);
  const [values, setValues] = useState<Record<string, number | boolean>>(desk?.params ?? {});
  const [days, setDays] = useState(30);
  const [bt, setBt] = useState<BacktestResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testName, setTestName] = useState("");
  const [testDays, setTestDays] = useState(7);

  useEffect(() => setDeskId(initialDesk), [initialDesk]);
  useEffect(() => {
    setValues(desk?.params ?? {});
    setBt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deskId]);

  const overrides = useMemo(() => {
    const out: Record<string, number | boolean> = {};
    for (const [k, v] of Object.entries(values)) if (desk && desk.params[k] !== v) out[k] = v;
    return out;
  }, [values, desk]);

  if (!desk || !catalog) return <p className="rc-note">No desks configured.</p>;

  async function control(key: string, body: unknown, ok: string) {
    setBusy(key);
    setMsg(null);
    try {
      await postJson("/api/crypto-floor/control", body);
      setMsg({ ok: true, text: ok });
      onRefresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(null);
    }
  }

  const experiments = robot.experiments;
  return (
    <div className="cf-expanded-grid">
      <Panel title="Strategy tests" tag="SHADOW BOOKS · SIMULATED FILLS">
        <p className="rc-note">
          A test runs a copy of a desk with different settings next to the live desk, every 5 minutes, with simulated fills — no broker orders. Desk agents can start tests from chat. Promoting a test onto the live paper desk is your call.
        </p>
        {msg && <p className={msg.ok ? "rc-ok" : "rc-error"} style={{ marginTop: 8 }}>{msg.text}</p>}
        {experiments.length ? (
          <div className="cf-table-scroll" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Desk</th>
                  <th>Status</th>
                  <th>Trades</th>
                  <th>Return</th>
                  <th>Ends</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {experiments.map((e) => {
                  const d = robot.desks.find((x) => x.id === e.desk);
                  const changed = d ? Object.entries(e.params).filter(([k, v]) => d.params[k] !== v) : [];
                  const deskReturn = d ? ((d.equity - d.capital) / d.capital) * 100 : null;
                  return (
                    <tr key={e.id} title={e.hypothesis ?? ""}>
                      <td>
                        {e.name}
                        <br />
                        <small style={{ color: "#7f9ab0" }}>
                          {changed.map(([k, v]) => `${k}=${String(v)}`).join(", ") || "same as live"} · by {e.proposed_by ?? "?"}
                        </small>
                      </td>
                      <td style={{ color: d?.color }}>{e.desk.toUpperCase()}</td>
                      <td>{e.status}</td>
                      <td>
                        {e.trades}
                        {e.open ? ` (+${e.open} open)` : ""}
                      </td>
                      <td className={tone(e.returnPct)}>
                        {pct(e.returnPct)}
                        <br />
                        <small style={{ color: "#7f9ab0" }}>desk {pct(deskReturn)}</small>
                      </td>
                      <td>{e.ends_at ? dayHhmm(e.ends_at) : "—"}</td>
                      <td>
                        <div className="rc-row" style={{ justifyContent: "flex-end" }}>
                          {e.status === "running" && (
                            <button className="rc-btn small" disabled={busy !== null} onClick={() => void control(`stop-${e.id}`, { action: "stop_experiment", id: e.id }, `Stopped "${e.name}".`)}>
                              Stop
                            </button>
                          )}
                          {(e.status === "running" || e.status === "stopped") && (
                            <button
                              className="rc-btn primary small"
                              disabled={busy !== null}
                              onClick={() => {
                                if (!window.confirm(`Promote "${e.name}" onto the live ${e.desk.toUpperCase()} paper desk? Its settings replace v${d?.version ?? "?"}.`)) return;
                                void control(`promote-${e.id}`, { action: "promote", id: e.id }, `${e.desk.toUpperCase()} now trades "${e.name}" settings.`);
                              }}
                            >
                              Promote
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rc-note" style={{ marginTop: 10 }}>No tests yet. Run a backtest on the right, or ask a desk lead in Chat to design one.</p>
        )}
      </Panel>

      <Panel title="Backtest a desk" tag="ALPACA HOURLY HISTORY">
        <div className="rc-form-grid">
          <label className="rc-field">
            Desk
            <select className="rc-input" value={desk.id} onChange={(e) => setDeskId(e.target.value)}>
              {robot.desks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.strategyLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="rc-field">
            History
            <select className="rc-input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[7, 14, 30, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} days
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="rc-form-grid">
          {Object.entries(catalog.bounds).map(([k, b]) => (
            <label className="rc-field" key={k} title={`${b.min} … ${b.max}`}>
              {b.label}
              {b.kind === "boolean" ? (
                <select className="rc-input" value={String(values[k])} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value === "true" }))}>
                  <option value="true">On</option>
                  <option value="false">Off</option>
                </select>
              ) : (
                <input
                  className="rc-input"
                  type="number"
                  min={b.min}
                  max={b.max}
                  step={b.kind === "integer" ? 1 : 0.05}
                  value={String(values[k] ?? "")}
                  onChange={(e) => setValues((v) => ({ ...v, [k]: Number(e.target.value) }))}
                />
              )}
            </label>
          ))}
        </div>
        <div className="rc-row">
          <button
            className="rc-btn primary"
            disabled={busy !== null}
            onClick={async () => {
              setBusy("bt");
              setMsg(null);
              setBt(null);
              try {
                setBt(await postJson<BacktestResponse>("/api/crypto-floor/lab", { desk: desk.id, overrides, days }));
              } catch (e) {
                setMsg({ ok: false, text: e instanceof Error ? e.message : "Backtest failed" });
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "bt" ? "Running…" : Object.keys(overrides).length ? "Backtest these settings" : "Backtest live settings"}
          </button>
          <button className="rc-btn" onClick={() => setValues(desk.params)}>
            Reset to live (v{desk.version})
          </button>
        </div>
        {bt && (
          <div style={{ marginTop: 12 }}>
            <p className="rc-ok">{bt.line}</p>
            {bt.baselineLine && <p className="rc-note" style={{ marginTop: 6 }}>Live settings: {bt.baselineLine}</p>}
            <div className="rc-stats">
              <div>
                <small>Return</small>
                <b className={tone(bt.result.returnPct)}>{pct(bt.result.returnPct)}</b>
              </div>
              <div>
                <small>Trades · win</small>
                <b>
                  {bt.result.trades} · {bt.result.winRate === null ? "—" : `${Math.round(bt.result.winRate * 100)}%`}
                </b>
              </div>
              <div>
                <small>Avg trade</small>
                <b className={tone(bt.result.avgTradePct)}>{pct(bt.result.avgTradePct)}</b>
              </div>
              <div>
                <small>Max drawdown</small>
                <b>{bt.result.maxDrawdownPct.toFixed(2)}%</b>
              </div>
            </div>
            {bt.result.recentTrades.slice(-6).map((t, i) => (
              <p key={i} className="cf-footnote">
                {t.symbol} {dayHhmm(t.entryAt)} → {dayHhmm(t.exitAt)} <span className={tone(t.pnlPct)}>{pct(t.pnlPct)}</span> {t.exitReason ? `· ${t.exitReason}` : ""}
              </p>
            ))}
            {Object.keys(overrides).length > 0 && (
              <div className="rc-row" style={{ marginTop: 10 }}>
                <input className="rc-input" style={{ maxWidth: 240 }} placeholder="Test name" value={testName} maxLength={80} onChange={(e) => setTestName(e.target.value)} />
                <select className="rc-input" style={{ maxWidth: 110 }} value={testDays} onChange={(e) => setTestDays(Number(e.target.value))} aria-label="Test length">
                  {[3, 7, 14, 30].map((n) => (
                    <option key={n} value={n}>
                      {n} days
                    </option>
                  ))}
                </select>
                <button
                  className="rc-btn primary"
                  disabled={busy !== null}
                  onClick={() =>
                    void control(
                      "start",
                      { action: "start_experiment", desk: desk.id, name: testName.trim() || `${desk.name} ${Object.entries(overrides).map(([k, v]) => `${k}=${v}`).join(" ")}`.slice(0, 80), overrides, days: testDays },
                      "Forward test started. It trades simulated fills next to the live desk.",
                    )
                  }
                >
                  Start forward test
                </button>
              </div>
            )}
          </div>
        )}
        <p className="cf-footnote">Backtests fill at the hourly close ± 0.05% and ignore fees and partial fills. Use them to compare settings, not to predict profit.</p>
      </Panel>
    </div>
  );
}
