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

    // console.log("Session fetched:", session);

    // 将 created_at 转为 UTC 毫秒数
    const createdAt = new Date(session.created_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - createdAt) / 1000);
    const remaining = Math.max(300 - elapsed, 0);

    // 输出调试日志
    // console.log("Created at (UTC):", new Date(createdAt).toISOString());
    // console.log("Current time (UTC):", new Date(now).toISOString());
    // console.log("Elapsed seconds:", elapsed);
    // console.log("Remaining seconds:", remaining);

    // 查询参与者列表
    const { data: participants, error: partError } = await supabase
      .from("session_participants")
      .select("username, is_ai, user_id, joined_at")
      .eq("session_id", session.session_id);

    if (partError) {
      console.error("Error fetching participants:", partError.message);
    } else {
      console.log("Participants fetched:", participants);
    }

    return NextResponse.json({
      session_id: session.session_id,
      test_topic: session.test_topic,
      created_at: session.created_at,
      status: session.status, // 假设 status 字段为 "waiting", "active", "expired"
      remaining,
      participants,
    });
  } catch (err: any) {
    console.error("Error fetching session status:", err.message);
    return NextResponse.json({ error: "Session status fetch failed" }, { status: 500 });
  }
}