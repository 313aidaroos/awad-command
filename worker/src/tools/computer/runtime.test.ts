import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFakeRuntime, createSessionPool, type ComputerSession } from './runtime.js';

describe('createSessionPool', () => {
  it('returns the same session for a project until closeAll', async () => {
    let created = 0;
    const pool = createSessionPool(async () => {
      created += 1;
      const session: ComputerSession = {
        async page() {
          return { goto: async () => undefined, screenshot: async () => Buffer.alloc(0), url: () => 'about:blank' };
        },
        async close() {
          return;
        },
      };
      return session;
    });

    const a = await pool.open('contraxis');
    const b = await pool.open('contraxis');
    const c = await pool.open('lyrixis');
    expect(a).toBe(b);
    expect(c).not.toBe(a);
    expect(created).toBe(2);

    await pool.closeAll();
    const d = await pool.open('contraxis');
    expect(d).not.toBe(a);
    expect(created).toBe(3);
  });
});

describe('createFakeRuntime session', () => {
  it('keeps navigation on the cached page', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'awad-pool-'));
    const runtime = createFakeRuntime(dir);
    const first = await runtime.open('contraxis');
    const page = await first.page();
    await page.goto('https://example.com/');
    const again = await (await runtime.open('contraxis')).page();
    expect(again.url()).toBe('https://example.com/');
    expect(runtime.stats.opens).toBe(1);
  });
});
