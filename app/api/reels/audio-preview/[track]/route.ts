import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { AUDIO_TRACKS } from '@/lib/reelJobs';

export const runtime = 'nodejs';

const PREVIEW_DIR = path.join(process.cwd(), 'work', 'reels', 'audio-previews');

async function generatePreview(track: string, outputPath: string) {
  const definition = AUDIO_TRACKS[track];
  if (!definition) throw new Error('Unknown audio track');
  await mkdir(PREVIEW_DIR, { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const process = spawn('ffmpeg', [
      '-y', '-nostdin', '-f', 'lavfi', '-t', '8', '-i', definition.source,
      '-af', 'afade=t=in:st=0:d=0.25,afade=t=out:st=7.5:d=0.5',
      '-c:a', 'aac', '-b:a', '128k', outputPath
    ]);
    const errors: Buffer[] = [];
    process.stderr.on('data', (chunk) => errors.push(chunk));
    process.on('error', reject);
    process.on('close', (code) => code === 0 ? resolve() : reject(new Error(Buffer.concat(errors).toString().slice(-1000))));
  });
}

export async function GET(_: Request, context: { params: Promise<{ track: string }> }) {
  try {
    const { track } = await context.params;
    if (!AUDIO_TRACKS[track]) return new Response('Unknown audio track', { status: 404 });
    const outputPath = path.join(PREVIEW_DIR, `${track}.m4a`);
    if (!existsSync(outputPath)) await generatePreview(track, outputPath);
    return new Response(await readFile(outputPath), {
      headers: { 'Content-Type': 'audio/mp4', 'Cache-Control': 'public, max-age=3600' }
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Could not generate preview', { status: 500 });
  }
}
