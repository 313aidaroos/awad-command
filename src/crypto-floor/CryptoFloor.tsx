"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eye,
  LayoutGrid,
  Pause,
  Play,
  Radio,
  Shield,
  Skull,
  Swords,
  Triangle,
  X,
} from "lucide-react";
import { AppShell } from "@/landing/AppShell";
import {
  desks,
  disconnectedSnapshot,
  lifecycle,
  metricNames,
  roles,
  type Snapshot,
} from "./model";
import { sampleSnapshot } from "./sample";
import { awadScore, defaultScoreConfig, type ScoreConfig } from "./scoring";
import { agentRoleForEvent, filterEvents, type ReplayFilter } from "./replay";
import "./floor.css";
import { SceneActivity } from "@/world-motion/SceneActivity";

const tabs = [
  "FLOOR",
  "PORTFOLIO",
  "TEAMS",
  "TRADES",
  "PATTERNS",
  "NEWS",
  "REPLAY",
  "SYSTEM",
] as const;
type Tab = (typeof tabs)[number];
const currency = (n: number | null) =>
  n === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(n);
const pct = (n: number | null) =>
  n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const descriptions = [
  "Finds signals, patterns and unusual volume.",
  "Builds a concise thesis from supporting and conflicting evidence.",
  "Proposes entries and tracks execution quality.",
  "Checks exposure and rejects trades outside policy.",
];
const teamIcons = [Swords, Triangle, Crosshair, Skull];
function Panel({
  title,
  tag,
  children,
  className = "",
}: {
  title: string;
  tag?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`cf-panel ${className}`}>
      <header>
        <h2>{title}</h2>
        {tag && <span className="cf-tag">{tag}</span>}
      </header>
      {children}
    </section>
  );
}
function Avatar({
  team,
  role,
  large = false,
}: {
  team: number;
  role: number;
  large?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`cf-avatar ${large ? "large" : ""}`}
      style={{
        backgroundPosition: `${(role * 100) / 3}% ${(team * 100) / 3}%`,
      }}
    />
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="cf-empty">{children}</p>;
}
function CandleChart({ demo }: { demo: boolean }) {
  return demo ? (
    <svg
      className="cf-chart"
      viewBox="0 0 520 140"
      role="img"
      aria-label="Illustrative BTC candlestick chart; sample data, not live prices"
    >
      <defs>
        <linearGradient id="cf-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#00e5a0" stopOpacity=".25" />
          <stop offset="1" stopColor="#00e5a0" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[20, 50, 80, 110].map((y) => (
        <path key={y} d={`M0 ${y}H520`} stroke="#133043" />
      ))}
      {Array.from({ length: 54 }, (_, i) => {
        const y = 100 - i * 1.15 + Math.sin(i * 0.72) * 14;
        const up = i % 4 !== 0;
        return (
          <g key={i} stroke={up ? "#21eaaa" : "#ff5470"}>
            <path d={`M${i * 9 + 15} ${y - 9}v25`} />
            <rect
              x={i * 9 + 12}
              y={y}
              width="6"
              height={up ? 9 : 13}
              fill={up ? "#21eaaa" : "#ff5470"}
            />
            <rect
              x={i * 9 + 12}
              y={137 - ((i % 7) + 1) * 2}
              width="6"
              height={((i % 7) + 1) * 2}
              opacity=".2"
            />
          </g>
        );
      })}
    </svg>
  ) : (
    <Empty>
      Waiting for timestamped market data.
      <br />
      No simulated prices in connected view.
    </Empty>
  );
}
function Portfolio({ snapshot, demo }: { snapshot: Snapshot; demo: boolean }) {
  return (
    <Panel title="Portfolio overview" tag={demo ? "SAMPLE · PAPER" : "PAPER"}>
      <div className="cf-balance">
        {currency(snapshot.portfolio.paperBalance)}
      </div>
      <p className="cf-positive">
        {demo
          ? "+$155.00 (+3.9%) · illustrative return"
          : "Awaiting paper account"}
      </p>
      {demo && (
        <svg
          className="cf-spark"
          viewBox="0 0 300 55"
          role="img"
          aria-label="Sample portfolio performance"
        >
          <path
            d="M0 50 L12 42 25 46 38 35 50 37 62 26 74 29 87 24 100 30 112 20 125 24 139 12 152 18 164 8 176 14 188 5 200 12 212 9 224 15 238 4 250 11 264 6 278 8 300 0"
            fill="none"
            stroke="#28efac"
            strokeWidth="2"
          />
        </svg>
      )}
      <div className="cf-metric-row">
        <div>
          <small>Paper P&L</small>
          {currency(snapshot.portfolio.paperPnl)}
        </div>
        <div>
          <small>Open positions</small>
          {snapshot.portfolio.openPositions ?? "—"}
        </div>
        <div>
          <small>Live balance</small>
          <span>Not connected</span>
        </div>
      </div>
    </Panel>
  );
}
export default function CryptoFloor() {
  const [roomPaused, setRoomPaused] = useState(false);
  const [demo, setDemo] = useState(true),
    [tab, setTab] = useState<Tab>("FLOOR"),
    [selected, setSelected] = useState({ team: 0, role: 1 }),
    [agentOpen, setAgentOpen] = useState(false),
    [agentSection, setAgentSection] = useState("reasoning"),
    [teamFilter, setTeamFilter] = useState(""),
    [tradeOpen, setTradeOpen] = useState(false),
    [scoreOpen, setScoreOpen] = useState(false),
    [scoreConfig, setScoreConfig] = useState<ScoreConfig>(defaultScoreConfig),
    [speed, setSpeed] = useState(1),
    [playing, setPlaying] = useState(false),
    [cursor, setCursor] = useState(0),
    [replayStarted, setReplayStarted] = useState(false);
  const [filter, setFilter] = useState<ReplayFilter>({
    team: "",
    symbol: "",
    trade: "",
    date: "",
    time: "",
    event: "",
  });
  const dialog = useRef<HTMLDialogElement>(null),
    startX = useRef<number | null>(null);
  const snapshot = useMemo(
    () => (demo ? sampleSnapshot() : disconnectedSnapshot()),
    [demo],
  );
  const events = useMemo(
    () => filterEvents(snapshot.events, filter),
    [snapshot, filter],
  );
  const current = replayStarted ? events[cursor] : undefined;
  const selectedDesk = desks[selected.team];
  const agentEvents = snapshot.events.filter(
    (e) =>
      e.teamId === selectedDesk.id &&
      agentRoleForEvent(e.eventType) === roles[selected.role],
  );
  const agentEvent = agentEvents.at(-1);
  const scores = useMemo(
    () =>
      snapshot.teams
        .map((t) => ({ ...t, score: awadScore(t.metrics, scoreConfig) }))
        .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
    [snapshot, scoreConfig],
  );
  useEffect(() => {
    if (agentOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [agentOpen]);
  useEffect(() => {
    if (!playing || !events.length) return;
    const timer = setTimeout(
      () => {
        if (cursor >= events.length - 1) setPlaying(false);
        else setCursor((c) => c + 1);
      },
      Math.max(
        250,
        (new Date(
          events[Math.min(cursor + 1, events.length - 1)].timestamp,
        ).getTime() - new Date(events[cursor].timestamp).getTime() || 1000) /
          speed,
      ),
    );
    return () => clearTimeout(timer);
  }, [playing, cursor, speed, events]);
  function changeFilter(key: keyof ReplayFilter, value: string) {
    setFilter((f) => ({ ...f, [key]: value }));
    setCursor(0);
    setPlaying(false);
    setReplayStarted(false);
  }
  function changeMode(value: boolean) {
    setDemo(value);
    setCursor(0);
    setPlaying(false);
    setReplayStarted(false);
    setFilter({
      team: "",
      symbol: "",
      trade: "",
      date: "",
      time: "",
      event: "",
    });
  }
  function showAgent(team: number, role: number) {
    setSelected({ team, role });
    setAgentSection("reasoning");
    setAgentOpen(true);
  }
  function replayStep(index: number) {
    setCursor(Math.max(0, Math.min(events.length - 1, index)));
    setReplayStarted(true);
    setPlaying(false);
  }
  const teamBoard = (
    <div className="cf-table-scroll">
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th>P&L</th>
            <th>Win %</th>
            <th>Drawdown</th>
            <th>BTC alpha</th>
            <th>AWAD</th>
            <th>Mode</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((t) => {
            const d = desks.find((x) => x.id === t.id)!;
            return (
              <tr key={t.id}>
                <th>
                  <button
                    style={{ color: d.color }}
                    onClick={() => {
                      setTeamFilter(d.id);
                      setTab("TEAMS");
                    }}
                  >
                    {d.name}
                  </button>
                </th>
                <td
                  className={(t.pnl ?? 0) < 0 ? "cf-negative" : "cf-positive"}
                >
                  {pct(t.metrics.netReturn)}
                </td>
                <td>
                  {t.metrics.winRate === null
                    ? "—"
                    : `${Math.round(t.metrics.winRate * 100)}%`}
                </td>
                <td>
                  {t.metrics.maxDrawdown === null
                    ? "—"
                    : `${t.metrics.maxDrawdown}%`}
                </td>
                <td>{pct(t.metrics.btcAlpha)}</td>
                <td>{t.score ?? "—"}</td>
                <td>
                  <span className="cf-paper">PAPER</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
  const health = (
    <Panel title="System health" tag="ENGINE NOT CONNECTED">
      <div className="cf-health">
        {snapshot.health.map((h) => (
          <div key={h.name}>
            <i className="unknown" />
            <span>{h.name}</span>
            <small>Not connected</small>
          </div>
        ))}
      </div>
      <p className="cf-footnote">
        App connectivity is separate from trading-engine health.
      </p>
    </Panel>
  );
  const replay = (
    <Panel title="Replay mode" tag={demo ? "SAMPLE HISTORY" : "STORED HISTORY"}>
      <div className="cf-replay-filters">
        <label>
          Date (UTC)
          <input
            type="date"
            value={filter.date}
            onChange={(e) => changeFilter("date", e.target.value)}
          />
        </label>
        <label>
          From time (UTC)
          <input
            type="time"
            value={filter.time}
            onChange={(e) => changeFilter("time", e.target.value)}
          />
        </label>
        <label>
          Team
          <select
            value={filter.team}
            onChange={(e) => changeFilter("team", e.target.value)}
          >
            <option value="">All teams</option>
            {desks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Coin
          <select
            value={filter.symbol}
            onChange={(e) => changeFilter("symbol", e.target.value)}
          >
            <option value="">All coins</option>
            {["BTC", "ETH", "SOL"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Trade
          <select
            value={filter.trade}
            onChange={(e) => changeFilter("trade", e.target.value)}
          >
            <option value="">All trades</option>
            {demo && <option>SAMPLE-SAM-BTC-001</option>}
          </select>
        </label>
        <label>
          Event
          <select
            value={filter.event}
            onChange={(e) => changeFilter("event", e.target.value)}
          >
            <option value="">All events</option>
            {Array.from(new Set(snapshot.events.map((e) => e.eventType))).map(
              (t) => (
                <option key={t}>{t}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="cf-replay-now">
        {current ? (
          <>
            <strong>{current.title}</strong>
            <p>{current.description}</p>
            <small>
              {current.timestamp.slice(11, 19)} UTC ·{" "}
              {current.teamId?.toUpperCase()} · PAPER
            </small>
          </>
        ) : (
          <span>
            {events.length
              ? "Press play to watch the sample event sequence. Agent reactions follow these fixed events."
              : "No events match these filters."}
          </span>
        )}
      </div>
      <input
        aria-label="Replay event position"
        className="cf-scrub"
        type="range"
        min="0"
        max={Math.max(0, events.length - 1)}
        value={cursor}
        disabled={!events.length}
        onChange={(e) => replayStep(Number(e.target.value))}
      />
      <div className="cf-replay-controls">
        <button
          aria-label="Previous event"
          disabled={!events.length || cursor === 0}
          onClick={() => replayStep(cursor - 1)}
        >
          <ChevronLeft size={19} />
        </button>
        <button
          aria-label={playing ? "Pause replay" : "Play replay"}
          className="cf-play"
          disabled={!events.length}
          onClick={() => {
            if (cursor === events.length - 1) setCursor(0);
            setReplayStarted(true);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          aria-label="Next event"
          disabled={!events.length || cursor >= events.length - 1}
          onClick={() => replayStep(cursor + 1)}
        >
          <ChevronRight size={19} />
        </button>
        <span>
          {events.length ? cursor + 1 : 0} / {events.length}
        </span>
        {[1, 2, 5, 10].map((s) => (
          <button
            key={s}
            aria-pressed={speed === s}
            onClick={() => setSpeed(s)}
          >
            {s}x
          </button>
        ))}
      </div>
    </Panel>
  );
  const tradeTimeline = (
    <Panel
      title="Trade timeline"
      tag={demo ? "PAPER · SAMPLE" : "NO TRADE HISTORY"}
    >
      <p className="cf-footnote">
        {demo
          ? "SAMPLE-SAM-BTC-001 · Illustrative sequence; no real execution"
          : "Connect stored trade events to view a timeline."}
      </p>
      {snapshot.events
        .filter((e) => e.tradeId === "SAMPLE-SAM-BTC-001")
        .map((e) => (
          <button
            className="cf-event-line"
            key={e.id}
            onClick={() => {
              setFilter({
                team: "",
                symbol: "",
                trade: "",
                date: "",
                time: "",
                event: "",
              });
              setCursor(snapshot.events.findIndex((x) => x.id === e.id));
              setReplayStarted(true);
              setPlaying(false);
              setTab("FLOOR");
            }}
          >
            <time>{e.timestamp.slice(11, 19)}</time>
            <span>{e.title}</span>
            <ArrowUpRight size={12} />
          </button>
        ))}
      {!demo && <Empty>No stored trades connected.</Empty>}
    </Panel>
  );
  return (
    <AppShell headquarters>
      {() => (
        <div className="cf-root">
          <div className="cf-titlebar">
            <div>
              <span className="cf-eyebrow">
                AWAD COMMAND / TRADING OPERATIONS
              </span>
              <h1>THE CRYPTO FLOOR</h1>
            </div>
            <div
              className="cf-mode-switch"
              role="group"
              aria-label="Floor data source"
            >
              <button aria-pressed={demo} onClick={() => changeMode(true)}>
                Visual preview
              </button>
              <button aria-pressed={!demo} onClick={() => changeMode(false)}>
                Connection status
              </button>
            </div>
          </div>
          <div className="cf-disclosure">
            <Eye size={15} />
            <span>
              {demo
                ? "VISUAL PREVIEW · Illustrated agent roster and sample paper data. No trading engine or live money is connected."
                : "CONNECTION STATUS · No Crypto Floor engine is linked. Characters remain visible; trading data is unavailable."}
            </span>
            <Link href="/agents">
              Existing app agents <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="cf-ticker">
            {["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE"].map((symbol, i) => {
              const m = snapshot.markets.find((x) => x.symbol === symbol);
              return (
                <div key={symbol}>
                  <span className={`cf-coin coin-${i}`}>
                    {symbol === "BTC" ? "₿" : symbol.slice(0, 1)}
                  </span>
                  <span>
                    <b>{symbol}</b>
                    <strong>{m ? currency(m.price) : "—"}</strong>
                  </span>
                  <em>{m ? `+${m.change}%` : "NO FEED"}</em>
                </div>
              );
            })}
            <div className="cf-ticker-label">
              {demo ? "SAMPLE PRICES" : "MARKET FEED OFFLINE"}
              <small>LIVE CAPITAL LOCKED</small>
            </div>
          </div>
          <nav className="cf-tabs" aria-label="Crypto Floor views">
            {tabs.map((t) => (
              <button
                key={t}
                aria-current={tab === t ? "page" : undefined}
                onClick={() => setTab(t)}
              >
                {t === "FLOOR" && <LayoutGrid size={13} />} {t}
              </button>
            ))}
          </nav>
          <div
            onTouchStart={(e) => {
              startX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (
                startX.current === null ||
                (e.target as HTMLElement).closest("button,input,select,a")
              )
                return;
              const delta = e.changedTouches[0].clientX - startX.current;
              if (Math.abs(delta) > 90)
                setTab(
                  tabs[
                    Math.max(
                      0,
                      Math.min(
                        tabs.length - 1,
                        tabs.indexOf(tab) + (delta < 0 ? 1 : -1),
                      ),
                    )
                  ],
                );
              startX.current = null;
            }}
          >
            {tab === "FLOOR" && (
              <>
                <div className="cf-mobile-safety">
                  <Shield size={16} />
                  <span>Engine disconnected · no order controls</span>
                  <button onClick={() => setTab("SYSTEM")}>SYSTEM →</button>
                </div>
                <div className="cf-wall">
                  <Panel
                    title="Recent trade events"
                    tag={demo ? "SAMPLE" : "PAPER"}
                  >
                    <div className="cf-mini-events">
                      {snapshot.events
                        .filter((e) => /ORDER|TARGET/.test(e.eventType))
                        .slice(-4)
                        .map((e) => (
                          <button
                            key={e.id}
                            onClick={() => {
                              setTradeOpen(true);
                              setTab("TRADES");
                            }}
                          >
                            <time>{e.timestamp.slice(11, 19)}</time>
                            <span>{e.teamId}</span>
                            <b>{e.symbol}</b>
                            <em>{e.eventType.replace("ORDER_", "")}</em>
                          </button>
                        ))}
                      {!demo && <Empty>No exchange orders connected.</Empty>}
                    </div>
                  </Panel>
                  <Panel
                    title="BTC / USDT"
                    tag={demo ? "1H · SAMPLE CHART" : "OFFLINE"}
                  >
                    <CandleChart demo={demo} />
                  </Panel>
                  <Panel
                    title="News intelligence"
                    tag={demo ? "SCENARIO" : "NO FEED"}
                  >
                    {demo ? (
                      <div className="cf-news">
                        <p>
                          <span>MACRO</span>Macro-event scenario under review{" "}
                          <em>Watch</em>
                        </p>
                        <p>
                          <span>MARKETS</span>Sample breakout context{" "}
                          <em>Neutral</em>
                        </p>
                        <p>
                          <span>RISK</span>Volatility risk briefing{" "}
                          <em>Caution</em>
                        </p>
                        <small>Illustrative headlines, not current news</small>
                      </div>
                    ) : (
                      <Empty>No news provider connected.</Empty>
                    )}
                  </Panel>
                  <Panel
                    title="Detected patterns"
                    tag={demo ? "SAMPLE" : "OFFLINE"}
                  >
                    {(demo
                      ? [
                          "BTC breakout",
                          "ETH trend continuation",
                          "SOL volatility spike",
                        ]
                      : []
                    ).map((p, i) => (
                      <button
                        className="cf-pattern"
                        key={p}
                        onClick={() => setTab("PATTERNS")}
                      >
                        <Crosshair size={14} />
                        {p}
                        <small>{i === 2 ? "WATCH" : "REVIEW"}</small>
                      </button>
                    ))}
                    {!demo && <Empty>No detected patterns.</Empty>}
                  </Panel>
                </div>
                <section
                  className="cf-room cf-animated-exchange"
                  aria-label="Four trading desks with sixteen illustrated agents"
                >
                  <Image
                    src="/crypto-floor/exchange-room.png"
                    fill
                    priority
                    sizes="100vw"
                    alt="Grand exchange trading floor with four illuminated red, cyan, green and violet trading pits"
                  />
                  <SceneActivity
                    seed={99}
                    trading
                    paused={!demo || roomPaused}
                  />
                  <div className="cf-room-brand">
                    <small>AWAD COMMAND</small>
                    <h2>THE CRYPTO FLOOR</h2>
                    <span>FOUR STRATEGIES. SIXTEEN MINDS. ONE FLOOR.</span>
                    <button
                      className="scene-motion-control"
                      aria-pressed={roomPaused}
                      onClick={() => setRoomPaused((p) => !p)}
                    >
                      {roomPaused
                        ? "▶ Resume floor motion"
                        : "Ⅱ Pause floor motion"}
                    </button>
                  </div>
                  <div className="cf-desks">
                    {desks.map((desk, ti) => {
                      const state = snapshot.teams[ti],
                        Icon = teamIcons[ti];
                      return (
                        <section
                          key={desk.id}
                          className={`cf-desk ${current?.teamId === desk.id ? "event-active" : ""}`}
                          style={
                            { "--desk-color": desk.color } as CSSProperties
                          }
                        >
                          <button
                            className="cf-desk-heading"
                            onClick={() => {
                              setTeamFilter(desk.id);
                              setTab("TEAMS");
                            }}
                          >
                            <Icon size={28} />
                            <span>
                              <strong>{desk.name}</strong>
                              <small>{desk.strategy}</small>
                            </span>
                            <ArrowUpRight size={12} />
                          </button>
                          <div className="cf-agents">
                            {roles.map((role, ri) => (
                              <button
                                key={role}
                                className={`cf-agent ${current?.teamId === desk.id && agentRoleForEvent(current.eventType) === role ? "reacting" : ""}`}
                                aria-label={`${desk.names[ri]}, ${role}, Team ${desk.name}, paper preview`}
                                onClick={() => showAgent(ti, ri)}
                              >
                                <Avatar team={ti} role={ri} />
                                <span>{desk.names[ri]}</span>
                                <small>{role}</small>
                                <i>PAPER</i>
                              </button>
                            ))}
                          </div>
                          <div className="cf-desk-stats">
                            <span>
                              P&L{" "}
                              <b
                                className={
                                  (state.pnl ?? 0) < 0
                                    ? "cf-negative"
                                    : "cf-positive"
                                }
                              >
                                {pct(state.metrics.netReturn)}
                              </b>
                            </span>
                            <span>
                              Trades <b>{demo ? state.openTrades : "—"}</b>
                            </span>
                            <span>
                              AWAD{" "}
                              <b>
                                {awadScore(state.metrics, scoreConfig) ?? "—"}
                              </b>
                            </span>
                          </div>
                          <p className="cf-desk-status">
                            {current?.teamId === desk.id
                              ? current.title
                              : "PAPER LEAGUE · " +
                                (demo
                                  ? "ILLUSTRATED ROSTER"
                                  : "AWAITING ENGINE")}
                          </p>
                        </section>
                      );
                    })}
                  </div>
                </section>
                <div className="cf-bottom">
                  <Portfolio snapshot={snapshot} demo={demo} />
                  <Panel
                    title="Team performance"
                    tag={demo ? "SAMPLE · RISK ADJUSTED" : "NO TELEMETRY"}
                  >
                    {teamBoard}
                    <button
                      className="cf-link"
                      onClick={() => {
                        setScoreOpen(true);
                        setTab("TEAMS");
                      }}
                    >
                      Configure score weights <ArrowUpRight size={12} />
                    </button>
                  </Panel>
                  {health}
                  <Panel title="Trading control" className="cf-control">
                    <button
                      className="cf-kill"
                      disabled
                      title="No trading engine is connected. A browser-only switch cannot halt an exchange."
                    >
                      <Shield size={18} /> KILL SWITCH
                      <small>ENGINE NOT CONNECTED</small>
                    </button>
                    <div className="cf-control-row">
                      Live capital <b>LOCKED</b>
                    </div>
                    <div className="cf-control-row">
                      Paper capital{" "}
                      <b>{currency(snapshot.portfolio.paperBalance)}</b>
                    </div>
                    <div className="cf-control-row">
                      Today · paper{" "}
                      <b className="cf-positive">
                        {currency(snapshot.portfolio.paperPnl)}
                      </b>
                    </div>
                    <button
                      className="cf-link"
                      onClick={() => setTab("SYSTEM")}
                    >
                      Connection details →
                    </button>
                  </Panel>
                </div>
                <div className="cf-lower">
                  <Panel
                    title="Recent events"
                    tag={demo ? "FIXED SAMPLE" : "NO EVENTS"}
                  >
                    <div className="cf-event-list">
                      {snapshot.events
                        .slice(-5)
                        .reverse()
                        .map((e) => (
                          <button
                            className="cf-event-line"
                            key={e.id}
                            onClick={() => {
                              setCursor(
                                snapshot.events.findIndex((x) => x.id === e.id),
                              );
                              setFilter({
                                team: "",
                                symbol: "",
                                trade: "",
                                date: "",
                                time: "",
                                event: "",
                              });
                              setPlaying(false);
                              setReplayStarted(true);
                            }}
                          >
                            <i
                              className={e.severity === "warning" ? "warn" : ""}
                            />
                            <time>{e.timestamp.slice(11, 19)}</time>
                            <span>{e.title}</span>
                          </button>
                        ))}
                      {!demo && (
                        <Empty>No immutable event source connected.</Empty>
                      )}
                    </div>
                  </Panel>
                  <Panel title="Agent spotlight" tag="PAPER PREVIEW">
                    <button
                      className="cf-spotlight"
                      onClick={() => showAgent(selected.team, selected.role)}
                    >
                      <Avatar team={selected.team} role={selected.role} />
                      <span>
                        <b>{selectedDesk.names[selected.role]}</b>
                        <small>
                          {roles[selected.role]} · {selectedDesk.name}
                        </small>
                        <p>{descriptions[selected.role]}</p>
                        <em>OPEN AGENT CARD →</em>
                      </span>
                    </button>
                  </Panel>
                  {replay}
                </div>
              </>
            )}
            {tab === "PORTFOLIO" && (
              <div className="cf-expanded-grid">
                <Portfolio snapshot={snapshot} demo={demo} />
                <Panel title="Capital separation" tag="LIVE LOCKED">
                  <h3>Paper and live stay separate.</h3>
                  <p>
                    All illustrated teams are in Paper League. Sample balances
                    are not account balances. No capital is allocated by this
                    interface.
                  </p>
                  <div className="cf-lifecycle">
                    {[
                      "Paper League",
                      "Live Candidate",
                      "One Live Team",
                      "Champion",
                    ].map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                  <p className="cf-footnote">
                    Live qualification, staged allocation and account limits
                    require the execution engine and verified historical
                    evidence.
                  </p>
                </Panel>
              </div>
            )}
            {tab === "TEAMS" && (
              <>
                <Panel
                  title="AWAD Score leaderboard"
                  tag={demo ? "ILLUSTRATIVE PAPER METRICS" : "AWAITING METRICS"}
                >
                  {teamBoard}
                  <button
                    className="cf-link"
                    onClick={() => setScoreOpen(!scoreOpen)}
                  >
                    {scoreOpen ? "Hide" : "Configure"} score weights
                  </button>
                  {scoreOpen && (
                    <div className="cf-weight-grid">
                      {metricNames.map((k) => (
                        <label key={k}>
                          {k.replace(/([A-Z])/g, " $1")}
                          <input
                            aria-label={`${k} weight`}
                            type="number"
                            min="0"
                            max="100"
                            value={scoreConfig[k].weight}
                            onChange={(e) =>
                              setScoreConfig((c) => ({
                                ...c,
                                [k]: {
                                  ...c[k],
                                  weight: Math.max(
                                    0,
                                    Math.min(100, Number(e.target.value) || 0),
                                  ),
                                },
                              }))
                            }
                          />
                        </label>
                      ))}
                      <p>
                        Preview weights only. Changes do not alter engine policy
                        or persist after reload.
                      </p>
                      <button
                        onClick={() => setScoreConfig(defaultScoreConfig)}
                      >
                        Reset defaults
                      </button>
                    </div>
                  )}
                </Panel>
                <div className="cf-team-filter">
                  <button
                    onClick={() => setTeamFilter("")}
                    aria-pressed={!teamFilter}
                  >
                    All desks
                  </button>
                  {desks.map((d) => (
                    <button
                      key={d.id}
                      style={{ color: d.color }}
                      aria-pressed={teamFilter === d.id}
                      onClick={() => setTeamFilter(d.id)}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
                <div className="cf-team-cards">
                  {desks.map(
                    (d, ti) =>
                      (!teamFilter || teamFilter === d.id) && (
                        <Panel
                          key={d.id}
                          title={`${d.name} / ${d.strategy}`}
                          tag="PAPER LEAGUE"
                        >
                          <div
                            className="cf-agents"
                            style={{ "--desk-color": d.color } as CSSProperties}
                          >
                            {roles.map((r, ri) => (
                              <button
                                className="cf-agent"
                                key={r}
                                onClick={() => showAgent(ti, ri)}
                              >
                                <Avatar team={ti} role={ri} />
                                <span>{d.names[ri]}</span>
                                <small>{r}</small>
                                <i>PAPER</i>
                              </button>
                            ))}
                          </div>
                          <p className="cf-footnote">
                            Illustrated roles, awaiting connection to runtime
                            agent identities. No live qualification inferred
                            from sample metrics.
                          </p>
                        </Panel>
                      ),
                  )}
                </div>
                <Panel title="Team lifecycle">
                  <div className="cf-lifecycle">
                    {lifecycle.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                  <p>
                    Promotion requires verified risk-adjusted performance.
                    Guardrail violations and drawdown limits can freeze or
                    demote a team. The preview cannot promote or fund teams.
                  </p>
                </Panel>
              </>
            )}
            {tab === "TRADES" && (
              <div className="cf-expanded-grid">
                <Panel
                  title="Trade journal"
                  tag={demo ? "PAPER SAMPLE" : "NO ENGINE"}
                >
                  {demo ? (
                    <button
                      className="cf-trade-card"
                      onClick={() => setTradeOpen(!tradeOpen)}
                    >
                      <span className="cf-paper">PAPER · SAMPLE</span>
                      <h3>
                        BTC / USDT <ArrowUpRight size={16} />
                      </h3>
                      <p>SAMURAI · SAMPLE-SAM-BTC-001</p>
                      <p>
                        Signal → thesis → risk → guardrails → paper fill →
                        target
                      </p>
                      <strong>
                        {tradeOpen ? "Hide details" : "View full timeline"}
                      </strong>
                    </button>
                  ) : (
                    <Empty>No trading history connected.</Empty>
                  )}
                </Panel>
                {demo && tradeTimeline}
                {tradeOpen && demo && (
                  <Panel title="Trade evidence" tag="ILLUSTRATIVE">
                    <p>
                      Thesis: continuation above sample resistance, with
                      invalidation at the stop.
                    </p>
                    <div className="cf-detail-grid">
                      {[
                        "Entry",
                        "Stop",
                        "Target",
                        "Exit",
                        "Order size",
                        "Expected fees",
                        "Actual fees",
                        "Expected slippage",
                        "Actual slippage",
                        "MFE",
                        "MAE",
                        "Benchmark return",
                      ].map((label) => (
                        <div key={label}>
                          <small>{label}</small>
                          <b>Not supplied</b>
                        </div>
                      ))}
                    </div>
                    <p className="cf-footnote">
                      Only the sample event sequence is recorded here. Missing
                      financial details are not fabricated.
                    </p>
                  </Panel>
                )}
              </div>
            )}
            {tab === "PATTERNS" && (
              <div className="cf-expanded-grid">
                <Panel
                  title="Pattern board"
                  tag={demo ? "SAMPLE" : "UNAVAILABLE"}
                >
                  {demo ? (
                    [
                      "BTC · breakout / momentum",
                      "ETH · trend continuation",
                      "SOL · volatility spike",
                    ].map((p, i) => (
                      <div className="cf-pattern-card" key={p}>
                        <Crosshair />
                        <h3>{p}</h3>
                        <p>
                          {
                            [
                              "Scout flags resistance and volume alignment for analyst review.",
                              "A swing setup requires multi-timeframe confirmation.",
                              "Mean-reversion entry blocked until volatility returns within policy.",
                            ][i]
                          }
                        </p>
                        <button onClick={() => showAgent(i, 0)}>
                          Open scout →
                        </button>
                      </div>
                    ))
                  ) : (
                    <Empty>No detector connected.</Empty>
                  )}
                </Panel>
                <Panel
                  title="Market regime"
                  tag={demo ? "SAMPLE CLASSIFICATION" : "UNAVAILABLE"}
                >
                  <h3>
                    {snapshot.regime ?? "Awaiting deterministic calculations"}
                  </h3>
                  <p>
                    Code calculates trend, volatility and breakout conditions.
                    AI explains them; it does not invent them.
                  </p>
                  <div className="cf-lifecycle">
                    {[
                      "TRENDING UP",
                      "TRENDING DOWN",
                      "RANGE BOUND",
                      "HIGH VOLATILITY",
                      "LOW VOLATILITY",
                      "RISK OFF",
                      "BREAKOUT",
                      "NEWS SHOCK",
                    ].map((r) => (
                      <span key={r}>{r}</span>
                    ))}
                  </div>
                </Panel>
              </div>
            )}
            {tab === "NEWS" && (
              <Panel title="News intelligence" tag="NO LIVE NEWS PROVIDER">
                <Empty>
                  The news desk is visible. Its source is not connected yet.
                </Empty>
                <button
                  className="cf-news-agent"
                  onClick={() => showAgent(3, 1)}
                >
                  <Avatar team={3} role={1} />
                  <span>
                    <h3>MIRA / PHANTOM ANALYST</h3>
                    <p>
                      Summarizes source-backed news and distinguishes supporting
                      from conflicting evidence.
                    </p>
                    <strong>View agent →</strong>
                  </span>
                </button>
              </Panel>
            )}
            {tab === "REPLAY" && (
              <div className="cf-expanded-grid">
                {replay}
                {tradeTimeline}
                <Panel title="Event provenance">
                  <p>
                    {demo
                      ? "This replay uses a fixed, bundled sample event sequence. It does not represent your historical trading."
                      : "Connect stored events and timestamped market snapshots before replaying actual trades."}
                  </p>
                  <p>
                    Character reactions follow event type and team. History is
                    never regenerated by AI.
                  </p>
                  {current && <code>{current.correlationId}</code>}
                  <button className="cf-link" onClick={() => setTab("FLOOR")}>
                    Watch on the floor →
                  </button>
                </Panel>
              </div>
            )}
            {tab === "SYSTEM" && (
              <div className="cf-expanded-grid">
                {health}
                <Panel title="Master kill switch" tag="UNAVAILABLE">
                  <button disabled className="cf-kill">
                    <Shield /> ENGINE NOT CONNECTED
                  </button>
                  <p>
                    A real kill switch must block orders in the execution
                    service, persist the halt and require an authenticated
                    reset. This preview cannot stop an external engine.
                  </p>
                  <p>
                    No live-order or risk-policy changes can be made from this
                    screen.
                  </p>
                </Panel>
                <Panel title="Execution safeguards">
                  <div className="cf-lifecycle">
                    {["CHECK STATE", "RECONCILE", "THEN ACT"].map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                  <p>
                    Single execution leader, unique order IDs, stale-data
                    blocks, account limits and deterministic guardrails are
                    required before live mode.
                  </p>
                  <p className="cf-footnote">
                    These are integration requirements, not claims of
                    implemented exchange protection.
                  </p>
                </Panel>
                <Panel title="Engine telemetry">
                  <div className="cf-detail-grid">
                    {[
                      "Last heartbeat",
                      "Last trade cycle",
                      "Queue depth",
                      "Open orders",
                      "API latency",
                      "System uptime",
                    ].map((k) => (
                      <div key={k}>
                        <small>{k}</small>
                        <b>Unavailable</b>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            )}
          </div>
          <footer className="cf-footer">
            <span>
              <Radio size={12} /> {demo ? "PAPER PREVIEW" : "CONNECTION STATUS"}{" "}
              · LIVE EXECUTION DISABLED
            </span>
            <span>CAPITAL SAFETY → EXECUTION CORRECTNESS → DATA INTEGRITY</span>
            <Link href="/">AWAD COMMAND ↗</Link>
          </footer>
          <dialog
            className="cf-agent-dialog"
            ref={dialog}
            onCancel={() => setAgentOpen(false)}
            onClick={(e) => {
              if (e.target === dialog.current) setAgentOpen(false);
            }}
          >
            <button
              className="cf-close"
              aria-label="Close agent card"
              onClick={() => setAgentOpen(false)}
            >
              <X />
            </button>
            <div
              className="cf-agent-profile"
              style={{ "--desk-color": selectedDesk.color } as CSSProperties}
            >
              <Avatar team={selected.team} role={selected.role} large />
              <div>
                <span className="cf-paper">PAPER · ILLUSTRATED AGENT</span>
                <h2>{selectedDesk.names[selected.role]}</h2>
                <p>
                  {roles[selected.role]} / TEAM {selectedDesk.name}
                </p>
                <small>{descriptions[selected.role]}</small>
              </div>
            </div>
            <div className="cf-agent-card-tabs">
              {["reasoning", "history", "team", "trade"].map((t) => (
                <button
                  key={t}
                  aria-pressed={agentSection === t}
                  onClick={() => setAgentSection(t)}
                >
                  VIEW {t.toUpperCase()}
                </button>
              ))}
            </div>
            {agentSection === "reasoning" && (
              <>
                <h3>Decision summary</h3>
                <p>
                  {demo && agentEvent
                    ? agentEvent.description
                    : "Awaiting a connected agent decision. This character is an illustrated role, not a running process."}
                </p>
                <div className="cf-detail-grid">
                  <div>
                    <small>Activity</small>
                    <b>{demo ? "Sample scenario" : "Awaiting engine"}</b>
                  </div>
                  <div>
                    <small>Confidence</small>
                    <b>{demo && agentEvent ? "71% · SAMPLE" : "Unavailable"}</b>
                  </div>
                  <div>
                    <small>Contribution</small>
                    <b>Not measured</b>
                  </div>
                  <div>
                    <small>Latest action</small>
                    <b>
                      {demo && agentEvent ? agentEvent.title : "None recorded"}
                    </b>
                  </div>
                </div>
                {demo && agentEvent && (
                  <>
                    <h3>Evidence · sample</h3>
                    <p>Supporting: trend alignment and volume confirmation.</p>
                    <p>Conflicting: macro headline uncertainty.</p>
                  </>
                )}
                <p className="cf-footnote">
                  Concise rationale only. No hidden chain-of-thought.
                </p>
              </>
            )}
            {agentSection === "history" && (
              <>
                <h3>Last five decisions</h3>
                {agentEvents
                  .slice(-5)
                  .reverse()
                  .map((e) => (
                    <p key={e.id}>
                      <time>{e.timestamp.slice(11, 19)} UTC</time> —{" "}
                      {e.description}
                    </p>
                  ))}
                {!agentEvents.length && (
                  <Empty>No stored decisions for this role.</Empty>
                )}
              </>
            )}
            {agentSection === "team" && (
              <>
                <h3>
                  {selectedDesk.name} / {selectedDesk.strategy}
                </h3>
                <p>
                  PAPER LEAGUE ·{" "}
                  {demo ? "Sample metrics" : "Awaiting telemetry"}
                </p>
                <button
                  onClick={() => {
                    setTeamFilter(selectedDesk.id);
                    setAgentOpen(false);
                    setTab("TEAMS");
                  }}
                >
                  Open full team →
                </button>
              </>
            )}
            {agentSection === "trade" && (
              <>
                <h3>Current trade involvement</h3>
                {demo && selected.team === 0 ? (
                  <>
                    <p>
                      SAMPLE-SAM-BTC-001 · closed illustrative paper scenario
                    </p>
                    <button
                      onClick={() => {
                        setAgentOpen(false);
                        setTab("TRADES");
                        setTradeOpen(true);
                      }}
                    >
                      View trade timeline →
                    </button>
                  </>
                ) : (
                  <Empty>No active trade connected.</Empty>
                )}
              </>
            )}
          </dialog>
        </div>
      )}
    </AppShell>
  );
}
