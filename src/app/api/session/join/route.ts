import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { code, username, user_id } = await req.json();

    // 判断 session 是否存在
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_id", code)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 获取当前人数
    const { data: participants } = await supabase
      .from("session_participants")
      .select("*")
      .eq("session_id", code);

    if (participants && participants.length >= 4) {
      return NextResponse.json({ error: "Session is full" }, { status: 400 });
    }

    // 已加入检查
    if (participants?.some(p => p.user_id === user_id)) {
      return NextResponse.json({ message: "Already joined" }, { status: 200 });
    }

    const { error } = await supabase.from("session_participants").insert({
      session_id: code,
      username,
      user_id,
      is_ai: false,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error joining session:", err.message);
    return NextResponse.json({ error: "Join session failed" }, { status: 500 });
  }
}