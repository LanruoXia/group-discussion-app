import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { code, username, user_id } = await req.json();

    if (!code || !username || !user_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 获取 session（使用 session_code）
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_code", code)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session_id = session.session_id;

    // 获取已加入的参与者
    const { data: participants, error: participantError } = await supabase
      .from("session_participants")
      .select("*")
      .eq("session_id", session_id);

    if (participantError) {
      throw participantError;
    }

    // 检查是否已加入
    const alreadyJoined = participants?.some(p => p.user_id === user_id);
    if (alreadyJoined) {
      return NextResponse.json({ message: "Already joined" }, { status: 200 });
    }

    // 检查人数上限（4人）
    if (participants && participants.length >= 4) {
      return NextResponse.json({ error: "Session is full" }, { status: 400 });
    }

    // 插入新参与者
    const { error: insertError } = await supabase.from("session_participants").insert({
      session_id,
      username,
      user_id,
      is_ai: false,
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error joining session:", err.message);
    return NextResponse.json({ error: "Join session failed" }, { status: 500 });
  }
}