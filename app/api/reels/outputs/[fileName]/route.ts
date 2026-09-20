import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getOutputPath } from '@/lib/reelJobs';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ fileName: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { fileName } = await context.params;
  const outputPath = getOutputPath(fileName);
  if (!existsSync(outputPath)) return NextResponse.json({ error: 'Output not found' }, { status: 404 });
  const bytes = await readFile(outputPath);
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store'
    }
  });
}
