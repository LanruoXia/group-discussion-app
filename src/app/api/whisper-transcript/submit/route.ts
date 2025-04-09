import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mergeTranscript } from "@/lib/transcript/mergeTranscript";
import { evaluateTranscript } from "@/lib/evaluate/evaluateTranscript";

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

  // 1. 插入 transcript
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

  // 2. 检查是否已经合并过
  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .select("transcript_merged")
    .eq("id", session_id)
    .single();

  if (sessionError || !sessionData) {
    console.error("❌ Failed to fetch session:", sessionError);
    return NextResponse.json({ error: "Session not found" }, { status: 500 });
  }

  if (sessionData.transcript_merged) {
    console.log("✅ Transcript already merged, skipping");
    return NextResponse.json({ message: "Already merged" });
  }

  // 3. 获取预期提交数量（不含 AI）
  const { count: expectedCount, error: countError1 } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("session_id", session_id)
    .eq("is_ai", false);

  if (countError1) {
    console.error("❌ Failed to count expected participants:", countError1);
    return NextResponse.json({ error: "Failed to count participants" }, { status: 500 });
  }

  // 4. 当前已提交 transcript 数量
  const { count: submittedCount, error: countError2 } = await supabase
    .from("transcripts")
    .select("*", { count: "exact", head: true })
    .eq("session_id", session_id);

  if (countError2) {
    console.error("❌ Failed to count submitted transcripts:", countError2);
    return NextResponse.json({ error: "Failed to count transcripts" }, { status: 500 });
  }

  // 5. 如果满足触发条件
  if (expectedCount === submittedCount) {
    // 6. 用乐观锁更新 transcript_merged 为 true
    const { error: updateError, data: updatedRows } = await supabase
      .from("sessions")
      .update({ transcript_merged: true })
      .eq("id", session_id)
      .eq("transcript_merged", false)
      .select();

    if (updateError || updatedRows.length === 0) {
      console.log("⏩ Another request already handled merging.");
      return NextResponse.json({ message: "Already merging in another process" });
    }

    // 7. 触发合并接口
    await mergeTranscript(session_id);

    console.log("🧩 Transcript merge triggered for session:", session_id);

    // 异步触发评分，避免阻塞
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/evaluate/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id }),
    }).then(() => console.log("Evaluation triggered"))
        .catch((err) => console.error("Failed to trigger evaluation", err));
    }

  

  return NextResponse.json({ message: "Transcript stored successfully" });
} 