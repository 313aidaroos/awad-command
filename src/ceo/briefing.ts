import type { CommandState } from '@/store/types';

export function briefingLine(state: Pick<CommandState, 'projects'>): string {
  const contraxis = state.projects.contraxis;
  if (!contraxis) return 'Walk the universe. Click an orb to talk to its lead.';
  return 'Contraxis is the highest-activity orb in the demo stream. Inspect conversion before any spend.';
}
