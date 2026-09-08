import type { EventSource } from '@/data/EventSource';
import type { CommandEvent } from '@/types/events';

/** Phase 2 stub — live Realtime is wired when the shared schema is authenticated. */
export class SupabaseEventSource implements EventSource {
  start(emit: (event: CommandEvent) => void) {
    void emit;
    // Intentionally empty in Phase 1. DemoEventSource remains the driver
    // until a live fetch succeeds in a later drop.
  }

  stop() {
    // no-op
  }
}
