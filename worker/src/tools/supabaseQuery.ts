import { z } from 'zod';
import { QUERY_VIEWS, type QueryView } from '../types.js';
import type { WorkerDb } from '../db.js';

export const supabaseQueryInput = z.object({
  view: z.enum(QUERY_VIEWS).optional(),
  sql: z.string().optional(),
  projectSlug: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const VIEW_FROM = new RegExp(`\\bfrom\\s+(?:awad_command\\.)?(${QUERY_VIEWS.join('|')})\\b`, 'i');

export function parseQueryView(input: z.infer<typeof supabaseQueryInput>): QueryView {
  if (input.view) return input.view;
  const sql = (input.sql ?? '').trim();
  if (!sql) throw new Error('Provide view or a SELECT against a whitelist view');
  if (/--|\/\*|\$\$|;/.test(sql.replace(/;\s*$/, ''))) {
    throw new Error('SQL comments, multiple statements, and dollar quotes are not allowed');
  }
  if (!/^\s*select\b/i.test(sql)) throw new Error('Only SELECT is allowed');
  if (/\b(insert|update|delete|drop|alter|create|copy|grant|revoke|truncate|call|do)\b/i.test(sql)) {
    throw new Error('Write or DDL keywords are not allowed');
  }
  const match = sql.match(VIEW_FROM);
  if (!match?.[1]) throw new Error(`FROM must be one of ${QUERY_VIEWS.join(', ')}`);
  return match[1].toLowerCase() as QueryView;
}

export async function runSupabaseQuery(
  input: z.infer<typeof supabaseQueryInput>,
  db: Pick<WorkerDb, 'queryView'>,
): Promise<{ view: QueryView; rows: unknown[] }> {
  const parsed = supabaseQueryInput.parse(input);
  const view = parseQueryView(parsed);
  const rows = await db.queryView(view, {
    projectSlug: parsed.projectSlug,
    limit: parsed.limit,
  });
  return { view, rows };
}
