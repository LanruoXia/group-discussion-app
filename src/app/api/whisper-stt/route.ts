// src/app/api/whisper-stt/route.ts
import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("audio") as Blob | null;
  const speaker = formData.get("speaker") as string | null;

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing or invalid audio file" },
      { status: 400 }
    );
  }

  try {
    const audioBuffer = Buffer.from(await file.arrayBuffer());

    // Construct a new form for Whisper
    const whisperForm = new FormData();
    whisperForm.append("file", new Blob([audioBuffer], { type: file.type }), "audio.webm");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("response_format", "verbose_json"); // this gives timestamps
    whisperForm.append("language", "en");

    const whisperRes = await fetch(OPENAI_WHISPER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: whisperForm,
    });

    const result = await whisperRes.json();

    if (!result.segments) {
      console.error("Whisper response missing segments:", result);
      return NextResponse.json({ error: "No segments in response" }, { status: 500 });
    }

    // Add speaker info to each segment
    const transcript = result.segments.map((seg: any) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text,
      speaker: speaker || "Unknown",
    }));

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("❌ Whisper STT error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}