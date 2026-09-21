import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  ALPACA_DATA_ORIGIN,
  ALPACA_PAPER_ORIGIN,
  assertAlpacaDataBase,
  assertAlpacaPaperBase,
  assertPaperMode,
  PaperGuardError,
} from "./guard";
import { deskIds, type DeskId } from "./desks";
import {
  openCountsFromState,
  parseExperience,
  parseTradesCsv,
  readHalt,
  toIso,
} from "./journal";
import {
  brokerCryptoMarketValue,
  buildPaperSnapshot,
  type PaperAccount,
  type PaperBook,
  type PaperBrokerOrder,
  type PaperPosition,
  type PaperQuote,
} from "./snapshot";
import { isResearchOnlySymbol, paperTradablePairs } from "./universe";

export type PaperEnv = {
  mode: string;
  key: string | null;
  secret: string | null;
  paperBase: string;
  statusUrl: string | null;
  dashboardPassword: string | null;
  journalDir: string | null;
};

type FetchLike = typeof fetch;

function first(env: NodeJS.ProcessEnv, names: string[]) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return null;
}

export function readPaperEnv(env: NodeJS.ProcessEnv = process.env): PaperEnv {
  const paperBase = first(env, ["ALPACA_PAPER_BASE_URL"]) ?? ALPACA_PAPER_ORIGIN;
  return {
    mode: (env.TRADE_MODE ?? "").trim().toLowerCase(),
    key: first(env, ["ALPACA_API_KEY", "APCA_API_KEY_ID"]),
    secret: first(env, ["ALPACA_SECRET_KEY", "APCA_API_SECRET_KEY"]),
    paperBase,
    statusUrl: first(env, ["AWADBOT_STATUS_URL"]),
    dashboardPassword: first(env, ["DASHBOARD_PASSWORD", "AWADBOT_DASHBOARD_PASSWORD"]),
    journalDir: first(env, ["AWADBOT_JOURNAL_DIR"]),
  };
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function mapAccount(raw: unknown): PaperAccount | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const equity = num(obj.equity);
  const portfolioValue = num(obj.portfolio_value ?? obj.portfolioValue);
  if (equity === null && portfolioValue === null) return null;
  return {
    equity,
    lastEquity: num(obj.last_equity ?? obj.lastEquity),
    portfolioValue,
    cash: num(obj.cash),
    status: typeof obj.status === "string" ? obj.status : null,
    cryptoStatus:
      typeof obj.crypto_status === "string"
        ? obj.crypto_status
        : typeof obj.cryptoStatus === "string"
          ? obj.cryptoStatus
          : null,
  };
}

export function mapPosition(raw: unknown): PaperPosition | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const symbol = String(obj.symbol ?? "").trim();
  const qty = num(obj.qty);
  if (!symbol || qty === null) return null;
  return {
    symbol,
    qty,
    marketValue: num(obj.market_value ?? obj.marketValue) ?? 0,
    unrealizedPl: num(obj.unrealized_pl ?? obj.unrealizedPl) ?? 0,
    currentPrice: num(obj.current_price ?? obj.currentPrice) ?? 0,
    assetClass: String(obj.asset_class ?? obj.assetClass ?? ""),
    side: String(obj.side ?? ""),
  };
}

export function mapOrder(raw: unknown): PaperBrokerOrder | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = String(obj.id ?? "").trim();
  const symbol = String(obj.symbol ?? "").trim();
  const side = String(obj.side ?? "").trim().toLowerCase();
  if (!id || !symbol || (side !== "buy" && side !== "sell")) return null;
  return {
    id,
    symbol,
    side,
    status: String(obj.status ?? ""),
    submittedAt: toIso(obj.submitted_at ?? obj.submittedAt),
    filledAt: toIso(obj.filled_at ?? obj.filledAt),
    filledAvgPrice: num(obj.filled_avg_price ?? obj.filledAvgPrice),
    filledQty: num(obj.filled_qty ?? obj.filledQty),
    notional: num(obj.notional),
    clientOrderId:
      typeof (obj.client_order_id ?? obj.clientOrderId) === "string"
        ? String(obj.client_order_id ?? obj.clientOrderId)
        : null,
  };
}

export function mapQuotes(raw: unknown, now: string): PaperQuote[] {
  if (!raw || typeof raw !== "object") return [];
  const snapshots = (raw as { snapshots?: unknown }).snapshots ?? raw;
  if (!snapshots || typeof snapshots !== "object") return [];
  const quotes: PaperQuote[] = [];
  for (const [symbol, value] of Object.entries(snapshots as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const snap = value as Record<string, unknown>;
    const latest = (snap.latestTrade ?? snap.latest_trade) as
      | Record<string, unknown>
      | undefined;
    const daily = (snap.dailyBar ?? snap.daily_bar) as Record<string, unknown> | undefined;
    const prev = (snap.prevDailyBar ?? snap.prev_daily_bar) as
      | Record<string, unknown>
      | undefined;
    const price = num(latest?.p ?? daily?.c);
    if (price === null || price <= 0) continue;
    const prevClose = num(prev?.c);
    const changePct =
      prevClose !== null && prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    quotes.push({
      symbol,
      price,
      changePct,
      timestamp: toIso(latest?.t ?? daily?.t) ?? now,
    });
  }
  return quotes;
}

async function alpacaJson(
  fetcher: FetchLike,
  origin: string,
  pathname: string,
  key: string,
  secret: string,
) {
  const paper = origin === ALPACA_PAPER_ORIGIN;
  if (paper) assertAlpacaPaperBase(origin);
  else assertAlpacaDataBase(origin);
  const response = await fetcher(`${origin}${pathname}`, {
    headers: {
      "APCA-API-KEY-ID": key,
      "APCA-API-SECRET-KEY": secret,
      Accept: "application/json",
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new PaperGuardError(`Alpaca paper read failed (${response.status}).`);
  }
  return response.json() as Promise<unknown>;
}

function safeJournalDir(dir: string) {
  const resolved = path.resolve(dir);
  if (!path.isAbsolute(resolved) || resolved.includes("\0")) {
    throw new PaperGuardError("AWADBOT_JOURNAL_DIR must be an absolute path.");
  }
  return resolved;
}

async function readJson(file: string) {
  try {
    return JSON.parse(await readFile(file, "utf8")) as unknown;
  } catch {
    return null;
  }
}

export async function loadPaperBook(
  env: PaperEnv,
  deps?: { fetch?: FetchLike; now?: string },
): Promise<PaperBook> {
  const now = deps?.now ?? new Date().toISOString();
  const fetcher = deps?.fetch ?? fetch;
  const book: PaperBook = {
    now,
    account: null,
    positions: [],
    orders: [],
    quotes: [],
    trades: [],
    signals: [],
    ignoredLiveRows: 0,
    openByDesk: null,
    latencyMs: null,
    heartbeat: null,
    heartbeatSource: null,
    halt: { halted: false, reason: null },
    sources: { alpaca: false, dashboard: false, journal: false },
    alpacaError: null,
    dashboardError: null,
    journalError: null,
  };
  let paperBaseOk = false;
  try {
    assertPaperMode(env.mode);
    assertAlpacaPaperBase(env.paperBase);
    paperBaseOk = true;
  } catch (error) {
    book.alpacaError =
      error instanceof Error ? error.message : "Paper mode refused.";
    if ((env.mode ?? "").trim().toLowerCase() !== "paper") return book;
  }

  const started = Date.now();
  if (!paperBaseOk) {
    // Guard already recorded the refusal. Do not send a request.
  } else if (env.key && env.secret) {
    try {
      const [account, positions, orders, clock] = await Promise.all([
        alpacaJson(fetcher, env.paperBase, "/v2/account", env.key, env.secret),
        alpacaJson(fetcher, env.paperBase, "/v2/positions", env.key, env.secret),
        alpacaJson(
          fetcher,
          env.paperBase,
          "/v2/orders?status=all&limit=50&direction=desc",
          env.key,
          env.secret,
        ),
        alpacaJson(fetcher, env.paperBase, "/v2/clock", env.key, env.secret),
      ]);
      book.account = mapAccount(account);
      book.positions = Array.isArray(positions)
        ? positions.map(mapPosition).filter((row): row is PaperPosition => row !== null)
        : [];
      book.orders = Array.isArray(orders)
        ? orders.map(mapOrder).filter((row): row is PaperBrokerOrder => row !== null)
        : [];
      const clockTime =
        clock && typeof clock === "object"
          ? toIso((clock as { timestamp?: unknown }).timestamp)
          : null;
      if (book.account) {
        book.sources.alpaca = true;
        book.heartbeat = clockTime ?? now;
        book.heartbeatSource = "Alpaca paper clock";
      } else {
        book.alpacaError = "Alpaca paper account response had no equity.";
      }
      try {
        const symbols = paperTradablePairs.join(",");
        const quotes = await alpacaJson(
          fetcher,
          ALPACA_DATA_ORIGIN,
          `/v1beta3/crypto/us/snapshots?symbols=${encodeURIComponent(symbols)}`,
          env.key,
          env.secret,
        );
        book.quotes = mapQuotes(quotes, now);
      } catch {
        book.quotes = [];
      }
    } catch (error) {
      book.alpacaError =
        error instanceof PaperGuardError
          ? error.message
          : "Alpaca paper read failed.";
    }
  } else {
    book.alpacaError = "ALPACA_API_KEY and ALPACA_SECRET_KEY are missing.";
  }

  if (env.statusUrl && env.dashboardPassword) {
    try {
      const url = new URL(env.statusUrl);
      if (url.protocol !== "https:" || !url.pathname.endsWith("/api/status")) {
        throw new PaperGuardError(
          "AWADBOT_STATUS_URL must be https and end with /api/status.",
        );
      }
      const response = await fetcher(url, {
        headers: {
          Authorization: `Bearer ${env.dashboardPassword}`,
          Accept: "application/json",
        },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new PaperGuardError(`AwadBot status failed (${response.status}).`);
      const body = (await response.json()) as Record<string, unknown>;
      if (String(body.mode ?? "").toUpperCase() !== "PAPER") {
        throw new PaperGuardError("AwadBot status mode is not PAPER.");
      }
      book.sources.dashboard = true;
      const dashAccount = mapAccount(body.account);
      if (!book.sources.alpaca && dashAccount) {
        book.account = dashAccount;
        book.positions = Array.isArray(body.positions)
          ? body.positions.map(mapPosition).filter((row): row is PaperPosition => row !== null)
          : [];
        book.orders = Array.isArray(body.orders)
          ? body.orders.map(mapOrder).filter((row): row is PaperBrokerOrder => row !== null)
          : [];
      }
      const fetchedAt = toIso(body.fetchedAt);
      if (fetchedAt) {
        book.heartbeat = fetchedAt;
        book.heartbeatSource = "AwadBot /api/status";
      }
    } catch (error) {
      book.dashboardError =
        error instanceof PaperGuardError
          ? error.message
          : "AwadBot status read failed.";
    }
  }

  if (env.journalDir) {
    try {
      const root = safeJournalDir(env.journalDir);
      const csv = await readFile(path.join(root, "logs", "trades.csv"), "utf8");
      const parsed = parseTradesCsv(csv);
      book.trades = parsed.trades;
      book.ignoredLiveRows = parsed.ignoredLiveRows;
      const experience = await readFile(path.join(root, "logs", "experience.jsonl"), "utf8").catch(
        () => "",
      );
      book.signals = experience ? parseExperience(experience) : [];
      const methodPositions = await readJson(path.join(root, "state", "method_positions.json"));
      const simPositions = await readJson(path.join(root, "state", "sim_positions.json"));
      const risk = await readJson(path.join(root, "state", "risk_state.json"));
      const counted = openCountsFromState(methodPositions, simPositions);
      const anyOpen = deskIds.some((id) => counted[id] > 0);
      book.openByDesk = anyOpen ? counted : null;
      book.halt = readHalt(risk);
      book.sources.journal = true;
      const logStat = await stat(path.join(root, "logs", "bot.log")).catch(() => null);
      if (logStat) {
        book.heartbeat = logStat.mtime.toISOString();
        book.heartbeatSource = "AwadBot logs/bot.log";
      } else if (parsed.trades.length) {
        const latest = [...parsed.trades].sort((a, b) =>
          a.timestamp.localeCompare(b.timestamp),
        ).at(-1);
        if (latest) {
          book.heartbeat = latest.timestamp;
          book.heartbeatSource = "AwadBot logs/trades.csv";
        }
      }
    } catch (error) {
      book.journalError =
        error instanceof Error ? "AwadBot journal directory could not be read." : "Journal unread.";
    }
  }

  book.latencyMs = Date.now() - started;
  return book;
}

const RECENT_MS = 6 * 60 * 60 * 1000;

export type FloorStatus = {
  engine: "OFFLINE" | "CONNECTED" | "TRADING" | "DEGRADED" | "HALTED";
  mode: string;
  venue: "alpaca-paper";
  liveTrading: false;
  keys: "present" | "missing";
  heartbeat: string | null;
  heartbeatSource: string | null;
  trading: boolean;
  lastJournalAt: string | null;
  brokerPositionCount: number | null;
  brokerCryptoMarketValue: number | null;
  simJournalFills: number;
  brokerJournalFills: number;
  desks: Record<DeskId, string>;
  ordersSubmittedByCommand: false;
  coinbaseVenue: "deferred";
  killSwitch: "disabled" | "reported-by-awadbot";
  note: string;
};

export function describeFloorStatus(env: PaperEnv, book: PaperBook): FloorStatus {
  const journalTrades = book.trades.filter((trade) => !isResearchOnlySymbol(trade.symbol));
  const lastJournalAt = journalTrades
    .map((trade) => trade.timestamp)
    .sort()
    .at(-1) ?? null;
  const recentJournal =
    lastJournalAt !== null && Date.parse(book.now) - Date.parse(lastJournalAt) <= RECENT_MS;
  const openOrders = book.orders.some(
    (order) =>
      !isResearchOnlySymbol(order.symbol) &&
      ["new", "accepted", "pending_new", "partially_filled", "held"].includes(
        order.status.toLowerCase(),
      ),
  );
  const trading = Boolean(
    book.halt.halted === false &&
      (book.sources.alpaca || book.sources.dashboard || book.sources.journal) &&
      (recentJournal || openOrders || book.positions.length > 0),
  );
  const keys = env.key && env.secret ? "present" : "missing";
  let engine: FloorStatus["engine"] = "OFFLINE";
  if (book.halt.halted) engine = "HALTED";
  else if (book.sources.alpaca || book.sources.dashboard || book.sources.journal) {
    engine = trading ? "TRADING" : "CONNECTED";
  } else if (env.mode === "paper" && (keys === "present" || env.statusUrl || env.journalDir)) {
    engine = "DEGRADED";
  }
  const simJournalFills = journalTrades.filter((trade) => trade.sim).length;
  const brokerJournalFills = journalTrades.filter((trade) => !trade.sim).length;
  const cryptoMv = book.sources.alpaca || book.sources.dashboard
    ? brokerCryptoMarketValue(book.positions)
    : null;
  const parts = [
    "COMMAND mirrors the shared AwadBot Alpaca paper book and does not submit orders.",
    "liveTrading is false.",
  ];
  if (env.mode !== "paper") {
    parts.push("Set TRADE_MODE=paper. Any other mode is refused.");
  }
  if (keys === "missing") {
    parts.push("Set ALPACA_API_KEY and ALPACA_SECRET_KEY (paper-api only).");
  }
  if (!env.journalDir) {
    parts.push(
      "Set AWADBOT_JOURNAL_DIR to the AwadBot checkout to show sleeve fills. sim=true rows are curriculum, not broker cash.",
    );
  } else if (simJournalFills > 0) {
    parts.push(
      `${simJournalFills} journal row(s) are sim=true curriculum fills. Broker crypto market value can stay near zero while those rows exist.`,
    );
  }
  parts.push(
    "Coinbase is deferred. TRADE_* Coinbase keys are not read and are not required to leave sample mode.",
  );
  if (book.alpacaError && !book.sources.alpaca) parts.push(book.alpacaError);
  if (book.dashboardError) parts.push(book.dashboardError);
  if (book.journalError) parts.push(book.journalError);
  return {
    engine,
    mode: env.mode || "unset",
    venue: "alpaca-paper",
    liveTrading: false,
    keys,
    heartbeat: book.heartbeat,
    heartbeatSource: book.heartbeatSource,
    trading,
    lastJournalAt,
    brokerPositionCount: book.account ? book.positions.length : null,
    brokerCryptoMarketValue: cryptoMv,
    simJournalFills,
    brokerJournalFills,
    desks: {
      samurai: "trend_ema",
      neon: "mean_reversion",
      orbit: "momentum_breakout",
      phantom: "scalp_momentum",
    },
    ordersSubmittedByCommand: false,
    coinbaseVenue: "deferred",
    killSwitch: book.halt.halted ? "reported-by-awadbot" : "disabled",
    note: parts.join(" "),
  };
}

export async function loadFloor() {
  const env = readPaperEnv();
  const book = await loadPaperBook(env);
  return {
    env,
    book,
    status: describeFloorStatus(env, book),
    snapshot: buildPaperSnapshot(book),
  };
}
