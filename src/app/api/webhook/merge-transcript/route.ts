// /api/webhook/merge-transcript/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mergeTranscript } from "@/lib/transcript/mergeTranscript";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const session_id = payload.record.session_id;

  if (!session_id) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  console.log("📥 Webhook received for session:", session_id);

  // 1. 获取预期提交数量（不含 AI）
  const { count: expectedCount, error: countError1 } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("session_id", session_id)
    .eq("is_ai", false);

  if (countError1) {
    console.error("❌ Failed to count expected participants:", countError1);
    return NextResponse.json({ error: "Failed to count participants" }, { status: 500 });
  }

  // 2. 当前已提交 transcript 数量
  const { count: submittedCount, error: countError2 } = await supabase
    .from("transcripts")
    .select("*", { count: "exact", head: true })
    .eq("session_id", session_id);

  if (countError2) {
    console.error("❌ Failed to count submitted transcripts:", countError2);
    return NextResponse.json({ error: "Failed to count transcripts" }, { status: 500 });
  }

  // 3. 如果满足触发条件，尝试 merge
  if (expectedCount === submittedCount) {
    const { error: updateError, data: updatedRows } = await supabase
      .from("sessions")
      .update({ transcript_merged: true })
      .eq("id", session_id)
      .eq("transcript_merged", false)
      .select();

    if (updateError || updatedRows.length === 0) {
      console.log("⏩ Another process already handled merge.");
      return NextResponse.json({ message: "Already merged" });
    }

    await mergeTranscript(session_id);
    console.log("🧩 Transcript merged for session:", session_id);
  }

  return NextResponse.json({ message: "Checked merge condition" });
}
