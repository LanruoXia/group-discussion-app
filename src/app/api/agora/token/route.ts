// src/app/api/agora/token/route.ts
import { NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const appCertificate = process.env.AGORA_APP_CERTIFICATE!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const channelName = searchParams.get('channelName');
  const uid = searchParams.get('uid');

  if (!channelName || !uid) {
    return NextResponse.json(
      { error: 'Missing channelName or uid' },
      { status: 400 }
    );
  }

  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithAccount(
    appId,
    appCertificate,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );

  return NextResponse.json({ token });
}