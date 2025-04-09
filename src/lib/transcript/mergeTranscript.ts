// src/lib/transcript/mergeTranscript.ts

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function mergeTranscript(session_id: string) {
  // 1. 获取所有 transcript 数据
  const { data: transcripts, error } = await supabase
    .from("transcripts")
    .select("user_id, transcript, start_at")
    .eq("session_id", session_id);

  if (error || !transcripts) {
    console.error("❌ Failed to fetch transcripts:", error);
    return;
  }


  // 3. 合并所有语句（按每段的实际时间）
  type Segment = {
    speaker: string;
    start: number;
    end: number;
    text: string;
  };

  const allSegments: { absoluteTime: number; text: string }[] = [];

  for (const t of transcripts) {
    const segments: Segment[] = t.transcript || [];
    const startTime = new Date(t.start_at).getTime();

    for (const seg of segments) {
      allSegments.push({
        absoluteTime: startTime + seg.start * 1000,
        text: `${seg.speaker}: ${seg.text}`,
      });
    }
  }

  // 4. 按照 absoluteTime 排序，拼接为完整 transcript 文本
  allSegments.sort((a, b) => a.absoluteTime - b.absoluteTime);
  const mergedTranscript = allSegments.map((s) => s.text).join("\n");

  // 5. 写入 merged_transcripts 表
  const { error: saveError } = await supabase
    .from("merged_transcripts")
    .insert({
      session_id,
      merged_transcript: mergedTranscript,
    });

  if (saveError) {
    console.error("❌ Failed to save merged transcript:", saveError);
  } else {
    console.log("✅ Merged transcript saved to merged_transcripts");
  }
}
