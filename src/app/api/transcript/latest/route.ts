import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TRANSCRIPTS_DIR = path.join(process.cwd(), 'public', 'transcripts');

// 确保目录存在
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get('session_id');
    console.log('Fetching transcript with session_id:', session_id);

    if (!session_id) {
      console.log('No session_id provided, fetching latest transcript');
      // 获取最新的转录文件
      const files = fs.readdirSync(TRANSCRIPTS_DIR);
      if (files.length === 0) {
        console.log('No transcript files found');
        return NextResponse.json(
          { message: 'No transcript found' },
          { status: 404 }
        );
      }

      // 按修改时间排序，获取最新的文件
      const latestFile = files
        .map(file => ({
          name: file,
          time: fs.statSync(path.join(TRANSCRIPTS_DIR, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time)[0];

      const content = fs.readFileSync(
        path.join(TRANSCRIPTS_DIR, latestFile.name),
        'utf-8'
      );

      console.log('Found latest transcript:', {
        filename: latestFile.name,
        contentLength: content.length
      });

      return NextResponse.json({
        content,
        created_at: new Date(latestFile.time).toISOString(),
        session_id: latestFile.name.replace('.txt', '')
      });
    }

    console.log('Fetching transcript for session:', session_id);
    const filePath = path.join(TRANSCRIPTS_DIR, `${session_id}.txt`);

    if (!fs.existsSync(filePath)) {
      console.log('No transcript found for session:', session_id);
      return NextResponse.json(
        { message: 'No transcript found for this session' },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);

    console.log('Found transcript for session:', {
      session_id,
      contentLength: content.length,
      created_at: stats.mtime
    });

    return NextResponse.json({
      content,
      created_at: stats.mtime.toISOString(),
      session_id
    });
  } catch (error) {
    console.error('Unexpected error in transcript latest route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
} 