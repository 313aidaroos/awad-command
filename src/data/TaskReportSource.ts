import { createBrowserSupabase } from '@/lib/supabase/client';
import { useCommandStore } from '@/store/useCommandStore';

interface TaskReportRow {
  id?: string;
  status?: string;
  report?: string | null;
  error?: string | null;
  source?: string | null;
}

export function reportTextFromTask(row: TaskReportRow): string | null {
  if (row.status !== 'done' && row.status !== 'failed') return null;
  const body = (row.report ?? '').trim() || (row.error ?? '').trim() || 'Task finished with no report.';
  return body.startsWith('Report:') ? body : `Report: ${body}`;
}

export function shouldPublishReport(row: TaskReportRow, trackedIds: string[]): boolean {
  if (!row.id) return false;
  if (row.source === 'ceo') return true;
  return trackedIds.includes(row.id);
}

export function startTaskReportSubscription(): () => void {
  const client = createBrowserSupabase();
  if (!client) return () => undefined;

  const channel = client
    .channel('ceo-task-reports')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'awad_command', table: 'agent_tasks' },
      (payload) => {
        const row = (payload.new ?? {}) as TaskReportRow;
        const tracked = useCommandStore.getState().trackedTaskIds;
        if (!shouldPublishReport(row, tracked)) return;
        const text = reportTextFromTask(row);
        if (!text || !row.id) return;
        useCommandStore.getState().pushCeoReport(row.id, text);
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
