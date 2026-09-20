import { NextResponse } from 'next/server';
import { spawnSync } from 'node:child_process';

export const runtime = 'nodejs';

function hasTool(name: string) {
  return spawnSync(name, ['-version'], { stdio: 'ignore' }).status === 0;
}

export function GET() {
  const ffmpeg = hasTool('ffmpeg');
  const ffprobe = hasTool('ffprobe');
  return NextResponse.json({ ok: ffmpeg && ffprobe, ffmpeg, ffprobe });
}
