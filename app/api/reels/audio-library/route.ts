import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LIBRARY_DIR = path.join(process.cwd(), 'work', 'reels', 'audio-library');
const FOLDER_DIR = path.join(process.cwd(), 'audio');
const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.wav', '.aiff', '.flac', '.ogg']);

function safeFilename(value: string) {
  return path.basename(value).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[.-]+|[.-]+$/g, '') || 'audio.mp3';
}

export async function GET(request: Request) {
  await mkdir(LIBRARY_DIR, { recursive: true });
  const requestedFile = new URL(request.url).searchParams.get('file');
  if (requestedFile) {
    const fileName = path.basename(requestedFile);
    const source = new URL(request.url).searchParams.get('source');
    if (!AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase())) return new Response('Invalid audio file', { status: 400 });
    try {
      const sourceDir = source === 'folder' ? FOLDER_DIR : LIBRARY_DIR;
      return new Response(await readFile(path.join(sourceDir, fileName)), {
        headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `inline; filename="${fileName}"` }
      });
    } catch {
      return new Response('Audio file not found', { status: 404 });
    }
  }
  const files = (await readdir(LIBRARY_DIR)).filter((file) => AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase())).sort();
  const folderFiles = await readdir(FOLDER_DIR)
    .then((items) => items.filter((file) => AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase())).sort())
    .catch(() => [] as string[]);
  return NextResponse.json({ files, folderFiles });
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('audio');
    if (!(file instanceof File) || !file.size) throw new Error('Choose an audio file');
    const fileName = safeFilename(file.name);
    if (!AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase())) {
      throw new Error('Use MP3, M4A, AAC, WAV, AIFF, FLAC, or OGG audio');
    }
    await mkdir(LIBRARY_DIR, { recursive: true });
    await writeFile(path.join(LIBRARY_DIR, fileName), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ file: fileName });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save audio' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const fileName = path.basename(new URL(request.url).searchParams.get('file') || '');
    if (!fileName || !AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase())) throw new Error('Invalid audio file');
    await unlink(path.join(LIBRARY_DIR, fileName));
    return NextResponse.json({ deleted: fileName });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not remove audio' }, { status: 400 });
  }
}
