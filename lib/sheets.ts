import { DEFAULT_INSTRUMENT } from '@/lib/constants';
import type { ChallengeEntry, ChallengeResult } from '@/types/challenge';

export type SheetLocation = {
  sheetId: string;
  gid: string;
};

export function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function parseNumber(value: string | undefined) {
  if (!value) return 0;
  const cleaned = value.replace(/[₹,\s]/g, '');
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function parseTradeCount(value: string | undefined) {
  if (!value) return 0;
  const explicit = value.match(/(\d+)\s*\/\s*2/);
  if (explicit) return Number(explicit[1]);
  const tradeText = value.match(/(\d+)\s*trade/i);
  if (tradeText) return Number(tradeText[1]);
  return parseNumber(value);
}

function parseBoolean(value: string | undefined, fallback = false) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return ['yes', 'y', 'true', '1', 'ok', 'followed', 'done'].includes(normalized);
}

function parseSheetBoolean(value: string | undefined, fallback = false) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['0', 'no', 'n', 'false'].includes(normalized)) return false;
  return parseBoolean(value, fallback);
}

function parseResult(value: string | undefined, pnl: number): ChallengeResult {
  const normalized = (value || '').trim().toLowerCase();
  if (['win', 'profit', 'green'].includes(normalized)) return 'Win';
  if (['loss', 'red'].includes(normalized)) return 'Loss';
  if (['break-even', 'breakeven', 'break even', 'be'].includes(normalized)) return 'Break-even';
  if (['no trade', 'notrade', 'none'].includes(normalized)) return 'No Trade';
  if (pnl > 0) return 'Win';
  if (pnl < 0) return 'Loss';
  return 'Break-even';
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return trimmed;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function getValue(row: Record<string, string>, names: string[]) {
  for (const name of names) {
    const value = row[normalizeHeader(name)];
    if (value !== undefined && value !== '') return value;
  }
  return '';
}

export function parseGoogleSheetUrl(url: string): SheetLocation {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  const sheetId = match?.[1];
  const gid = parsed.searchParams.get('gid') || parsed.hash.match(/gid=([0-9]+)/)?.[1] || '0';

  if (!sheetId) {
    throw new Error('Invalid Google Sheet URL. Expected a docs.google.com/spreadsheets link.');
  }

  return { sheetId, gid };
}

export function sheetCsvUrl({ sheetId, gid }: SheetLocation) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

export function parseEntriesFromCsv(csv: string): ChallengeEntry[] {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  return rows
    .slice(1)
    .map((cells, index) => {
      const row = headers.reduce<Record<string, string>>((record, header, headerIndex) => {
        record[header] = (cells[headerIndex] || '').trim();
        return record;
      }, {});
      const date = normalizeDate(getValue(row, ['date']));
      const day = parseNumber(getValue(row, ['live trade day', 'day', 'trading day number', 'trading day', 'day number']));
      const pnl = parseNumber(getValue(row, ['daily pnl', 'pnl', 'p&l', 'daily p&l', 'profit loss', 'profit/loss']));
      const brokerage = parseNumber(getValue(row, ['brokerage/tax', 'brokerage tax', 'brokerage', 'tax']));
      const comments = getValue(row, ['comments', 'notes', 'notes learning for the day', 'learning', 'todays lesson']);
      const tradesTaken = parseTradeCount(getValue(row, ['trades taken', 'trades', 'number of trades taken']) || comments);
      const result = parseResult(getValue(row, ['result', 'status', 'profit day']), pnl);
      const stopLoss = getValue(row, ['did i follow stop loss', 'followed stop loss', 'stop loss followed', 'stop loss']);
      const sheetDiscipline = getValue(row, ['discipline with s/l', 'discipline with sl', 'discipline score', 'discipline']);
      const revenge = getValue(row, ['did i revenge trade', 'revenge trade', 'revenge trading']);
      const maxTrades = getValue(row, ['did i follow max 2 trades rule', 'followed max trades', 'max trades followed', 'max 2 trades rule']);
      const amountStart = parseNumber(getValue(row, ['amount start', 'starting amount', 'capital start']));
      const amountEnd = parseNumber(getValue(row, ['amount end', 'ending amount', 'capital end', 'current capital']));
      const followedStopLoss = stopLoss ? parseSheetBoolean(stopLoss, true) : parseSheetBoolean(sheetDiscipline, true);
      const disciplineScore = sheetDiscipline
        ? parseSheetBoolean(sheetDiscipline, false)
          ? 10
          : 0
        : Math.max(0, Math.min(10, parseNumber(getValue(row, ['discipline score', 'discipline']))));

      return {
        id: `sheet-day-${day || index + 1}`,
        day: day || index + 1,
        date,
        pnl,
        brokerage,
        amountStart,
        amountEnd,
        result,
        tradesTaken,
        instrument: getValue(row, ['instrument traded', 'instrument']) || DEFAULT_INSTRUMENT,
        followedStopLoss,
        revengeTrade: parseBoolean(revenge, false),
        followedMaxTrades: parseBoolean(maxTrades, tradesTaken <= 2) && tradesTaken <= 2,
        disciplineScore,
        screenshotDataUrl: getValue(row, ['screenshot', 'screenshot url', 'screenshot upload', 'image']),
        notes: comments,
        mistakes: getValue(row, ['mistakes', 'mistakes made']),
        improveTomorrow: getValue(row, ['what i will improve tomorrow', 'improve tomorrow', 'tomorrow improvement'])
      };
    })
    .filter((entry) => entry.day > 0 && Boolean(entry.date));
}
