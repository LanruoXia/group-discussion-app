// src/app/api/webhook/evaluate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { evaluateTranscript } from "@/lib/evaluate/evaluateTranscript";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const session_id = payload.record.session_id;

  if (!session_id) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  console.log("📊 Triggering evaluation for session:", session_id);

  try {
    await evaluateTranscript(session_id);
    return NextResponse.json({ message: "Evaluation complete ✅" });
  } catch (error) {
    console.error("❌ Evaluation failed:", error);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}