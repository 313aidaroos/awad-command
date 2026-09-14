function readServerEnv(name: 'AI_PROVIDER' | 'ANTHROPIC_API_KEY' | 'ANTHROPIC_MODEL'): string {
  // Index access so Next.js does not replace the value at build time.
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

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.ALLOWED_EMAIL,
  );
}

export function anthropicApiKey(): string {
  return readServerEnv('ANTHROPIC_API_KEY');
}

export function anthropicModel(): string {
  return readServerEnv('ANTHROPIC_MODEL') || 'claude-sonnet-4-20250514';
}

/** True only when Anthropic is intentionally selected and a non-empty key is present. */
export function isAnthropicCeoEnabled(): boolean {
  return readServerEnv('AI_PROVIDER').toLowerCase() === 'anthropic' && anthropicApiKey().length > 0;
}

export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export const AWAD_COMMAND_SCHEMA = 'awad_command';
