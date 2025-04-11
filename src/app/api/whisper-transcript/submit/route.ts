// src/app/api/whisper-transcript/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { session_id, user_id, transcript, startAt } = await req.json();
  console.log("📝 Received transcript:", { session_id, user_id, startAt });

  if (!session_id || !user_id || !transcript || !startAt) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("transcripts").insert({
    session_id,
    user_id,
    transcript,
    start_at: startAt,
  });

  if (insertError) {
    console.error("❌ Failed to store transcript:", insertError);
    return NextResponse.json({ error: "Failed to store transcript" }, { status: 500 });
  }

  console.log("✅ Transcript stored. Webhook will handle merge & evaluation.");
  return NextResponse.json({ message: "Transcript stored successfully" });
}