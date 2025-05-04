// /api/cloud/migrate
// migrate all the data from agora supported cloud to supabase

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const s3 = new S3Client({
  region: "ap-northeast-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  const { session_code } = await req.json();
  if (!session_code) return NextResponse.json({ error: "Missing session_code" }, { status: 400 });

  const bucket = "lanruo-archive-files";
  const prefix = `compositeRecordings/${session_code}/`;

  try {
    const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));

    if (!list.Contents?.length) {
      return NextResponse.json({ error: "No files found" }, { status: 404 });
    }

    for (const file of list.Contents) {
      const fileKey = file.Key!;
      const fileName = fileKey.split("/").pop()!;

      const getObj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: fileKey }));

      const bodyStream = getObj.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of bodyStream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      // 上传到 Supabase 的 recordings bucket 下
      const { data, error } = await supabase.storage
        .from("recordings")
        .upload(`${session_code}/${fileName}`, buffer, {
          contentType: getObj.ContentType || "application/octet-stream",
          upsert: true,
        });

      if (error) {
        console.error("❌ Failed to upload to Supabase:", fileName, error.message);
      } else {
        console.log("✅ Uploaded to Supabase:", data?.path);
      }
    }

    return NextResponse.json({ message: "All files uploaded to Supabase successfully" });
  } catch (err) {
    console.error("❌ Migration error:", err);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}