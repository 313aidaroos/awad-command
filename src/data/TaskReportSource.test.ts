import { describe, expect, it } from 'vitest';
import { reportTextFromTask, shouldPublishReport } from '@/data/TaskReportSource';

describe('task report subscription helpers', () => {
  it('prefixes reports and ignores in-flight tasks', () => {
    expect(reportTextFromTask({ status: 'running', report: 'working' })).toBeNull();
    expect(reportTextFromTask({ status: 'done', report: 'Landing is live.' })).toBe('Report: Landing is live.');
    expect(reportTextFromTask({ status: 'failed', error: 'budget' })).toBe('Report: budget');
    expect(reportTextFromTask({ status: 'done', report: 'Report: already prefixed' })).toBe(
      'Report: already prefixed',
    );
  });

  it('publishes CEO-sourced or locally tracked tasks only', () => {
    expect(shouldPublishReport({ id: 't1', source: 'ceo' }, [])).toBe(true);
    expect(shouldPublishReport({ id: 't2', source: 'human' }, [])).toBe(false);
    expect(shouldPublishReport({ id: 't2', source: 'human' }, ['t2'])).toBe(true);
    expect(shouldPublishReport({ source: 'ceo' }, [])).toBe(false);
  });
});
