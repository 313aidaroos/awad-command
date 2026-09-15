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
    expect(env.workerCapabilities).toBe('');
    expect(env.dataDir).toBe('/data');
  });

  it('reads WORKER_CAPABILITIES and WORKER_DATA_DIR', () => {
    const env = loadWorkerEnv({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'svc',
      ANTHROPIC_API_KEY: 'sk',
      WORKER_CAPABILITIES: 'computer',
      WORKER_DATA_DIR: '/tmp/awad-data',
    } as NodeJS.ProcessEnv);
    expect(env.workerCapabilities).toBe('computer');
    expect(env.dataDir).toBe('/tmp/awad-data');
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
