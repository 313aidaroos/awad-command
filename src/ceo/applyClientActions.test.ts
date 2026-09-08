import { beforeEach, describe, expect, it } from 'vitest';
import { applyCeoClientActions } from '@/ceo/applyClientActions';
import { useCommandStore } from '@/store/useCommandStore';

describe('applyCeoClientActions', () => {
  beforeEach(() => {
    useCommandStore.setState({
      view: 'universe',
      focusedProject: undefined,
      contextPanel: 'none',
      leadMessages: [],
      approvals: [],
      events: { buffer: [], unread: 0 },
      mode: 'default',
    });
    useCommandStore.getState().initFromRegistry();
  });

  it('flies to a project and opens the lead panel after a delivered message', () => {
    const notes = applyCeoClientActions(
      [
        {
          name: 'message_lead',
          projectSlug: 'contraxis',
          leadName: 'Contraxis Lead',
          status: 'delivered',
          record: {
            id: 'lm_1',
            projectSlug: 'contraxis',
            leadName: 'Contraxis Lead',
            agentId: 'agent',
            message: 'ping',
            status: 'delivered',
            ts: 1,
            direction: 'outbound',
          },
        },
      ],
      useCommandStore,
    );
    const state = useCommandStore.getState();
    expect(state.focusedProject).toBe('contraxis');
    expect(state.contextPanel).toBe('lead');
    expect(state.leadMessages[0]?.id).toBe('lm_1');
    expect(notes.join(' ')).toMatch(/delivered to Contraxis Lead/);
  });

  it('applies navigate and open_panel without inventing a send', () => {
    applyCeoClientActions(
      [
        { name: 'navigate', project: 'socixis' },
        { name: 'open_panel', kind: 'analytics' },
      ],
      useCommandStore,
    );
    const state = useCommandStore.getState();
    expect(state.focusedProject).toBe('socixis');
    expect(state.contextPanel).toBe('analytics');
    expect(state.leadMessages).toHaveLength(0);
  });

  it('does not fly or queue a success on an unknown lead', () => {
    applyCeoClientActions(
      [{ name: 'message_lead', status: 'unknown', error: 'Unknown lead (ghost). No message was sent.' }],
      useCommandStore,
    );
    const state = useCommandStore.getState();
    expect(state.focusedProject).toBeUndefined();
    expect(state.leadMessages).toHaveLength(0);
  });
});
