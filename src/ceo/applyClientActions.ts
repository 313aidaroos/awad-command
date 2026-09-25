// Change note (Claude, Sep 2026): Handles the email-draft card action. See docs/LAUNCH_NOTES.md.
import type { CeoClientAction } from '@/ceo/tools.types';
import type { CommandActions, CommandState } from '@/store/types';
import type { EventType } from '@/types/events';

type Store = { getState: () => CommandState & CommandActions };

function leadEventType(status: 'delivered' | 'queued' | 'failed' | 'unknown'): EventType {
  if (status === 'delivered') return 'lead.message.delivered';
  if (status === 'failed') return 'lead.message.failed';
  return 'lead.message.queued';
}

export function applyCeoClientActions(actions: CeoClientAction[], store: Store): string[] {
  const notes: string[] = [];
  for (const action of actions) {
    const s = store.getState();
    if (action.name === 'navigate') {
      if (action.project) {
        s.enterProject(action.project);
        notes.push(`Navigated to ${action.project}`);
      }
      if (action.agent) s.enterAgent(action.agent);
      if (action.mode) s.setMode(action.mode);
      continue;
    }
    if (action.name === 'email_draft') {
      notes.push(`Draft saved in ${action.account} · not sent`);
      continue;
    }
    if (action.name === 'open_panel') {
      s.openPanel(action.kind);
      notes.push(`Opened ${action.kind}`);
      continue;
    }
    if (action.name === 'propose_approval') {
      s.requestApproval(action.args);
      notes.push('Approval card opened — record only');
      continue;
    }
    if (action.name === 'create_task') {
      s.trackCeoTask(action.taskId);
      if (action.approval) {
        s.requestApproval({
          id: action.approval.id,
          title: action.approval.title,
          description: action.approval.description,
          kind: action.approval.kind,
          risk: action.approval.risk,
          taskId: action.taskId,
          persisted: !action.demo,
        });
        if (action.agentId) {
          s.applyEvent({
            id: `task_${action.taskId}`,
            ts: Date.now(),
            type: 'agent.status.changed',
            projectSlug: action.projectSlug,
            agentId: action.agentId,
            summary: action.demo
              ? `Task waiting approval · DEMO · ${action.approval.title}`
              : `Task waiting approval · ${action.approval.title}`,
            source: action.demo ? 'demo' : 'live',
            payload: { status: 'needs_approval', taskId: action.taskId },
          });
        }
        notes.push(action.demo ? 'Task waiting approval · DEMO' : 'Task waiting approval');
      } else {
        notes.push(action.demo ? 'Task queued locally · DEMO' : 'Task queued');
      }
      continue;
    }
    if (action.name === 'message_lead') {
      if (action.record) {
        s.queueLeadMessage(action.record);
        if (action.status !== 'unknown') {
          s.applyEvent({
            id: action.record.id,
            ts: action.record.ts,
            type: leadEventType(action.status),
            projectSlug: action.record.projectSlug,
            agentId: action.record.agentId,
            summary:
              action.status === 'delivered'
                ? `Message delivered to ${action.record.leadName}`
                : action.status === 'failed'
                  ? `Lead message failed · ${action.record.leadName}`
                  : `Message queued for ${action.record.leadName}`,
            source: action.demo ? 'demo' : 'live',
            payload: { demo: action.demo ?? false, via: 'ceo' },
          });
        }
      }
      if (action.projectSlug && (action.status === 'delivered' || action.status === 'queued')) {
        if (store.getState().focusedProject !== action.projectSlug) {
          store.getState().enterProject(action.projectSlug);
        }
        store.getState().openPanel('lead');
      }
      if (action.status === 'delivered') {
        notes.push(`Message delivered to ${action.leadName ?? 'lead'}`);
      } else if (action.status === 'queued') {
        notes.push(`Message queued for ${action.leadName ?? 'lead'} · DEMO`);
      } else if (action.status === 'failed') {
        notes.push(action.error ?? 'Lead message failed');
      } else {
        notes.push(action.error ?? 'Unknown lead — nothing sent');
      }
    }
  }
  return notes;
}
