import { NextRequest, NextResponse } from 'next/server';
import { parseEntriesFromCsv, parseGoogleSheetUrl, sheetCsvUrl } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) {
      return NextResponse.json({ message: 'Missing Google Sheet URL.' }, { status: 400 });
    }

    const location = parseGoogleSheetUrl(url);
    const response = await fetch(sheetCsvUrl(location), { cache: 'no-store' });
    const csv = await response.text();

    if (!response.ok || csv.trim().startsWith('<!DOCTYPE html') || csv.includes('Sign in to your Google Account')) {
      return NextResponse.json(
        {
          message:
            'The Google Sheet is not publicly readable as CSV. Set sharing to "Anyone with the link can view" or publish the sheet to the web.'
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      entries: parseEntriesFromCsv(csv),
      fetchedAt: new Date().toISOString(),
      source: location
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Could not load Google Sheet.' }, { status: 500 });
  }
}
