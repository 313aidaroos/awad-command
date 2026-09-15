'use server';

import { persistComputerHalt } from '@/lib/computerControl';

export async function haltComputerAction(workerId = '*'): Promise<{ ok: boolean; demo: boolean; error?: string }> {
  return persistComputerHalt(workerId);
}
