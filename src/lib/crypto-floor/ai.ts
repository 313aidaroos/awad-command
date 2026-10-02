import Anthropic from "@anthropic-ai/sdk";
import { anthropicApiKey, anthropicModel } from "@/lib/env";

/** Anthropic client for the floor's agents, or null when no key is configured. Server only. */
export function floorAnthropic(timeoutMs = 45_000): Anthropic | null {
  const key = anthropicApiKey();
  if (!key) return null;
  return new Anthropic({ apiKey: key, maxRetries: 1, timeout: timeoutMs });
}

export function floorModel(): string {
  return anthropicModel();
}

export function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * Short floor-manager note for the daily email. Explains the computed numbers; never invents any.
 * Returns null on any failure (the email still goes out without it).
 */
export async function floorManagerNote(facts: unknown): Promise<string | null> {
  const client = floorAnthropic(40_000);
  if (!client) return null;
  try {
    const res = await client.messages.create({
      model: floorModel(),
      max_tokens: 1500,
      system:
        "You are the floor manager of THE CRYPTO FLOOR, a paper-money crypto trading floor with five desks (SAMURAI momentum, NEON buy-the-dip, ORBIT swing, PHANTOM volume breakout, and RONIN, the higher-risk team that invents its own strategies) inside Awad's AWAD COMMAND. The teams meet, keep journals and adopt changes when the code's evidence gate passes. " +
        "Write Awad's daily note: 4–6 plain sentences, no headings, no bullet points. Cover what happened, why, what the teams learned or changed, what deserves attention, and what to watch next. " +
        "Use only the numbers in the JSON you are given; if something is missing, say it is not measured. Never suggest real-money trading. Never claim to have changed settings — the robot's code does that.",
      messages: [{ role: "user", content: `Today's computed floor data (JSON):\n${JSON.stringify(facts).slice(0, 60_000)}` }],
    });
    if (res.stop_reason === "refusal") return null;
    const text = textOf(res.content);
    return text ? text.slice(0, 2000) : null;
  } catch (err) {
    console.error("floorManagerNote failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
