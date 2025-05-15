// /src/app/api/session/mark-ready/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { session_id, user_id } = await req.json();

    if (!session_id || !user_id) {
      return NextResponse.json({ error: "Missing session_id or user_id" }, { status: 400 });
    }

    // 1. Mark this participant as ready
    const { error: updateError } = await supabase
      .from("participants")
      .update({ ready: true })
      .eq("session_id", session_id)
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Failed to update participant ready:", updateError);
      return NextResponse.json({ error: "Failed to update ready" }, { status: 500 });
    }

    return NextResponse.json({ message: "Participant marked as ready" });
  } catch (error) {
    console.error("Internal error in mark-ready:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}