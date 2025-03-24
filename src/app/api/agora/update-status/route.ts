import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ 后端专用 Key（勿暴露前端）
);

export async function POST(req: Request) {
  try {
    const { uid, channelName, action } = await req.json();

    // 🧪 日志调试所有传入参数
    console.log('📥 Incoming request:', { uid, channelName, action });

    if (!uid || !channelName || !action) {
      console.warn(`⚠️ [MISSING PARAMS] uid: ${uid}, channelName: ${channelName}, action: ${action}`);
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (action === 'join') {
      const { error } = await supabase.from('active_channels').insert({
        channel_name: channelName,
        user_uid: uid,
        joined_at: new Date(),
        left_at: null,
      });

      if (error) throw error;
      console.log(`✅ [JOIN] User ${uid} joined channel ${channelName}`);
    } else if (action === 'leave') {
      const { error } = await supabase
        .from('active_channels')
        .update({ left_at: new Date() })
        .eq('channel_name', channelName)
        .eq('user_uid', uid)
        .is('left_at', null);

      if (error) throw error;
      console.log(`👋 [LEAVE] User ${uid} left channel ${channelName}`);
    } else {
      console.warn(`⚠️ [INVALID ACTION] Received: ${action}`);
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    console.error('❌ [ERROR] update-status failed:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}