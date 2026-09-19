const DEFAULT_ALLOWED_EMAIL = "awad@apixis.dev";

function readServerEnv(name: string): string {
  // Index access so Next.js does not replace the value at build time.
  const raw = process.env[name];
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function allowedEmail(): string {
  return readServerEnv("ALLOWED_EMAIL") || DEFAULT_ALLOWED_EMAIL;
}

export function isAuthConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey() && allowedEmail());
}

export function anthropicApiKey(): string {
  return readServerEnv("ANTHROPIC_API_KEY");
}

export function anthropicModel(): string {
  const raw = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  return raw.replace(/["\s]/g, "");
}

export const FLEET_BOT_MODEL =
  "xai/grok-4-fast (primary) + nous/hermes (fallback)";
export const CRON_PAUSED = true; // both jobs paused

/** True only when Anthropic is intentionally selected and a non-empty key is present. */
export function isAnthropicCeoEnabled(): boolean {
  return (
    readServerEnv("AI_PROVIDER").toLowerCase() === "anthropic" &&
    anthropicApiKey().length > 0
  );
}

export function supabaseUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    readServerEnv("NEXT_PUBLIC_SUPABASE_URL") ||
    readServerEnv("SUPABASE_URL") ||
    undefined
  );
}

export function supabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    readServerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    readServerEnv("SUPABASE_ANON_KEY") ||
    undefined
  );
}

export const AWAD_COMMAND_SCHEMA = "awad_command";
