import { describe, expect, it } from 'vitest';
import { parseQueryView, runSupabaseQuery } from './supabaseQuery.js';

describe('supabase.query whitelist', () => {
  it('accepts a view name', () => {
    expect(parseQueryView({ view: 'v_leads' })).toBe('v_leads');
  });

  it('parses a SELECT against a whitelist view', () => {
    expect(parseQueryView({ sql: 'select * from v_sales where project_slug = $1' })).toBe('v_sales');
    expect(parseQueryView({ sql: 'SELECT id FROM awad_command.v_events' })).toBe('v_events');
  });

  it('rejects writes, comments, and unknown tables', () => {
    expect(() => parseQueryView({ sql: 'delete from v_leads' })).toThrow(/SELECT/i);
    expect(() => parseQueryView({ sql: 'select * from v_leads; drop table leads' })).toThrow(/multiple/i);
    expect(() => parseQueryView({ sql: 'select * from agents' })).toThrow(/FROM must be/i);
    expect(() => parseQueryView({ sql: 'select * from v_leads -- x' })).toThrow(/comments/i);
  });

  it('queries through the db helper', async () => {
    const rows = [{ id: '1' }];
    const result = await runSupabaseQuery(
      { view: 'v_metrics', projectSlug: 'contraxis', limit: 5 },
      {
        queryView: async (view, opts) => {
          expect(view).toBe('v_metrics');
          expect(opts?.projectSlug).toBe('contraxis');
          expect(opts?.limit).toBe(5);
          return rows;
        },
      },
    );
    expect(result).toEqual({ view: 'v_metrics', rows });
  });
});
