/**
 * Crypto Floor: Dip V1 Strategy (Awad's buy-the-dip)
 * Pure function, unit-tested
 * 
 * WATCH: 1h return, 24h return, distance from 24h high
 * BUY: (24h return ≤ −4% OR price ≤ 24h high × 0.95) AND no open dip position AND last 1h candle closed above open (first green hour)
 * SIZE: 2% equity, max 1 entry/symbol/24h
 * SCALE-IN: holding + price falls another −4% from entry → one more 2% tranche (max 2 tranches/symbol)
 * SELL: P&L ≥ +4% (take) OR ≤ −8% (stop) OR held > 72h with P&L > 0 (time exit)
 */

export type DipConfig = {
  universe: string[]; // ["BTC/USD", "ETH/USD", "SOL/USD"]
  dipThresholdPct: number; // -4.0 = enter when 24h return ≤ -4%
  dipFromHighPct: number; // 0.95 = enter when price ≤ 95% of 24h high
  takeProfitPct: number; // 4.0 = exit at +4%
  stopLossPct: number; // -8.0 = exit at -8%
  positionSizePct: number; // 2.0 = 2% of equity per tranche
  scaleInEnabled: boolean; // true = add 2nd tranche
  scaleInDropPct: number; // -4.0 = scale in when price drops another 4% from entry
  maxTranches: number; // 2
  minEntryIntervalHours: number; // 24
  maxHoldHours: number; // 72
};

export const defaultDipConfig: DipConfig = {
  universe: ["BTC/USD", "ETH/USD", "SOL/USD"],
  dipThresholdPct: -4.0,
  dipFromHighPct: 0.95,
  takeProfitPct: 4.0,
  stopLossPct: -8.0,
  positionSizePct: 2.0,
  scaleInEnabled: true,
  scaleInDropPct: -4.0,
  maxTranches: 2,
  minEntryIntervalHours: 24,
  maxHoldHours: 72,
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
  enteredAt?: string; // Timestamp of entry
  tranches?: number; // Number of tranches (1 or 2)
};

export type RecentEntry = {
  symbol: string;
  timestamp: string;
  strategy: string;
};

export type Signal = {
  type: "entry" | "exit" | "scale_in";
  symbol: string;
  side: "buy" | "sell";
  reason: string;
  qty?: number;
  currentReturn24h?: number;
  distanceFromHigh?: number;
  pnlPct?: number;
  hoursHeld?: number;
};

export type DipState = {
  signals: Signal[];
};

/**
 * Calculate 1-hour return
 */
export function calculate1hReturn(bars: Bar[]): number | null {
  if (bars.length < 2) return null;
  const latest = bars[bars.length - 1];
  const hourAgo = bars[bars.length - 2];
  if (!latest || !hourAgo || hourAgo.close === 0) return null;
  return ((latest.close - hourAgo.close) / hourAgo.close) * 100;
}

/**
 * Calculate 24-hour return
 */
export function calculate24hReturn(bars: Bar[]): number | null {
  if (bars.length < 25) return null; // Need 24 hours + current
  const latest = bars[bars.length - 1];
  const dayAgo = bars[bars.length - 25];
  if (!latest || !dayAgo || dayAgo.close === 0) return null;
  return ((latest.close - dayAgo.close) / dayAgo.close) * 100;
}

/**
 * Calculate 24-hour high
 */
export function calculate24hHigh(bars: Bar[]): number | null {
  if (bars.length < 25) return null;
  const last24h = bars.slice(-25);
  return Math.max(...last24h.map((b) => b.high));
}

/**
 * Check if last 1h candle closed green (above open)
 */
export function isLastCandleGreen(bars: Bar[]): boolean {
  if (bars.length < 1) return false;
  const latest = bars[bars.length - 1];
  return latest.close > latest.open;
}

/**
 * Check if symbol had recent entry (within minEntryIntervalHours)
 */
export function hasRecentDipEntry(
  symbol: string,
  recentEntries: RecentEntry[],
  minIntervalHours: number
): boolean {
  const cutoff = Date.now() - minIntervalHours * 60 * 60 * 1000;
  return recentEntries.some(
    (entry) =>
      entry.symbol === symbol &&
      entry.strategy === "dip-v1" &&
      new Date(entry.timestamp).getTime() > cutoff
  );
}

/**
 * Calculate hours held for a position
 */
export function hoursHeld(position: Position): number {
  if (!position.enteredAt) return 0;
  const enteredMs = new Date(position.enteredAt).getTime();
  const nowMs = Date.now();
  return (nowMs - enteredMs) / (1000 * 60 * 60);
}

/**
 * Run dip-v1 strategy
 */
export function runDipStrategy(
  config: DipConfig,
  bars1h: Map<string, Bar[]>, // symbol → 1h bars (need 25 for 24h data)
  positions: Position[],
  recentEntries: RecentEntry[],
  equity: number
): DipState {
  const signals: Signal[] = [];

  // Check exit signals first (existing dip positions)
  for (const position of positions.filter(
    (p) => p.symbol && config.universe.includes(p.symbol)
  )) {
    const held = hoursHeld(position);

    // Take profit
    if (position.unrealizedPnlPct >= config.takeProfitPct) {
      signals.push({
        type: "exit",
        symbol: position.symbol,
        side: "sell",
        reason: `Take profit: P&L ${position.unrealizedPnlPct.toFixed(2)}% ≥ ${config.takeProfitPct}%`,
        pnlPct: position.unrealizedPnlPct,
        hoursHeld: held,
      });
      continue;
    }

    // Stop loss
    if (position.unrealizedPnlPct <= config.stopLossPct) {
      signals.push({
        type: "exit",
        symbol: position.symbol,
        side: "sell",
        reason: `Stop loss: P&L ${position.unrealizedPnlPct.toFixed(2)}% ≤ ${config.stopLossPct}%`,
        pnlPct: position.unrealizedPnlPct,
        hoursHeld: held,
      });
      continue;
    }

    // Time exit (held > maxHoldHours with profit)
    if (held > config.maxHoldHours && position.unrealizedPnlPct > 0) {
      signals.push({
        type: "exit",
        symbol: position.symbol,
        side: "sell",
        reason: `Time exit: held ${held.toFixed(1)}h > ${config.maxHoldHours}h with P&L ${position.unrealizedPnlPct.toFixed(2)}%`,
        pnlPct: position.unrealizedPnlPct,
        hoursHeld: held,
      });
      continue;
    }

    // Scale-in check (if enabled and < maxTranches)
    if (
      config.scaleInEnabled &&
      (position.tranches || 1) < config.maxTranches
    ) {
      const dropFromEntry =
        ((position.currentPrice - position.avgEntryPrice) /
          position.avgEntryPrice) *
        100;
      
      if (dropFromEntry <= config.scaleInDropPct) {
        const positionValue = equity * (config.positionSizePct / 100);
        const qty = positionValue / position.currentPrice;

        signals.push({
          type: "scale_in",
          symbol: position.symbol,
          side: "buy",
          reason: `Scale-in: price dropped ${dropFromEntry.toFixed(2)}% from entry`,
          qty,
        });
      }
    }
  }

  // Check entry signals (no dip position yet)
  for (const symbol of config.universe) {
    // Skip if already have dip position
    if (positions.some((p) => p.symbol === symbol)) continue;

    // Skip if recent dip entry
    if (hasRecentDipEntry(symbol, recentEntries, config.minEntryIntervalHours)) {
      continue;
    }

    const symbolBars = bars1h.get(symbol);
    if (!symbolBars || symbolBars.length < 25) continue;

    const return24h = calculate24hReturn(symbolBars);
    const high24h = calculate24hHigh(symbolBars);
    const lastClose = symbolBars[symbolBars.length - 1].close;
    const isGreen = isLastCandleGreen(symbolBars);

    if (return24h === null || high24h === null) continue;

    // Must have green last candle (don't catch falling knife)
    if (!isGreen) continue;

    const distanceFromHighPct = ((lastClose - high24h) / high24h) * 100;
    const isDipByReturn = return24h <= config.dipThresholdPct;
    const isDipByHigh = lastClose <= high24h * config.dipFromHighPct;

    if (isDipByReturn || isDipByHigh) {
      const positionValue = equity * (config.positionSizePct / 100);
      const qty = positionValue / lastClose;

      const reason = isDipByReturn
        ? `24h return ${return24h.toFixed(2)}% ≤ ${config.dipThresholdPct}%, green candle`
        : `Price ${distanceFromHighPct.toFixed(2)}% from 24h high, green candle`;

      signals.push({
        type: "entry",
        symbol,
        side: "buy",
        reason,
        qty,
        currentReturn24h: return24h,
        distanceFromHigh: distanceFromHighPct,
      });
    }
  }

  return { signals };
}
