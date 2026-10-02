/**
 * Crypto Floor: Momentum V1 Strategy
 * Pure function, unit-tested
 * 
 * Universe: BTC/USD, ETH/USD, SOL/USD
 * Entry: no position AND 1h return > threshold → market buy 2% equity
 * Exit: P&L ≤ −1.5% or ≥ +3.0% → sell all
 * Limits: max 3 open, max 1 entry per symbol per 4h, halt if day P&L ≤ −2%
 */

export type MomentumConfig = {
  universe: string[]; // ["BTC/USD", "ETH/USD", "SOL/USD"]
  entryThresholdPct: number; // 2.0 = 2%
  exitStopPct: number; // -1.5 = -1.5%
  exitTakePct: number; // 3.0 = 3%
  positionSizePct: number; // 2.0 = 2% of equity
  maxOpenPositions: number; // 3
  minEntryIntervalHours: number; // 4
  haltDayLossPct: number; // -2.0 = -2%
};

export const defaultConfig: MomentumConfig = {
  universe: ["BTC/USD", "ETH/USD", "SOL/USD"],
  entryThresholdPct: 2.0,
  exitStopPct: -1.5,
  exitTakePct: 3.0,
  positionSizePct: 2.0,
  maxOpenPositions: 3,
  minEntryIntervalHours: 4,
  haltDayLossPct: -2.0,
};

export type Bar = {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Position = {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
};

export type RecentEntry = {
  symbol: string;
  timestamp: string;
};

export type Signal = {
  type: "entry" | "exit";
  symbol: string;
  side: "buy" | "sell";
  reason: string;
  qty?: number; // For entry signals
  currentReturn?: number; // For entry signals
  pnlPct?: number; // For exit signals
};

export type StrategyState = {
  signals: Signal[];
  shouldHalt: boolean;
  haltReason?: string;
  dayPnlPct: number;
};

/**
 * Calculate 1-hour return for a symbol
 */
export function calculateReturn(bars: Bar[]): number | null {
  if (bars.length < 2) return null;
  
  const latest = bars[bars.length - 1];
  const hourAgo = bars[bars.length - 2];
  
  if (!latest || !hourAgo || hourAgo.close === 0) return null;
  
  return ((latest.close - hourAgo.close) / hourAgo.close) * 100;
}

/**
 * Check if symbol had recent entry (within minEntryIntervalHours)
 */
export function hasRecentEntry(
  symbol: string,
  recentEntries: RecentEntry[],
  minIntervalHours: number,
  now: number = Date.now()
): boolean {
  const cutoff = now - minIntervalHours * 60 * 60 * 1000;
  
  return recentEntries.some(
    (entry) =>
      entry.symbol === symbol &&
      new Date(entry.timestamp).getTime() > cutoff
  );
}

/**
 * Run momentum strategy
 */
export function runStrategy(
  config: MomentumConfig,
  bars: Map<string, Bar[]>, // symbol → bars (oldest to newest)
  positions: Position[],
  recentEntries: RecentEntry[],
  equity: number,
  startOfDayEquity: number,
  now: number = Date.now()
): StrategyState {
  const signals: Signal[] = [];
  
  // Check day P&L halt condition
  const dayPnl = equity - startOfDayEquity;
  const dayPnlPct = (dayPnl / startOfDayEquity) * 100;
  
  if (dayPnlPct <= config.haltDayLossPct) {
    return {
      signals: [],
      shouldHalt: true,
      haltReason: `Day P&L ${dayPnlPct.toFixed(2)}% ≤ ${config.haltDayLossPct}%`,
      dayPnlPct,
    };
  }
  
  // Check exit signals first (existing positions)
  for (const position of positions) {
    if (position.unrealizedPnlPct <= config.exitStopPct) {
      signals.push({
        type: "exit",
        symbol: position.symbol,
        side: "sell",
        reason: `Stop loss: P&L ${position.unrealizedPnlPct.toFixed(2)}% ≤ ${config.exitStopPct}%`,
        pnlPct: position.unrealizedPnlPct,
      });
    } else if (position.unrealizedPnlPct >= config.exitTakePct) {
      signals.push({
        type: "exit",
        symbol: position.symbol,
        side: "sell",
        reason: `Take profit: P&L ${position.unrealizedPnlPct.toFixed(2)}% ≥ ${config.exitTakePct}%`,
        pnlPct: position.unrealizedPnlPct,
      });
    }
  }
  
  // Check entry signals (max open limit)
  if (positions.length >= config.maxOpenPositions) {
    return { signals, shouldHalt: false, dayPnlPct };
  }
  
  // Scan universe for entry opportunities
  for (const symbol of config.universe) {
    // Skip if already have position
    if (positions.some((p) => p.symbol === symbol)) continue;
    
    // Skip if recent entry
    if (hasRecentEntry(symbol, recentEntries, config.minEntryIntervalHours, now)) {
      continue;
    }
    
    // Calculate 1h return
    const symbolBars = bars.get(symbol);
    if (!symbolBars || symbolBars.length < 2) continue;
    
    const returnPct = calculateReturn(symbolBars);
    if (returnPct === null) continue;
    
    // Entry signal if return > threshold
    if (returnPct > config.entryThresholdPct) {
      const latestBar = symbolBars[symbolBars.length - 1];
      const positionValue = equity * (config.positionSizePct / 100);
      const qty = positionValue / latestBar.close;
      
      signals.push({
        type: "entry",
        symbol,
        side: "buy",
        reason: `1h return ${returnPct.toFixed(2)}% > ${config.entryThresholdPct}%`,
        qty,
        currentReturn: returnPct,
      });
    }
  }
  
  return { signals, shouldHalt: false, dayPnlPct };
}
