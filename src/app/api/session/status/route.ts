// src/app/api/session/status/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session_code = searchParams.get("code");

  if (!session_code) {
    console.warn("Missing session code in request");
    return NextResponse.json({ error: "Missing session code" }, { status: 400 });
  }

  try {
    // 查询 sessions 表，使用 session_code 作为查询条件
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_code", session_code)
      .single();

    if (sessionError || !session) {
      console.error("Session not found:", sessionError);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 计算剩余时间
    const waitingStartedAt = new Date(session.waiting_started_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - waitingStartedAt) / 1000);
    const remaining = Math.max(300 - elapsed, 0);

    // 检查会话状态
    let status = session.status;
    if (status === "waiting" && remaining <= 0) {
      status = "expired";
      // 更新会话状态
      await supabase
        .from("sessions")
        .update({ status: "expired" })
        .eq("session_id", session.session_id);
    }

    // 查询参与者列表
    const { data: participants, error: partError } = await supabase
      .from("session_participants")
      .select("username, is_ai, user_id, joined_at")
      .eq("session_id", session.session_id)
      .order("joined_at", { ascending: true });

    if (partError) {
      console.error("Error fetching participants:", partError.message);
      return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
    }

    return NextResponse.json({
      session_id: session.session_id,
      status,
      test_topic: session.test_topic,
      instructions: session.instructions,
      ai_count: session.ai_count,
      created_at: session.created_at,
      waiting_started_at: session.waiting_started_at,
      remaining,
      participants,
    });
  } catch (err: unknown) {
    console.error("Error fetching session status:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Session status fetch failed" }, { status: 500 });
  }
}