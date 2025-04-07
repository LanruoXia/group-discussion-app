import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TRANSCRIPTS_DIR = path.join(process.cwd(), "public", "transcripts");

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const filePath = path.join(TRANSCRIPTS_DIR, `${sessionId}.txt`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { message: "Transcript not found" },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(filePath, "utf-8");

    return NextResponse.json({
      session_id: sessionId,
      content,
      updated_at: fs.statSync(filePath).mtime.toISOString(),
    });
  } catch (error) {
    console.error("Error reading transcript:", error);
    return NextResponse.json(
      { error: "Failed to read transcript", details: error },
      { status: 500 }
    );
  }
}