import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TRANSCRIPTS_DIR = path.join(process.cwd(), 'public', 'transcripts');

// 确保目录存在
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

export async function POST(req: Request) {
  try {
    const { content, session_id } = await req.json();
    
    if (!content) {
      console.error('No content provided');
      return NextResponse.json(
        { error: 'No content provided' },
        { status: 400 }
      );
    }

    // 如果没有提供 session_id，生成一个新的
    const finalSessionId = session_id || `session_${Date.now()}`;
    const filePath = path.join(TRANSCRIPTS_DIR, `${finalSessionId}.txt`);

    // 保存转录内容到文件
    fs.writeFileSync(filePath, content, 'utf-8');
    
    console.log('Transcript saved successfully:', {
      session_id: finalSessionId,
      contentLength: content.length,
      filePath
    });

    return NextResponse.json({
      success: true,
      session_id: finalSessionId
    });
  } catch (error) {
    console.error('Error saving transcript:', error);
    return NextResponse.json(
      { error: 'Failed to save transcript', details: error },
      { status: 500 }
    );
  }
} 