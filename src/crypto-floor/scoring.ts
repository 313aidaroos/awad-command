import { metricNames, type MetricName, type Metrics } from "./model";
export type ScoreRule = {
  weight: number;
  min: number;
  max: number;
  lowerIsBetter?: boolean;
};
export type ScoreConfig = Record<MetricName, ScoreRule>;
/** Explicit units: returns/drawdown/alpha are percentage points, rates and efficiencies 0..1. */
export const defaultScoreConfig: ScoreConfig = {
  netReturn: { weight: 12, min: -10, max: 15 },
  slippageEfficiency: { weight: 5, min: 0, max: 1 },
  maxDrawdown: { weight: 14, min: 0, max: 15, lowerIsBetter: true },
  sharpe: { weight: 10, min: -1, max: 3 },
  sortino: { weight: 10, min: -1, max: 4 },
  winRate: { weight: 4, min: 0, max: 1 },
  profitFactor: { weight: 8, min: 0, max: 3 },
  averageWin: { weight: 3, min: 0, max: 5 },
  averageLoss: { weight: 4, min: 0, max: 5, lowerIsBetter: true },
  consistency: { weight: 7, min: 0, max: 1 },
  tradeCount: { weight: 4, min: 0, max: 100 },
  btcAlpha: { weight: 7, min: -10, max: 10 },
  uptime: { weight: 4, min: 0, max: 1 },
  violations: { weight: 5, min: 0, max: 5, lowerIsBetter: true },
  turnover: { weight: 1, min: 0, max: 20, lowerIsBetter: true },
  feeEfficiency: { weight: 2, min: 0, max: 1 },
};
export function awadScore(
  metrics: Metrics,
  config: ScoreConfig = defaultScoreConfig,
): number | null {
  let sum = 0,
    weights = 0;
  for (const key of metricNames) {
    const rule = config[key],
      value = metrics[key];
    if (
      !rule ||
      !Number.isFinite(rule.weight) ||
      rule.weight < 0 ||
      !Number.isFinite(rule.min) ||
      !Number.isFinite(rule.max) ||
      rule.max <= rule.min
    )
      throw new Error("Invalid score rule");
    if (rule.weight === 0) continue;
    if (value === null || !Number.isFinite(value)) return null;
    const n = Math.max(
      0,
      Math.min(1, (value - rule.min) / (rule.max - rule.min)),
    );
    sum += (rule.lowerIsBetter ? 1 - n : n) * rule.weight;
    weights += rule.weight;
  }
  return weights ? Math.round((sum / weights) * 1000) / 10 : null;
}
/** Qualification never enables execution or allocates capital. Missing evidence fails closed. */
export function promotionReadiness(
  metrics: Metrics,
  days: number,
  config = { minDays: 30, minTrades: 100, minScore: 75, maxDrawdown: 5 },
) {
  const score = awadScore(metrics);
  return {
    score,
    eligible:
      score !== null &&
      score >= config.minScore &&
      days >= config.minDays &&
      (metrics.tradeCount ?? 0) >= config.minTrades &&
      metrics.maxDrawdown !== null &&
      metrics.maxDrawdown <= config.maxDrawdown &&
      metrics.violations === 0,
  };
}
