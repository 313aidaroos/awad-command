function read(name: string): string {
  const raw = process.env[name];
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function required(name: string, aliases: string[] = []): string {
  const value = read(name) || aliases.map(read).find(Boolean) || '';
  if (!value) {
    throw new Error(`Missing required env ${name}${aliases.length ? ` (or ${aliases.join(', ')})` : ''}`);
  }
  return value;
}

export interface WorkerEnv {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  anthropicApiKey: string;
  workerModel: string;
  workerId: string;
  schema: string;
  pollMs: number;
  leaseMs: number;
  heartbeatMs: number;
  maxSteps: number;
}

export function loadWorkerEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  const prev = process.env;
  process.env = source;
  try {
    return {
      supabaseUrl: required('SUPABASE_URL', ['NEXT_PUBLIC_SUPABASE_URL']),
      supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
      anthropicApiKey: required('ANTHROPIC_API_KEY'),
      workerModel: read('WORKER_MODEL') || 'claude-sonnet-5',
      workerId: read('WORKER_ID') || 'awad-worker-1',
      schema: read('AWAD_COMMAND_SCHEMA') || 'awad_command',
      pollMs: Number(read('WORKER_POLL_MS') || 3000),
      leaseMs: Number(read('WORKER_LEASE_MS') || 600_000),
      heartbeatMs: Number(read('WORKER_HEARTBEAT_MS') || 30_000),
      maxSteps: Number(read('WORKER_MAX_STEPS') || 25),
    };
  } finally {
    process.env = prev;
  }
}
