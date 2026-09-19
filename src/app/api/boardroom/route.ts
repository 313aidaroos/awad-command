import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  resolveBoardroomParticipants,
  type BoardroomScope,
} from "@/boardroom/roster";
import { anthropicApiKey, anthropicModel } from "@/lib/env";
import { isLeadOwner } from "@/lib/leadOwner";
import { createServiceSupabase } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };

const scopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }),
  z.object({ kind: z.literal("business"), value: z.string().min(1).max(100) }),
  z.object({ kind: z.literal("role"), value: z.string().min(1).max(100) }),
]);
const postSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  requestId: z.string().uuid(),
  scope: scopeSchema,
});

type CouncilResponse = {
  summary: string;
  councils: Array<{
    name: string;
    response: string;
    represented: number;
  }>;
  decisions: string[];
  questions: string[];
};

function parseCouncilResponse(
  text: string,
  fallbackCount: number,
): CouncilResponse {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const value = JSON.parse(
      text.slice(start, end + 1),
    ) as Partial<CouncilResponse>;
    if (typeof value.summary !== "string") throw new Error("Missing summary");
    return {
      summary: value.summary,
      councils: Array.isArray(value.councils)
        ? value.councils.slice(0, 30)
        : [],
      decisions: Array.isArray(value.decisions)
        ? value.decisions.slice(0, 8)
        : [],
      questions: Array.isArray(value.questions)
        ? value.questions.slice(0, 8)
        : [],
    };
  } catch {
    return {
      summary: text.trim(),
      councils: [
        { name: "Council", response: text.trim(), represented: fallbackCount },
      ],
      decisions: [],
      questions: [],
    };
  }
}

export async function GET() {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Sign in as owner to enter the Boardroom." },
      { status: 401, headers },
    );
  const db = createServiceSupabase();
  if (!db)
    return NextResponse.json(
      { error: "Boardroom history is not connected." },
      { status: 503, headers },
    );
  const result = await db
    .from("boardroom_turns")
    .select("id,message,scope,participant_count,response,status,created_at")
    .order("created_at", { ascending: false })
    .limit(12);
  if (result.error)
    return NextResponse.json(
      { error: "Could not load the Boardroom history." },
      { status: 503, headers },
    );
  return NextResponse.json(
    { turns: (result.data ?? []).reverse() },
    { headers },
  );
}

export async function POST(request: Request) {
  if (!(await isLeadOwner()))
    return NextResponse.json(
      { error: "Sign in as owner to address the Boardroom." },
      { status: 401, headers },
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Invalid origin." },
      { status: 403, headers },
    );
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Choose who to address and enter a message." },
      { status: 400, headers },
    );

  const { message, requestId, scope } = parsed.data;
  const participants = resolveBoardroomParticipants(scope as BoardroomScope);
  if (!participants.length)
    return NextResponse.json(
      { error: "No agents match that Boardroom invitation." },
      { status: 400, headers },
    );
  const db = createServiceSupabase();
  const key = anthropicApiKey();
  if (!db || !key)
    return NextResponse.json(
      { error: "The Boardroom needs its database and AI provider connected." },
      { status: 503, headers },
    );

  const previous = await db
    .from("boardroom_turns")
    .select("message,scope,response,status")
    .eq("id", requestId)
    .maybeSingle();
  if (previous.error)
    return NextResponse.json(
      { error: "Boardroom storage is unavailable." },
      { status: 503, headers },
    );
  if (previous.data) {
    if (
      previous.data.message !== message ||
      JSON.stringify(previous.data.scope) !== JSON.stringify(scope)
    )
      return NextResponse.json(
        { error: "Message identifier conflict." },
        { status: 409, headers },
      );
    if (previous.data.status === "replied")
      return NextResponse.json(
        { response: previous.data.response },
        { headers },
      );
    return NextResponse.json(
      {
        error:
          "That address is already being considered. Refresh for its reply.",
      },
      { status: 409, headers },
    );
  }

  const insert = await db.from("boardroom_turns").insert({
    id: requestId,
    message,
    scope,
    participant_ids: participants.map((agent) => agent.id),
    participant_count: participants.length,
    status: "thinking",
  });
  if (insert.error)
    return NextResponse.json(
      { error: "Could not open this Boardroom address." },
      { status: 503, headers },
    );

  try {
    const grouped = participants.reduce<Record<string, typeof participants>>(
      (acc, agent) => {
        (acc[agent.projectName] ??= []).push(agent);
        return acc;
      },
      {},
    );
    const roster = Object.entries(grouped)
      .map(
        ([business, agents]) =>
          `${business}: ${agents.map((agent) => `${agent.name} (${agent.role})`).join(", ")}`,
      )
      .join("\n");
    const client = new Anthropic({
      apiKey: key,
      maxRetries: 0,
      timeout: 40000,
    });
    const answer = await client.messages.create({
      model: anthropicModel(),
      max_tokens: 2600,
      system: `You are Cixy facilitating Awad's private AWAD COMMAND boardroom. The invited roster is below. Every named profile must be represented in the discussion, but this is one AI-facilitated council synthesis, not proof that separate autonomous workers ran. For an all-company meeting, give one concise council response per business and set represented to that business's invited count. For one-business or role meetings, give concise responses grouped in the clearest way while covering every invited profile. Surface useful disagreement instead of forced consensus. Do not claim to have sent messages, spent money, launched ads, changed code, or used external tools.\n\nINVITED ROSTER\n${roster}\n\nReturn only valid JSON with this shape: {"summary":"Cixy's executive synthesis","councils":[{"name":"business or group","response":"concise viewpoint","represented":12}],"decisions":["recommended decision"],"questions":["question needing Awad"]}.`,
      messages: [{ role: "user", content: message }],
    });
    const text = answer.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    const response = parseCouncilResponse(text, participants.length);
    const save = await db
      .from("boardroom_turns")
      .update({ response, status: "replied" })
      .eq("id", requestId);
    if (save.error) throw new Error("Reply storage failed");
    return NextResponse.json({ response }, { headers });
  } catch {
    await db
      .from("boardroom_turns")
      .update({ status: "failed" })
      .eq("id", requestId);
    return NextResponse.json(
      {
        error:
          "The meeting was saved, but the council could not return a briefing. Refresh and try again.",
      },
      { status: 502, headers },
    );
  }
}
