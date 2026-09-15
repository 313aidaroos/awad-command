import { describe, expect, it } from 'vitest';
import { persistComputerHalt } from '@/lib/computerControl';

describe('computer halt', () => {
  it('records a local DEMO halt when the service client is missing', async () => {
    const result = await persistComputerHalt('*');
    expect(result.ok).toBe(true);
    expect(result.demo).toBe(true);
  });
});
