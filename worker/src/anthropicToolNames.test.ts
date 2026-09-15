import { describe, expect, it } from 'vitest';
import { ANTHROPIC_TOOL_NAME, fromAnthropicToolName, toAnthropicToolName } from './anthropicToolNames.js';

const ROUND_TRIP = ['computer.screenshot', 'supabase.query', 'http.fetch', 'computer.navigate'] as const;

describe('anthropic tool name map', () => {
  it.each(ROUND_TRIP)('round-trips %s at the Anthropic boundary', (registryName) => {
    const wired = toAnthropicToolName(registryName);
    expect(wired).toMatch(ANTHROPIC_TOOL_NAME);
    expect(wired).not.toContain('.');
    expect(fromAnthropicToolName(wired)).toBe(registryName);
    expect(fromAnthropicToolName(wired, ROUND_TRIP)).toBe(registryName);
  });

  it('maps the known computer and API tools to legal Anthropic names', () => {
    expect(toAnthropicToolName('computer.screenshot')).toBe('computer_screenshot');
    expect(toAnthropicToolName('supabase.query')).toBe('supabase_query');
    expect(toAnthropicToolName('http.fetch')).toBe('http_fetch');
    expect(toAnthropicToolName('computer.navigate')).toBe('computer_navigate');
  });

  it('prefers the registry name when unmapping so dotted names stay the source of truth', () => {
    const registry = ['computer.screenshot', 'supabase.query'];
    expect(fromAnthropicToolName('computer_screenshot', registry)).toBe('computer.screenshot');
    expect(fromAnthropicToolName('computer.screenshot', registry)).toBe('computer.screenshot');
  });
});
