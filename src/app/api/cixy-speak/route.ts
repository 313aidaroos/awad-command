import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  const voice = process.env.CIXY_VOICE_ID?.trim();
  if (!key || !voice) {
    return NextResponse.json(
      { error: "Cixy voice not configured", fallback: true },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => null)) as {
    text?: string;
  } | null;
  const text = body?.text?.replace(/\s+/g, " ").trim().slice(0, 900);
  if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.8,
          style: 0.28,
          use_speaker_boost: true,
        },
      }),
    },
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: "ElevenLabs refused", fallback: true },
      { status: 502 },
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
