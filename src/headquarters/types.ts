export type NewsItem = {
  title: string;
  url: string;
  publishedAt: string | null;
  source: string;
};
export type Candle = {
  time: number;
  low: number;
  high: number;
  open: number;
  close: number;
  volume: number;
};
export type FeedSnapshot = {
  checkedAt: string;
  world: NewsItem[];
  crypto: NewsItem[];
  candles: Candle[];
  product: string;
  granularity: number;
  errors: string[];
};
export type TaskItem = {
  id: string;
  title: string;
  status: string;
  agentId: string;
  createdAt: string;
};
export type FinancePoint = { date: string; revenue: number; expenses: number };
export type OpsSnapshot = {
  checkedAt: string;
  authenticated: boolean;
  tasks: TaskItem[];
  tasksAvailable: boolean;
  finance: {
    points: FinancePoint[];
    revenue: number | null;
    expenses: number | null;
    net: number | null;
    excludedCurrencies: number;
    truncated: boolean;
  };
  notice: string | null;
};
export type NotebookItem = {
  id: string;
  kind: "task" | "schedule" | "content";
  title: string;
  when: string;
  done: boolean;
};
