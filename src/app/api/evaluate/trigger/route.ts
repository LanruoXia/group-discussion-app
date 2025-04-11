// src/app/api/evaluate/trigger/route.ts
import { NextRequest, NextResponse } from "next/server";
import { evaluateTranscript } from "@/lib/evaluate/evaluateTranscript";

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    console.log("📬 [TRIGGER] Evaluation API HIT with session_id:", session_id);

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    console.log("🚀 Triggering evaluation for session:", session_id);

    await evaluateTranscript(session_id);

    return NextResponse.json({ message: "Evaluation complete ✅" });
  } catch (error) {
    console.error("❌ Evaluation trigger error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}