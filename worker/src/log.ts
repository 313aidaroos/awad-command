export function log(event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...fields,
  });
  process.stdout.write(`${line}\n`);
}

export function logError(event: string, err: unknown, fields: Record<string, unknown> = {}): void {
  const error = err instanceof Error ? err.message : String(err);
  log(event, { ...fields, error });
}
