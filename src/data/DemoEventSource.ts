import { demoRunners } from '@/projects/registry';
import { projects } from '@/projects/registry';
import type { EventSource } from '@/data/EventSource';
import type { CommandEvent } from '@/types/events';

export class DemoEventSource implements EventSource {
  private cleanups: Array<() => void> = [];

  start(emit: (event: CommandEvent) => void) {
    this.stop();
    for (const project of projects) {
      const runner = demoRunners[project.slug];
      if (runner) this.cleanups.push(runner(emit, project));
    }
  }

  stop() {
    this.cleanups.forEach((stop) => stop());
    this.cleanups = [];
  }
}
