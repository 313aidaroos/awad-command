/**
 * Anthropic Messages tool names must match `^[a-zA-Z0-9_-]+$`.
 * Registry / events / logs keep dotted names (`computer.screenshot`).
 * Map only at the Anthropic API boundary.
 */
export const ANTHROPIC_TOOL_NAME = /^[a-zA-Z0-9_-]+$/;

export function toAnthropicToolName(registryName: string): string {
  const name = registryName.replaceAll('.', '_');
  if (!ANTHROPIC_TOOL_NAME.test(name)) {
    throw new Error(
      `Anthropic tool name ${JSON.stringify(name)} is not legal (must match ^[a-zA-Z0-9_-]+$)`,
    );
  }
  return name;
}

export function fromAnthropicToolName(
  anthropicName: string,
  registryNames: readonly string[] = [],
): string {
  if (registryNames.includes(anthropicName)) return anthropicName;
  const reverse = new Map(registryNames.map((name) => [toAnthropicToolName(name), name]));
  return reverse.get(anthropicName) ?? anthropicName.replaceAll('_', '.');
}
