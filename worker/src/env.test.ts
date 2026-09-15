import { describe, expect, it } from 'vitest';
import { loadWorkerEnv } from './env.js';

describe('loadWorkerEnv', () => {
  it('reads required keys and aliases SUPABASE_URL', () => {
    const env = loadWorkerEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'svc',
      ANTHROPIC_API_KEY: 'sk',
    } as NodeJS.ProcessEnv);
    expect(env.supabaseUrl).toBe('https://example.supabase.co');
    expect(env.workerModel).toBe('claude-sonnet-5');
    expect(env.workerId).toBe('awad-worker-1');
    expect(env.schema).toBe('awad_command');
  });

  it('throws when the service role is missing', () => {
    expect(() =>
      loadWorkerEnv({
        SUPABASE_URL: 'https://example.supabase.co',
        ANTHROPIC_API_KEY: 'sk',
      } as NodeJS.ProcessEnv),
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
