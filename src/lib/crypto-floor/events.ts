import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Robot notebook writer (crypto_floor_events). Counts every write and every failure so a tick can report
 * `eventsWritten` / `eventErrors` — a failed insert is never silent again.
 *
 * Event types: heartbeat, signal, order_submitted, order_filled, order_rejected, order_canceled, halt, resume,
 * kill_switch, kill_reset, review, param_change, experiment, shadow_fill, report, data_stale, system.
 */
export type RobotEvent = {
  type: string;
  agentRole: "scout" | "analyst" | "trader" | "risk" | "system";
  title: string;
  desk?: string | null;
  strategy?: string | null;
  symbol?: string | null;
  side?: string | null;
  qty?: number | null;
  price?: number | null;
  orderId?: string | null;
  payload?: Record<string, unknown>;
  ts?: string;
};

export class EventLog {
  written = 0;
  errors = 0;
  lastError: string | null = null;

  constructor(private db: SupabaseClient | null) {}

  async log(e: RobotEvent): Promise<boolean> {
    if (!this.db) {
      this.errors++;
      this.lastError = "Crypto Floor DB not configured";
      console.error("crypto-floor event dropped (no DB):", e.type, e.title);
      return false;
    }
    try {
      const { error } = await this.db.from("crypto_floor_events").insert({
        ts: e.ts ?? new Date().toISOString(),
        desk: e.desk ?? null,
        agent_role: e.agentRole,
        type: e.type,
        symbol: e.symbol ?? null,
        side: e.side ?? null,
        qty: e.qty ?? null,
        price: e.price ?? null,
        payload: { title: e.title, ...(e.payload ?? {}) },
        order_id: e.orderId ?? null,
        strategy: e.strategy ?? null,
      });
      if (error) {
        // Duplicate (type, order_id) means this exact event is already recorded: not an error.
        if (error.code === "23505") return true;
        throw new Error(error.message);
      }
      this.written++;
      return true;
    } catch (err) {
      this.errors++;
      this.lastError = err instanceof Error ? err.message : String(err);
      console.error("crypto-floor event insert failed:", this.lastError, { type: e.type, symbol: e.symbol });
      return false;
    }
  }
}
