/** Shared-book sleeves. COMMAND does not run a second strategy engine. */

export const deskMethods = {
  samurai: ["trend_ema"],
  neon: ["mean_reversion"],
  orbit: ["momentum_breakout"],
  phantom: ["scalp_momentum", "paper_scalp"],
} as const;

export type DeskId = keyof typeof deskMethods;

export const primaryMethod: Record<DeskId, string> = {
  samurai: "trend_ema",
  neon: "mean_reversion",
  orbit: "momentum_breakout",
  phantom: "scalp_momentum",
};

export const deskIds = Object.keys(deskMethods) as DeskId[];

const methodDesk = new Map<string, DeskId>(
  deskIds.flatMap((desk) =>
    deskMethods[desk].map((method) => [method, desk] as const),
  ),
);

export function deskForMethod(method: string | null | undefined): DeskId | null {
  const key = (method ?? "").trim().toLowerCase();
  return methodDesk.get(key) ?? null;
}

export function methodMentioned(text: string | null | undefined): string | null {
  const blob = (text ?? "").toLowerCase();
  if (!blob) return null;
  for (const method of methodDesk.keys()) {
    if (blob.includes(method)) return method;
  }
  return null;
}
