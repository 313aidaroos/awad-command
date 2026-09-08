export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.ALLOWED_EMAIL,
  );
}

export function isAnthropicCeoEnabled(): boolean {
  return (
    process.env.AI_PROVIDER === 'anthropic' && Boolean(process.env.ANTHROPIC_API_KEY)
  );
}

export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export const AWAD_COMMAND_SCHEMA = 'awad_command';
