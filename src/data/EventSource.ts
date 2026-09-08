import type { CommandEvent } from '@/types/events';

export interface EventSource {
  start(emit: (event: CommandEvent) => void): void;
  stop(): void;
}
