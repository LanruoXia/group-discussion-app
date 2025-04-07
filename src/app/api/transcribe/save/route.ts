// src/app/api/transcription/save/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const TRANSCRIPTS_DIR = path.join(process.cwd(), "public", "transcripts");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 注意需要用 Server 端 Key
);

// 确保目录存在
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

export async function POST(req: Request) {
  try {
    const { content, session_id } = await req.json();

    if (!content || !session_id) {
      return NextResponse.json({ error: "Missing content or session_id" }, { status: 400 });
    }

    // 保存至 public/transcripts/session_id.txt
    const filePath = path.join(TRANSCRIPTS_DIR, `${session_id}.txt`);
    fs.writeFileSync(filePath, content, "utf-8");

    // 保存至 Supabase
    const { error } = await supabase
      .from("transcripts")
      .insert([{ session_id, content }]);

    if (error) {
      console.error("Failed to save to Supabase:", error);
      return NextResponse.json({ error: "Failed to save to DB" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving transcript:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}