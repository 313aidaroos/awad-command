"use client";
/**
 * Crypto Floor robot console (v2, 2026-10-02): status bar + kill switch, desks / trades / log (ROBOT tab),
 * talk to the desk agents (CHAT tab), backtests and strategy tests (LAB tab), in-page manual order form.
 * Data: GET /api/crypto-floor/snapshot (robot), owner actions: /control, /lab, /chat, /review, /place-order.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { assetClass } from "@/lib/crypto-floor/assets";
import type { DeskView, RobotState } from "@/lib/crypto-floor/state";
import type { StrategyResult } from "@/lib/crypto-floor/strategyStats";

export type ChatTarget = { thread: "floor" | "samurai" | "neon" | "orbit" | "phantom" | "ronin"; agent: string | null };

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

const ASSET_LABEL = { crypto: "CRYPTO", stock: "STOCK", option: "OPTION" } as const;
const ASSET_COLOR = { crypto: "#f7b955", stock: "#5fd4ff", option: "#c792ff" } as const;
/** Asset-class chip (crypto 24/7 · stock regular+extended · option regular hours, long premium). */
function AssetChip({ symbol, kind }: { symbol?: string; kind?: keyof typeof ASSET_LABEL }) {
  const k = kind ?? assetClass(symbol ?? "");
  return (
    <span className="rc-badge" style={{ borderColor: ASSET_COLOR[k], color: ASSET_COLOR[k] }}>
      {ASSET_LABEL[k]}
    </span>
  );
}
const holdFmt = (h: number | null) => (h === null ? "—" : h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`);
const symLabel = (s: string) => (s.includes("/") ? s.split("/")[0] : s);

/** Desk loss-cap status line: cap %, $ left today, or HALTED. */
function LossCapLine({ d }: { d: DeskView }) {
  const c = d.lossCap;
  return (
    <span className={c.atCap ? "cf-negative" : ""} title="Hard daily loss cap (owner-only). At the cap the desk opens nothing new until the next UTC day; exits keep running.">
      {c.status === "HALTED" ? (
        <b>LOSS CAP HALTED ({c.pct}%{c.usd !== null ? ` = ${usd(c.usd)}` : ""}) — no new positions until 00:00 UTC</b>
      ) : (
        <>
          Loss cap {c.pct}%{c.usd !== null ? ` (${usd(c.usd)})` : ""}
          {c.remainingUsd !== null ? ` · ${usd(c.remainingUsd)} left today` : ""}
        </>
      )}
    </span>
  );
}

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

// ───────────────────────────── trades + P/L box (always on top of the floor)

const qtyFmt = (q: number) => (q >= 1_000_000 ? `${(q / 1_000_000).toFixed(2)}M` : q >= 1000 ? q.toLocaleString(undefined, { maximumFractionDigits: 0 }) : q.toPrecision(4));
const priceFmt = (p: number | null) => (p === null ? "—" : p < 0.01 ? `$${p.toPrecision(4)}` : usd(p));

export function TradesBox({ robot }: { robot: RobotState }) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const deskOf = (id: string | null) => robot.desks.find((d) => d.id === id);
  const positions = robot.desks.flatMap((d) => d.positions.map((p) => ({ desk: d, p })));
  const fills = robot.orders.filter((o) => o.mode !== "shadow").slice(0, 12);
  const closed = robot.desks
    .flatMap((d) => d.recentTrades.map((t) => ({ desk: d, t })))
    .sort((a, b) => b.t.exitAt.localeCompare(a.t.exitAt))
    .slice(0, 8);
  const today = new Date().toISOString().slice(0, 10);
  const fillsToday = robot.orders.filter((o) => o.mode !== "shadow" && o.status === "filled" && (o.filled_at ?? o.created_at).slice(0, 10) === today).length;
  const f = robot.floor;
  const allTime = f.equity - f.capital;

  async function email() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await postJson<{ emailTo: string }>("/api/crypto-floor/email", {});
      setMsg({ ok: true, text: `Sent to ${r.emailTo}.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Email failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Trades & P/L" tag={`LIVE · ${robot.lastTickAt ? `updated ${ago(robot.lastTickAt)}` : "no tick yet"}`}>
      <div className="rc-row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="rc-stats" style={{ flex: "1 1 520px" }}>
          <div>
            <small>Floor value</small>
            <b>{usd(f.equity)}</b>
          </div>
          <div>
            <small>Today</small>
            <b className={tone(f.dayPnl)}>
              {usd(f.dayPnl, true)} <small>{pct(f.dayPnlPct)}</small>
            </b>
          </div>
          <div>
            <small>All time</small>
            <b className={tone(allTime)}>{usd(allTime, true)}</b>
          </div>
          <div>
            <small>Open P/L</small>
            <b className={tone(f.unrealizedPnl)}>{usd(f.unrealizedPnl, true)}</b>
          </div>
          <div>
            <small>Open · fills today</small>
            <b>
              {f.openPositions} · {fillsToday}
            </b>
          </div>
        </div>
        <div className="rc-row">
          <button className="rc-btn primary small" disabled={busy} onClick={() => void email()}>
            {busy ? "Sending…" : "Email me this"}
          </button>
          <button className="rc-btn small" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? "Hide details" : "Show details"}
          </button>
        </div>
      </div>
      {msg && <p className={msg.ok ? "rc-ok" : "rc-error"} style={{ marginTop: 6 }}>{msg.text}</p>}
      <p className="cf-footnote" style={{ marginTop: 6 }}>
        {robot.desks.map((d) => `${d.name} ${usd(d.equity - d.capital, true)}${d.dayPnl !== null ? ` (today ${usd(d.dayPnl, true)})` : ""}`).join(" · ")}
        {robot.coinbase.enabledDesks.length ? ` · REAL MONEY ${usd(robot.coinbase.pnlNow, true)}` : " · Real money off"}
      </p>
      {open && (
        <>
          <h4 style={{ margin: "12px 0 4px" }}>Open positions</h4>
          {positions.length ? (
            <div className="cf-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Symbol</th>
                    <th>Size</th>
                    <th>Entry</th>
                    <th>Now</th>
                    <th>P/L</th>
                    <th>Since</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(({ desk, p }) => (
                    <tr key={`${desk.id}-${p.symbol}`}>
                      <td style={{ color: desk.color }}>{desk.name}</td>
                      <td>
                        {symLabel(p.symbol)} <AssetChip kind={p.assetClass} />
                        <br />
                        <small style={{ color: "#7f9ab0" }}>{p.strategy ?? desk.strategy}</small>
                      </td>
                      <td>
                        {usd(p.qty * p.avgEntryPrice)}
                        <br />
                        <small style={{ color: "#7f9ab0" }}>{qtyFmt(p.qty)}</small>
                      </td>
                      <td>{priceFmt(p.avgEntryPrice)}</td>
                      <td>{priceFmt(p.currentPrice)}</td>
                      <td className={tone(p.unrealizedPnl)}>
                        {usd(p.unrealizedPnl, true)}
                        <br />
                        <small>{pct(p.unrealizedPnlPct)}</small>
                      </td>
                      <td>{p.enteredAt ? ago(p.enteredAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rc-note">No open positions.</p>
          )}

          <h4 style={{ margin: "12px 0 4px" }}>Latest orders</h4>
          {fills.length ? (
            <div className="cf-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Team</th>
                    <th>Side</th>
                    <th>Symbol</th>
                    <th>Amount</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Why</th>
                  </tr>
                </thead>
                <tbody>
                  {fills.map((o) => {
                    const d = deskOf(o.desk);
                    const px = o.filled_avg_price;
                    const q = o.filled_qty || o.qty;
                    return (
                      <tr key={o.client_order_id}>
                        <td>{dayHhmm(o.created_at)}</td>
                        <td style={{ color: d?.color }}>{(d?.name ?? o.desk ?? o.book).toUpperCase()}{o.mode === "live" ? " · REAL $" : ""}</td>
                        <td className={o.side === "buy" ? "cf-positive" : "cf-negative"}>{o.side.toUpperCase()}</td>
                        <td>
                          {symLabel(o.symbol)} <AssetChip symbol={o.symbol} />
                        </td>
                        <td>
                          {px ? usd(q * px * (assetClass(o.symbol) === "option" ? 100 : 1)) : "—"}
                          <br />
                          <small style={{ color: "#7f9ab0" }}>{qtyFmt(q)}</small>
                        </td>
                        <td>{priceFmt(px)}</td>
                        <td>{o.status}</td>
                        <td>
                          <small>{(o.reason ?? o.error ?? "").slice(0, 120)}</small>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rc-note">No orders yet.</p>
          )}

          <h4 style={{ margin: "12px 0 4px" }}>Closed trades</h4>
          {closed.length ? (
            closed.map(({ desk, t }, i) => (
              <p key={i} className="cf-footnote">
                <b style={{ color: desk.color }}>{desk.name}</b> {symLabel(t.symbol)} <AssetChip kind={t.assetClass} /> <small>{t.strategy}</small> · {dayHhmm(t.entryAt)} → {dayHhmm(t.exitAt)} ·{" "}
                <span className={tone(t.pnl)}>
                  {usd(t.pnl, true)} ({pct(t.pnlPct)})
                </span>
                {t.exitReason ? ` · ${t.exitReason}` : ""}
              </p>
            ))
          ) : (
            <p className="rc-note">No closed trades yet — P/L above is open (unrealized) until a position is sold.</p>
          )}
        </>
      )}
    </Panel>
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
      <span className={`rc-pill ${robot.noOwnAccount ? "halted" : status.toLowerCase()}`} title={robot.noOwnAccountMessage ?? robot.lastTickTitle ?? ""}>
        <i /> ROBOT {robot.noOwnAccount ? "NOT TRADING · NO OWN ACCOUNT" : status}
      </span>
      <div className="rc-bar-main">
        <span>
          Last tick <b>{ago(robot.lastTickAt)}</b>
          {robot.nextTickInSec !== null && status !== "OFFLINE" ? <> · next in ~{Math.max(1, Math.round(robot.nextTickInSec / 60))}m</> : null} · {robot.ticks24h} ticks/24h ({Math.round(robot.uptimePct)}%) · Floor <b>{usd(f.equity)}</b> · today{" "}
          <b className={tone(f.dayPnl)}>{usd(f.dayPnl, true)}</b> ({pct(f.dayPnlPct)}) · <b>{f.openPositions}</b> open
        </span>
        <span className="rc-bar-watch">{robot.watchLine ? `Watching: ${robot.watchLine}` : "Watching: waiting for the first v2 tick"}</span>
        <span className="rc-bar-watch">
          Crypto 24/7 · US stocks <b>{robot.session === "regular" ? "REGULAR HOURS" : robot.session === "extended" ? "EXTENDED HOURS (limit orders)" : "CLOSED"}</b> · options {robot.session === "regular" ? "open" : "closed"} · up to {robot.limits.maxOrdersPerTick} orders/tick, {robot.limits.maxOpenPositionsTotal} open ·{" "}
          {robot.desks.filter((d) => d.lossCap.atCap).length ? (
            <b className="cf-negative">LOSS CAP HIT: {robot.desks.filter((d) => d.lossCap.atCap).map((d) => d.name).join(", ")}</b>
          ) : (
            <>loss caps OK ({robot.desks.map((d) => `${d.name} ${d.lossCap.pct}%`).join(", ")})</>
          )}
        </span>
        <span className="rc-bar-watch">
          {robot.coinbase.enabledDesks.length ? (
            <b className="cf-negative">REAL MONEY ON (Coinbase): {robot.coinbase.enabledDesks.map((d) => d.toUpperCase()).join(", ")} · ${robot.coinbase.exposureUsd.toFixed(2)} of ${robot.coinbase.limits.maxTotalUsd} in use</b>
          ) : robot.coinbase.ok ? (
            <>Coinbase connected · {usd(robot.coinbase.totalUsd)} · real money OFF — all teams trade Alpaca paper</>
          ) : robot.coinbase.configured ? (
            <>Coinbase error: {robot.coinbase.error ?? "unknown"} · real money OFF</>
          ) : (
            <>Coinbase not connected · real money OFF — all teams trade Alpaca paper</>
          )}
        </span>
      </div>
      <div className="rc-bar-actions">
        <button className="rc-btn primary" onClick={onTalk}>
          Talk to the team
        </button>
        <button className={`rc-btn ${robot.killSwitch.halted ? "" : "danger"}`} onClick={() => setKillOpen(!killOpen)}>
          {robot.killSwitch.halted ? "Reset kill switch" : "Kill switch"}
        </button>
      </div>
      {robot.noOwnAccount && (
        <p className="rc-warn red" role="alert" data-testid="no-own-account">
          <b>NO OWN ACCOUNT — the floor is not trading.</b> {robot.noOwnAccountMessage} Awad: create a new Alpaca paper account for the floor; Developer Bot then sets CRYPTO_FLOOR_ALPACA_API_KEY / CRYPTO_FLOOR_ALPACA_SECRET_KEY.
        </p>
      )}
      {robot.killSwitch.halted && (
        <p className="rc-warn red">
          KILL SWITCH ON since {robot.killSwitch.at ? dayHhmm(robot.killSwitch.at) : "?"} by {robot.killSwitch.by ?? "?"}: {robot.killSwitch.reason ?? "no reason"}. No orders until you reset it.
        </p>
      )}
      {robot.floorPause && <p className="rc-warn">Floor day-loss pause until {dayHhmm(robot.floorPause.until)} — no new entries, exits still run. {robot.floorPause.reason}</p>}
      {robot.dataStale && <p className="rc-warn">Market data stale — new entries blocked: {robot.dataStaleReason}</p>}
      {status === "STALE" && <p className="rc-warn">The robot has not ticked for {ago(robot.lastTickAt)}. Check the Vercel cron for /api/crypto-floor/tick.</p>}
      {robot.dedicatedAccount === true && !robot.noOwnAccount && (
        <p className="rc-note" style={{ margin: "4px 0 0" }}>Own Alpaca paper account · the floor manages only its own cf- orders and positions.</p>
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
  live_switch: "red",
  order_filled: "good",
  shadow_fill: "good",
  order_rejected: "red",
  system: "red",
  kill_switch: "red",
  halt: "warn",
  data_stale: "warn",
  param_change: "good",
  reconcile: "warn",
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
                  <p className="rc-lanes">
                    Strategies:{" "}
                    {d.lanes.map((l, i) => (
                      <span key={l.strategy} title={l.strategy}>
                        {i ? " + " : ""}
                        {l.label} <small>({l.strategy})</small>
                      </span>
                    ))}
                  </p>
                </div>
                <div className="rc-badges">
                  <span className={`rc-badge ${d.enabled ? "on" : "off"}`}>{d.enabled ? "ON" : "OFF"}</span>
                  {d.live.enabled && <span className="rc-badge red">REAL $ ON</span>}
                  {d.pausedUntil && <span className="rc-badge warn">PAUSED → {hhmm(d.pausedUntil)}</span>}
                  {d.lossCap.atCap && <span className="rc-badge red">LOSS CAP</span>}
                  {d.assets.crypto && <AssetChip kind="crypto" />}
                  {d.assets.stocks && <AssetChip kind="stock" />}
                  {d.assets.options && <AssetChip kind="option" />}
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
              <p className="cf-footnote rc-losscap">
                <LossCapLine d={d} />
                {d.assets.options ? <> · options max loss {usd(d.optionMaxLossUsd)} per position (long premium only, regular hours)</> : null}
              </p>
              <p className="rc-summary">{d.summary}</p>
              {d.pauseReason && <p className="rc-warn" style={{ marginTop: 6 }}>{d.pauseReason}</p>}
              {d.positions.length > 0 ? (
                <div className="cf-table-scroll" style={{ marginTop: 8 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Symbol</th>
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
                            {p.tranches && p.tranches > 1 ? ` ×${p.tranches}` : ""} <AssetChip kind={p.assetClass} />
                            <br />
                            <small style={{ color: "#7f9ab0" }}>{p.strategy ?? d.strategy}</small>
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
                <summary>{d.spec ? "Strategy" : "Settings"} (v{d.version})</summary>
                {d.spec ? (
                  <pre className="cf-footnote" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(d.spec, null, 1)}</pre>
                ) : (
                  <dl>
                    {Object.entries(d.params).map(([k, v]) => (
                      <div key={k} style={{ display: "contents" }}>
                        <dt>{k}</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
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
        <StrategyResultsPanel robot={robot} />
        <CoinbasePanel robot={robot} onRefresh={onRefresh} />
        <Panel title="Open positions (all desks)" tag={`${positions.length} OPEN · PAPER`}>
          {positions.length ? (
            <div className="cf-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Desk</th>
                    <th>Symbol</th>
                    <th>Since</th>
                    <th>Entry → now</th>
                    <th>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={`${p.desk.id}-${p.symbol}`}>
                      <td style={{ color: p.desk.color }}>{p.desk.name}</td>
                      <td>
                        {p.symbol} <AssetChip kind={p.assetClass} />
                      </td>
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
                    <th>Symbol</th>
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
                      <td>
                        {o.symbol} <AssetChip symbol={o.symbol} />
                        {o.client_order_id.startsWith("rc-") ? <span className="rc-badge warn">RECONCILE</span> : null}
                      </td>
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
                    <EventDetail p={e.payload} />
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

// ───────────────────────────── REAL MONEY (Coinbase)

/** Order / reconcile / loss-cap details the tick writes into event payloads (tick.ts → events → here). */
function EventDetail({ p }: { p: Record<string, unknown> }) {
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const parts: string[] = [];
  if (p.assetClass === "crypto" || p.assetClass === "stock" || p.assetClass === "option") parts.push(ASSET_LABEL[p.assetClass]);
  if (typeof p.orderType === "string") parts.push(`${p.orderType}${typeof p.timeInForce === "string" ? `/${p.timeInForce}` : ""}${p.extendedHours === true ? " · extended hours" : ""}`);
  if (num(p.limitPrice) !== null) parts.push(`limit ${usd(num(p.limitPrice))}`);
  if (num(p.maxLossUsd) !== null) parts.push(`max loss ${usd(num(p.maxLossUsd))}`);
  if (p.noBrokerOrder === true) parts.push(`reconcile: book ${num(p.bookQty) ?? "?"} → broker ${num(p.brokerQty) ?? "?"} (claimed ${num(p.claimedQty) ?? "?"}, −${num(p.reduceBy) ?? "?"}) · ledger only, nothing sent`);
  if (p.lossCap === true) parts.push("daily loss cap");
  if (p.noOwnAccount === true) parts.push("no own Alpaca account");
  return parts.length ? <small style={{ display: "block", color: "#7f9ab0" }}>{parts.join(" · ")}</small> : null;
}

/** Per-strategy results, side by side (state.strategies → this panel). */
function StrategyResultsPanel({ robot }: { robot: RobotState }) {
  const [win, setWin] = useState<"d7" | "all">("d7");
  const rows: StrategyResult[] = robot.strategies[win];
  return (
    <Panel title="Strategy results (side by side)" tag={win === "d7" ? "LAST 7 DAYS" : "ALL TIME"}>
      <div className="rc-row" style={{ marginBottom: 8 }}>
        <button className="rc-btn small" aria-pressed={win === "d7"} onClick={() => setWin("d7")}>7 days</button>
        <button className="rc-btn small" aria-pressed={win === "all"} onClick={() => setWin("all")}>All time</button>
      </div>
      <div className="cf-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Desk · strategy</th>
              <th>Assets</th>
              <th>Trades</th>
              <th>Win</th>
              <th>P/L</th>
              <th>Max DD</th>
              <th>Avg hold</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = robot.desks.find((x) => x.id === r.desk);
              return (
                <tr key={`${r.desk}-${r.strategy}`}>
                  <td>
                    <b style={{ color: d?.color }}>{d?.name ?? r.desk.toUpperCase()}</b> {r.label}
                    <br />
                    <small style={{ color: "#7f9ab0" }}>{r.strategy}</small>
                  </td>
                  <td>{r.assetClasses.map((k) => <AssetChip key={k} kind={k} />)}</td>
                  <td>{r.trades}</td>
                  <td>{r.winRate === null ? "—" : `${Math.round(r.winRate * 100)}%`} <small>({r.wins})</small></td>
                  <td className={tone(r.pnl)}>{usd(r.pnl, true)}</td>
                  <td>{usd(-r.maxDrawdown)}</td>
                  <td>{holdFmt(r.avgHoldHours)}</td>
                  <td>{r.open}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="cf-footnote">Closed round trips from the floor&apos;s own ledger, grouped by the strategy that opened them. The same table goes out in the daily email.</p>
    </Panel>
  );
}

function CoinbasePanel({ robot, onRefresh }: { robot: RobotState; onRefresh: () => void }) {
  const cb = robot.coinbase;
  const [limits, setLimits] = useState({ maxTotalUsd: String(cb.limits.maxTotalUsd), maxTradeUsd: String(cb.limits.maxTradeUsd), dayLossUsd: String(cb.limits.dayLossUsd) });
  const [arming, setArming] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const livePositions = robot.desks.flatMap((d) => d.live.positions.map((p) => ({ ...p, desk: d })));

  async function control(key: string, body: unknown, ok: string) {
    setBusy(key);
    setMsg(null);
    try {
      await postJson("/api/crypto-floor/control", body);
      setMsg({ ok: true, text: ok });
      setArming(null);
      setPhrase("");
      onRefresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel title="Real money · Coinbase" tag={cb.enabledDesks.length ? "REAL MONEY ON" : "REAL MONEY OFF"}>
      {!cb.configured ? (
        <div className="rc-note">
          <p>
            <b>Not connected.</b> The teams trade Alpaca paper. To get Coinbase ready (trading stays OFF until you switch a team on):
          </p>
          <ol style={{ paddingLeft: 18, marginTop: 6, lineHeight: 1.8 }}>
            <li>
              Safest: in Coinbase make a <b>separate portfolio</b> and move in only the money the robot may ever use. Then in Coinbase Developer Platform → API keys, create a <b>Secret API key</b> for that portfolio.
            </li>
            <li>
              Permissions: <b>View</b> and <b>Trade</b> only. <b>Never Transfer</b> — the robot refuses a key that can move money out. Leave the IP allowlist empty (Vercel has no fixed IP).
            </li>
            <li>
              Vercel → awad-command → Environment Variables: <code>COINBASE_API_KEY_NAME</code> = the key name/id, <code>COINBASE_API_PRIVATE_KEY</code> = the private key. Production + Preview. Redeploy.
            </li>
            <li>Within 5 minutes this panel shows your Coinbase balances.</li>
          </ol>
        </div>
      ) : (
        <>
          <p className="rc-note">
            {cb.ok ? (
              <>
                Connected{cb.asOf ? ` (checked ${ago(cb.asOf)})` : ""} · total {usd(cb.totalUsd)} · USD available {usd(cb.usdAvailable)} · key: {cb.canTrade ? "trade ✓" : "no trade ✗"} · {cb.canTransfer ? <b className="cf-negative">CAN TRANSFER — trading refused, make a new key</b> : "no transfer ✓"}
              </>
            ) : (
              <span className="rc-error">Coinbase error: {cb.error ?? "not reachable"}</span>
            )}
          </p>
          {cb.holdings.length > 0 && (
            <p className="cf-footnote">
              {cb.holdings.map((h) => `${h.currency} ${h.available}${h.usdValue !== null ? ` (${usd(h.usdValue)})` : ""}`).join(" · ")}
            </p>
          )}
        </>
      )}
      {cb.blocked && cb.enabledDesks.length > 0 && <p className="rc-warn red">Real-money trading blocked: {cb.blocked}</p>}
      {cb.pausedUntil && <p className="rc-warn">Real-money buys paused until {dayHhmm(cb.pausedUntil)} (daily loss limit).</p>}

      <h3 style={{ fontSize: 12, margin: "12px 0 6px" }}>Real-money switch per team</h3>
      <div className="cf-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Real money</th>
              <th>Open (real)</th>
              <th>P&L (real)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {robot.desks.map((d) => (
              <tr key={d.id}>
                <td style={{ color: d.color }}>{d.name}</td>
                <td>{d.live.enabled ? <b className="cf-negative">ON</b> : "OFF · paper"}</td>
                <td>{d.live.positions.length}</td>
                <td className={tone(d.live.realizedPnl + d.live.unrealizedPnl)}>{usd(d.live.realizedPnl + d.live.unrealizedPnl, true)}</td>
                <td>
                  {d.live.enabled ? (
                    <button className="rc-btn small" disabled={busy !== null} onClick={() => void control(`off-${d.id}`, { action: "live_off", desk: d.id }, `${d.name} real money OFF. It keeps selling coins it holds; no new real buys.`)}>
                      Switch off
                    </button>
                  ) : (
                    <button className="rc-btn danger small" disabled={busy !== null || !cb.configured} onClick={() => { setArming(d.id); setPhrase(""); setMsg(null); }}>
                      Go live…
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {arming && (
        <div className="rc-warn red" style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <span>
            {arming.toUpperCase()} will trade <b>REAL MONEY</b> on Coinbase: at most {usd(cb.limits.maxTradeUsd)} per buy, {usd(cb.limits.maxTotalUsd)} in open positions across all live teams, and no new buys after −{usd(cb.limits.dayLossUsd)} in a day. Alpaca paper keeps running too. Type <b>REAL MONEY</b> to confirm.
          </span>
          <input className="rc-input" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="REAL MONEY" aria-label="Type REAL MONEY to confirm" />
          <div className="rc-row">
            <button className="rc-btn danger" disabled={phrase !== "REAL MONEY" || busy !== null} onClick={() => void control(`on-${arming}`, { action: "live_on", desk: arming, confirm: phrase }, `${arming.toUpperCase()} is trading real money from the next tick.`)}>
              {busy ? "Checking Coinbase key…" : "Switch on real money"}
            </button>
            <button className="rc-btn" onClick={() => setArming(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: 12, margin: "12px 0 6px" }}>Real-money limits (the robot can never go past these)</h3>
      <div className="rc-form-grid">
        <label className="rc-field">
          Most in open positions ($)
          <input className="rc-input" inputMode="decimal" value={limits.maxTotalUsd} onChange={(e) => setLimits((l) => ({ ...l, maxTotalUsd: e.target.value }))} />
        </label>
        <label className="rc-field">
          Most per buy ($)
          <input className="rc-input" inputMode="decimal" value={limits.maxTradeUsd} onChange={(e) => setLimits((l) => ({ ...l, maxTradeUsd: e.target.value }))} />
        </label>
        <label className="rc-field">
          Stop for the day after losing ($)
          <input className="rc-input" inputMode="decimal" value={limits.dayLossUsd} onChange={(e) => setLimits((l) => ({ ...l, dayLossUsd: e.target.value }))} />
        </label>
      </div>
      <button
        className="rc-btn"
        disabled={busy !== null}
        onClick={() => void control("limits", { action: "live_limits", maxTotalUsd: Number(limits.maxTotalUsd), maxTradeUsd: Number(limits.maxTradeUsd), dayLossUsd: Number(limits.dayLossUsd) }, "Real-money limits saved.")}
      >
        Save limits
      </button>
      {msg && <p className={msg.ok ? "rc-ok" : "rc-error"} style={{ marginTop: 8 }}>{msg.text}</p>}
      {livePositions.length > 0 && (
        <div className="cf-table-scroll" style={{ marginTop: 10 }}>
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>Coin</th>
                <th>Entry → now</th>
                <th>P&L (real)</th>
              </tr>
            </thead>
            <tbody>
              {livePositions.map((p) => (
                <tr key={`${p.desk.id}-${p.symbol}`}>
                  <td style={{ color: p.desk.color }}>{p.desk.name}</td>
                  <td>{p.symbol}</td>
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
      )}
      <p className="cf-footnote">Only you can switch real money on, change these limits or press the kill switch (which stops Coinbase too). Agents can&apos;t. Coinbase has no paper trading — anything sent there is real.</p>
    </Panel>
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
    "What has your team learned so far? Read me your journal.",
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

  const threads: ChatTarget["thread"][] = ["floor", "samurai", "neon", "orbit", "phantom", "ronin"];
  return (
    <Panel title={`Talk to ${target.thread === "floor" ? "the desk leads" : `${agentName} · ${desk?.name ?? ""}`}`} tag={robot.aiConnected ? "LIVE AGENTS · PAPER" : "AI NOT CONNECTED"}>
      <div className="rc-chat">
        <div>
          <div className="rc-threads" role="tablist" aria-label="Who to talk to">
            {threads.map((t) => {
              const d = robot.desks.find((x) => x.id === t);
              return (
                <button key={t} aria-pressed={target.thread === t} style={d ? { color: d.color } : undefined} onClick={() => setTarget({ thread: t, agent: d?.agents[1]?.name ?? null })}>
                  {t === "floor" ? "Whole floor (5 leads)" : d?.name ?? t.toUpperCase()}
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
                ? "Ask the five desk leads anything — how the floor is doing, what the teams learned, what to test next, why a trade happened."
                : `${agentName} runs on live floor data and the team journal. They can backtest on real Alpaca history, start shadow tests, write notes, and adopt a change on paper when the evidence gate passes. Real money stays your switch.`}
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
                  const specName = e.spec && typeof e.spec === "object" ? String((e.spec as { name?: unknown }).name ?? "") : "";
                  const changed = specName ? [["strategy", specName] as const] : d ? Object.entries(e.params).filter(([k, v]) => d.params[k] !== v) : [];
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
                          {(e.status === "running" || e.status === "stopped" || e.status === "proposed") && (
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

      <JournalPanel robot={robot} onRefresh={onRefresh} />
    </div>
  );
}

/** The teams' journals and meetings (plain list; the designed version comes later). */
function JournalPanel({ robot, onRefresh }: { robot: RobotState; onRefresh: () => void }) {
  const [who, setWho] = useState<string>("all");
  const [meet, setMeet] = useState<string>("ronin");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const notes = robot.notes.filter((n) => who === "all" || (who === "floor" ? n.desk === null : n.desk === who));
  return (
    <Panel title="Team journals & meetings" tag="LEARNING">
      <p className="rc-note">
        Every team meets on its own (RONIN every other hour, the others three times a day, all-hands at 11:20 UTC), writes down what it learns, and adopts a change on paper only when the code&apos;s evidence gate passes.
      </p>
      <div className="rc-row" style={{ marginTop: 8 }}>
        <select className="rc-input" style={{ maxWidth: 180 }} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Show notes for">
          <option value="all">All teams</option>
          <option value="floor">Floor briefings</option>
          {robot.desks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select className="rc-input" style={{ maxWidth: 180 }} value={meet} onChange={(e) => setMeet(e.target.value)} aria-label="Meeting to run">
          {robot.desks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} meeting
            </option>
          ))}
          <option value="allhands">All-hands</option>
        </select>
        <button
          className="rc-btn small"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const r = await postJson<{ ok: boolean; skipped?: string; tools?: string[] }>("/api/crypto-floor/research", { desk: meet });
              setMsg({ ok: true, text: r.skipped ?? `Meeting done${r.tools?.length ? ` · ${r.tools.join(", ")}` : ""}.` });
              onRefresh();
            } catch (e) {
              setMsg({ ok: false, text: e instanceof Error ? e.message : "Meeting failed" });
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Meeting… (up to 4 min)" : "Hold meeting now"}
        </button>
      </div>
      {msg && <p className={msg.ok ? "rc-ok" : "rc-error"} style={{ marginTop: 8 }}>{msg.text}</p>}
      <div style={{ marginTop: 10, maxHeight: "52vh", overflowY: "auto" }}>
        {notes.length === 0 && <p className="rc-note">No notes yet — the first meetings write them.</p>}
        {notes.slice(0, 40).map((n) => (
          <details key={n.id} className="rc-params" style={{ marginBottom: 6 }}>
            <summary>
              <b style={{ color: robot.desks.find((d) => d.id === n.desk)?.color }}>{(n.desk ?? "floor").toUpperCase()}</b> · {n.kind} · {n.author} · {dayHhmm(n.created_at)} — {n.title}
            </summary>
            <div className="cf-footnote" style={{ whiteSpace: "pre-wrap" }}>
              <RichText text={n.body} />
            </div>
          </details>
        ))}
      </div>
      {robot.meetings.length > 0 && (
        <p className="cf-footnote" style={{ marginTop: 8 }}>
          Last meetings: {robot.meetings.slice(0, 6).map((m) => `${(m.desk ?? "all-hands").toUpperCase()} ${dayHhmm(m.created_at)} ${m.status}`).join(" · ")}
        </p>
      )}
    </Panel>
  );
}
