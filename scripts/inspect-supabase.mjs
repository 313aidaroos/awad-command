// Local-only inspection of the shared awad_command schema. Prints counts, never keys.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  const out = {};
  for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const env = loadEnv(process.argv[2]);
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key === '[SENSITIVE]') {
  console.log('no usable key in', process.argv[2]);
  process.exit(1);
}
console.log('project host:', new URL(url).host);
const client = createClient(url, key, { db: { schema: 'awad_command' }, auth: { persistSession: false } });

const tables = [
  'projects', 'agents', 'agent_tasks', 'events', 'metrics_daily', 'leads', 'sales', 'customers',
  'transactions', 'expenses', 'messages', 'lead_messages', 'deployments', 'approvals', 'system_status', 'agent_screens',
];
for (const t of tables) {
  const { count, error } = await client.from(t).select('*', { count: 'exact', head: true });
  console.log(t.padEnd(16), error ? `ERR ${error.code ?? ''} ${error.message}` : `rows=${count}`);
}
const { data: ev } = await client.from('events').select('ts,type,project_slug,summary,source').order('ts', { ascending: false }).limit(8);
console.log('recent events:', JSON.stringify(ev ?? [], null, 0));
const { data: pj } = await client.from('projects').select('slug,name,status');
console.log('projects:', JSON.stringify(pj ?? []));
const { data: ss } = await client.from('system_status').select('project_slug,status,updated_at');
console.log('system_status:', JSON.stringify(ss ?? []));

// Public schema peek: what other companies write here (names only).
const pub = createClient(url, key, { auth: { persistSession: false } });
const { data: tl, error: tlErr } = await pub.rpc('pg_tables_list').select();
console.log('pg_tables_list rpc:', tlErr ? tlErr.message : JSON.stringify(tl).slice(0, 400));
