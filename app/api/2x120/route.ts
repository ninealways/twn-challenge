import { NextResponse } from 'next/server';
import {
  TWO_X_DAILY_GID,
  TWO_X_SETUP_GID,
  TWO_X_SHEET_ID,
  TWO_X_TRADES_GID
} from '@/lib/twoXConstants';
import { parseTwoXDaily, parseTwoXSetup, parseTwoXTrades } from '@/lib/twoXSheets';

function csvUrl(gid: string) {
  return `https://docs.google.com/spreadsheets/d/${TWO_X_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

async function fetchCsv(gid: string, label: string) {
  const response = await fetch(csvUrl(gid), { cache: 'no-store' });
  const csv = await response.text();
  if (!response.ok || csv.trim().startsWith('<!DOCTYPE html') || csv.includes('Sign in to your Google Account')) {
    throw new Error(`${label} is not publicly readable from Google Sheets.`);
  }
  return csv;
}

export async function GET() {
  try {
    const [dailyCsv, tradesCsv, setupCsv] = await Promise.all([
      fetchCsv(TWO_X_DAILY_GID, '2X120 Daily'),
      fetchCsv(TWO_X_TRADES_GID, '2X120 Trades'),
      fetchCsv(TWO_X_SETUP_GID, '2X120 Setup')
    ]);
    const { setup, warnings } = parseTwoXSetup(setupCsv);
    return NextResponse.json({
      daily: parseTwoXDaily(dailyCsv),
      trades: parseTwoXTrades(tradesCsv),
      setup,
      warnings,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Could not load the 2X in 120 sheet tabs.' },
      { status: 500 }
    );
  }
}
