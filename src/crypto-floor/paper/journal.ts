import { deskForMethod, type DeskId } from "./desks";
import { isResearchOnlySymbol } from "./universe";

export type JournalTrade = {
  timestamp: string;
  mode: string;
  action: "buy" | "sell";
  symbol: string;
  qty: number;
  price: number;
  notional: number;
  reason: string;
  method: string;
  sim: boolean;
};

export type JournalSignal = {
  timestamp: string;
  method: string;
  symbol: string;
  detail: string;
};

export type ParsedJournal = {
  trades: JournalTrade[];
  signals: JournalSignal[];
  ignoredLiveRows: number;
  skippedRows: number;
  openByDesk: Record<DeskId, number>;
};

const emptyOpen = (): Record<DeskId, number> => ({
  samurai: 0,
  neon: 0,
  orbit: 0,
  phantom: 0,
});

export function baseAsset(symbol: string) {
  const upper = symbol.trim().toUpperCase().replaceAll("-", "/");
  if (!upper) return "";
  if (upper.includes("/")) return upper.split("/")[0] ?? upper;
  if (upper.endsWith("USDT")) return upper.slice(0, -4);
  if (upper.endsWith("USD")) return upper.slice(0, -3);
  return upper;
}

export function normalizeCryptoSymbol(symbol: string) {
  const base = baseAsset(symbol);
  if (!/^[A-Z]{2,10}$/.test(base)) {
    throw new Error(`Unsupported crypto symbol ${symbol}`);
  }
  return `${base}/USD`;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function toIso(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function truthy(value: string) {
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function parseTradesCsv(text: string): {
  trades: JournalTrade[];
  ignoredLiveRows: number;
  skippedRows: number;
} {
  const rows = parseCsv(text);
  if (!rows.length) return { trades: [], ignoredLiveRows: 0, skippedRows: 0 };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const known = [
    "timestamp",
    "mode",
    "action",
    "symbol",
    "qty",
    "price",
    "notional",
    "reason",
    "method",
    "sim",
  ];
  const indexed = header.length >= 4 && known.some((k) => header.includes(k));
  const start = indexed ? 1 : 0;
  const col = (name: string, fallback: number) => {
    const at = header.indexOf(name);
    return indexed && at >= 0 ? at : fallback;
  };
  const trades: JournalTrade[] = [];
  let ignoredLiveRows = 0;
  let skippedRows = 0;
  for (const cells of rows.slice(start)) {
    const mode = (cells[col("mode", 1)] ?? "").trim().toLowerCase();
    if (mode === "live") {
      ignoredLiveRows++;
      continue;
    }
    if (mode && mode !== "paper") {
      skippedRows++;
      continue;
    }
    const action = (cells[col("action", 2)] ?? "").trim().toLowerCase();
    if (action !== "buy" && action !== "sell") {
      skippedRows++;
      continue;
    }
    const timestamp = toIso(cells[col("timestamp", 0)]);
    const price = num(cells[col("price", 5)]);
    const qty = num(cells[col("qty", 4)]);
    const notional = num(cells[col("notional", 6)]);
    const symbol = (cells[col("symbol", 3)] ?? "").trim();
    const method = (cells[col("method", 8)] ?? "").trim().toLowerCase();
    if (!timestamp || !symbol || !method || price === null || price <= 0) {
      skippedRows++;
      continue;
    }
    const size = qty !== null && qty > 0 ? qty : notional !== null && notional > 0 ? notional / price : null;
    if (size === null || size <= 0) {
      skippedRows++;
      continue;
    }
    trades.push({
      timestamp,
      mode: mode || "paper",
      action,
      symbol,
      qty: size,
      price,
      notional: notional ?? size * price,
      reason: (cells[col("reason", 7)] ?? "").trim(),
      method,
      sim: truthy(cells[col("sim", 9)] ?? ""),
    });
  }
  return { trades, ignoredLiveRows, skippedRows };
}

export function parseExperience(text: string): JournalSignal[] {
  const signals: JournalSignal[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let row: unknown;
    try {
      row = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!row || typeof row !== "object") continue;
    const obj = row as Record<string, unknown>;
    const method =
      typeof obj.method === "string" ? obj.method.trim().toLowerCase() : "";
    if (!deskForMethod(method)) continue;
    const kind = String(obj.event ?? obj.kind ?? obj.type ?? "").toLowerCase();
    const action = String(obj.action ?? "").toLowerCase();
    const looksLikeFill =
      (action === "buy" || action === "sell") &&
      num(obj.price) !== null &&
      num(obj.qty ?? obj.quantity) !== null;
    if (looksLikeFill && !kind.includes("signal") && !kind.includes("scan")) {
      continue;
    }
    if (
      kind &&
      !/signal|scan|search|thesis|pattern/.test(kind) &&
      !action.includes("signal")
    ) {
      continue;
    }
    const timestamp = toIso(obj.timestamp ?? obj.ts ?? obj.time);
    const symbol = String(obj.symbol ?? obj.pair ?? "").trim();
    const detail = String(
      obj.detail ?? obj.reason ?? obj.message ?? obj.summary ?? "",
    ).trim();
    if (!timestamp || !symbol || !detail) continue;
    signals.push({ timestamp, method, symbol, detail });
  }
  return signals;
}

function looksLikeSymbol(key: string) {
  const upper = key.trim().toUpperCase();
  return upper.includes("/") || upper.includes("-") || upper.endsWith("USD");
}

function walkOpen(
  node: unknown,
  inheritedMethod: string | undefined,
  counts: Record<DeskId, number>,
) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walkOpen(item, inheritedMethod, counts);
    return;
  }
  const obj = node as Record<string, unknown>;
  const method =
    typeof obj.method === "string" ? obj.method.trim().toLowerCase() : inheritedMethod;
  const qty = num(obj.qty ?? obj.quantity ?? obj.size ?? obj.position);
  const symbol = obj.symbol ?? obj.pair ?? obj.asset;
  if (
    method &&
    typeof symbol === "string" &&
    !isResearchOnlySymbol(symbol) &&
    looksLikeSymbol(symbol) &&
    qty !== null &&
    Math.abs(qty) > 0 &&
    deskForMethod(method)
  ) {
    counts[deskForMethod(method)!] += 1;
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    const keyMethod = deskForMethod(key) ? key : method;
    if (value && typeof value === "object") {
      const child = value as Record<string, unknown>;
      const nestedQty = num(child.qty ?? child.quantity ?? child.size ?? child.position);
      if (
        keyMethod &&
        deskForMethod(keyMethod) &&
        looksLikeSymbol(key) &&
        !isResearchOnlySymbol(key) &&
        nestedQty !== null &&
        Math.abs(nestedQty) > 0 &&
        child.symbol === undefined
      ) {
        counts[deskForMethod(keyMethod)!] += 1;
        continue;
      }
      walkOpen(value, keyMethod, counts);
      continue;
    }
    const size = num(value);
    if (
      keyMethod &&
      deskForMethod(keyMethod) &&
      size !== null &&
      Math.abs(size) > 0 &&
      looksLikeSymbol(key) &&
      !isResearchOnlySymbol(key)
    ) {
      counts[deskForMethod(keyMethod)!] += 1;
    }
  }
}

export function openCountsFromState(...nodes: unknown[]): Record<DeskId, number> {
  const counts = emptyOpen();
  for (const node of nodes) walkOpen(node, undefined, counts);
  return counts;
}

export type LotPnl = {
  realized: number;
  unrealized: number;
  openSymbols: number;
};

/** FIFO from journal prices. Missing marks leave unrealized at 0 rather than inventing a price. */
export function fifoPnl(
  trades: JournalTrade[],
  marks: ReadonlyMap<string, number>,
): LotPnl {
  const lots = new Map<string, { qty: number; price: number }[]>();
  let realized = 0;
  const ordered = [...trades].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const trade of ordered) {
    const key = baseAsset(trade.symbol);
    const book = lots.get(key) ?? [];
    if (trade.action === "buy") {
      book.push({ qty: trade.qty, price: trade.price });
      lots.set(key, book);
      continue;
    }
    let left = trade.qty;
    while (left > 1e-12 && book.length) {
      const lot = book[0];
      const take = Math.min(lot.qty, left);
      realized += (trade.price - lot.price) * take;
      lot.qty -= take;
      left -= take;
      if (lot.qty <= 1e-12) book.shift();
    }
    lots.set(key, book);
  }
  let unrealized = 0;
  let openSymbols = 0;
  for (const [symbol, book] of lots) {
    const qty = book.reduce((sum, lot) => sum + lot.qty, 0);
    if (qty <= 1e-12) continue;
    openSymbols += 1;
    const mark = marks.get(symbol);
    if (mark === undefined || !(mark > 0)) continue;
    const cost = book.reduce((sum, lot) => sum + lot.qty * lot.price, 0);
    unrealized += mark * qty - cost;
  }
  return { realized, unrealized, openSymbols };
}

export function readHalt(risk: unknown): { halted: boolean; reason: string | null } {
  if (!risk || typeof risk !== "object") return { halted: false, reason: null };
  const obj = risk as Record<string, unknown>;
  const flag = obj.halted ?? obj.kill_switch ?? obj.killSwitch ?? obj.trading_halted;
  if (flag === true) {
    return {
      halted: true,
      reason:
        typeof obj.reason === "string" && obj.reason.trim()
          ? obj.reason.trim()
          : "AwadBot risk_state reports a halt.",
    };
  }
  return { halted: false, reason: null };
}

