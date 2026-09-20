import { parseCsv, normalizeHeader } from '@/lib/sheets';
import { DEFAULT_TWO_X_SETUP } from '@/lib/twoXConstants';
import type { TwoXDailyEntry, TwoXResult, TwoXSetup, TwoXTrade } from '@/types/twoXChallenge';

function parseNumber(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replace(/[₹,%\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBoolean(value: string | undefined, fallback = false) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['yes', 'y', 'true', '1', 'done'].includes(normalized)) return true;
  if (['no', 'n', 'false', '0'].includes(normalized)) return false;
  return fallback;
}

function normalizeDate(value: string | undefined) {
  const trimmed = (value || '').trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return trimmed;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function valueFor(row: Record<string, string>, ...names: string[]) {
  for (const name of names) {
    const value = row[normalizeHeader(name)];
    if (value !== undefined && value !== '') return value;
  }
  return '';
}

function rowsFromCsv(csv: string) {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((cells) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = (cells[index] || '').trim();
      return record;
    }, {})
  );
}

function parseResult(value: string | undefined, pnl: number): TwoXResult {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'win' || pnl > 0) return 'Win';
  if (normalized === 'loss' || pnl < 0) return 'Loss';
  return 'Break-even';
}

export function parseTwoXDaily(csv: string): TwoXDailyEntry[] {
  return rowsFromCsv(csv)
    .map((row, index) => {
      const day = parseNumber(valueFor(row, 'Trading Day'));
      const opening = parseNumber(valueFor(row, 'Opening'));
      const pnl = parseNumber(valueFor(row, 'Net P&L', 'Net PNL'));
      const suppliedClosing = parseNumber(valueFor(row, 'Closing'));
      return {
        id: `2x-daily-${day || index + 1}`,
        day: day || index + 1,
        date: normalizeDate(valueFor(row, 'Date')),
        opening,
        pnl,
        charges: parseNumber(valueFor(row, 'Charges')),
        closing: suppliedClosing || opening + pnl,
        discipline: Math.max(0, Math.min(10, parseNumber(valueFor(row, 'Discipline')))),
        stopLossAllTrades: parseBoolean(valueFor(row, 'SL- All Trades', 'SL All Trades')),
        dailyLossLimitHit: parseBoolean(valueFor(row, 'Daily Loss Limit Hit')),
        profitThresholdHit: parseBoolean(valueFor(row, 'Profit Threshold Hit')),
        rulesFollowed: parseBoolean(valueFor(row, 'Rules Followed')),
        tradingWindows: valueFor(row, 'Trading Windows Used'),
        notes: valueFor(row, 'Notes'),
        screenshotUrl: valueFor(row, 'Screenshot URL')
      };
    })
    .filter((entry) => entry.day > 0 && Boolean(entry.date))
    .sort((a, b) => a.day - b.day || a.date.localeCompare(b.date));
}

export function parseTwoXTrades(csv: string): TwoXTrade[] {
  return rowsFromCsv(csv)
    .map((row, index) => {
      const day = parseNumber(valueFor(row, 'Day', 'Trading Day'));
      const tradeNumber = parseNumber(valueFor(row, 'Number', 'Trade Number'));
      const pnl = parseNumber(valueFor(row, 'Trade P&L', 'Trade PNL'));
      return {
        id: `2x-trade-${day || 0}-${tradeNumber || index + 1}`,
        day,
        tradeNumber: tradeNumber || index + 1,
        date: normalizeDate(valueFor(row, 'Date')),
        entryTime: valueFor(row, 'Entry Time'),
        exitTime: valueFor(row, 'Exit Time'),
        optionType: valueFor(row, 'Type', 'Option Type'),
        strike: parseNumber(valueFor(row, 'Strike')),
        expiry: normalizeDate(valueFor(row, 'Expiry')),
        entryPrice: parseNumber(valueFor(row, 'Entry Price')),
        quantity: parseNumber(valueFor(row, 'Quantity')),
        stopLossPrice: parseNumber(valueFor(row, 'SL Price', 'Stop Loss Price')),
        targetPrice: parseNumber(valueFor(row, 'Target Price')),
        exitPrice: parseNumber(valueFor(row, 'Exit Price')),
        plannedRisk: parseNumber(valueFor(row, 'Planned Risk')),
        pnl,
        result: parseResult(valueFor(row, 'Result'), pnl),
        stopLossPlaced: parseBoolean(valueFor(row, 'SL Placed')),
        stopLossHit: parseBoolean(valueFor(row, 'SL Hit')),
        exitReason: valueFor(row, 'Exit Reason'),
        revengeTrade: parseBoolean(valueFor(row, 'Revenge Trade')),
        rulesFollowed: parseBoolean(valueFor(row, 'Rules Followed')),
        notes: valueFor(row, 'Notes'),
        screenshotUrl: valueFor(row, 'Screenshot URL')
      };
    })
    .filter((trade) => trade.day > 0 && trade.tradeNumber > 0 && Boolean(trade.date))
    .sort((a, b) => a.day - b.day || a.tradeNumber - b.tradeNumber);
}

export function parseTwoXSetup(csv: string): { setup: TwoXSetup; warnings: string[] } {
  const rawRows = parseCsv(csv);
  const pairs = new Map<string, string>();
  const warnings: string[] = [];

  if (rawRows.length) {
    const firstSetting = (rawRows[0][0] || '').trim();
    const firstValue = (rawRows[0][1] || '').trim();
    if (firstSetting.toLowerCase() === 'setting' && firstValue.toLowerCase() === 'value') {
      rawRows.slice(1).forEach((row) => pairs.set(normalizeHeader(row[0] || ''), (row[1] || '').trim()));
    } else {
      const inferredSetting = firstSetting.replace(/^setting\s*/i, '').trim();
      const inferredValue = firstValue.replace(/^value\s*/i, '').trim();
      if (inferredSetting && inferredValue) pairs.set(normalizeHeader(inferredSetting), inferredValue);
      rawRows.slice(1).forEach((row) => pairs.set(normalizeHeader(row[0] || ''), (row[1] || '').trim()));
      warnings.push('Setup headers were inferred. Use Setting and Value as the first-row headers for cleaner parsing.');
    }
  }

  const text = (key: string, fallback: string) => pairs.get(normalizeHeader(key)) || fallback;
  const number = (key: string, fallback: number) => parseNumber(pairs.get(normalizeHeader(key))) || fallback;

  return {
    setup: {
      challengeName: text('Challenge Name', DEFAULT_TWO_X_SETUP.challengeName),
      startingCapital: number('Starting Capital', DEFAULT_TWO_X_SETUP.startingCapital),
      targetCapital: number('Target Capital', DEFAULT_TWO_X_SETUP.targetCapital),
      tradingDays: number('Trading Days', DEFAULT_TWO_X_SETUP.tradingDays),
      profitThresholdPct: number('Profit Threshold %', DEFAULT_TWO_X_SETUP.profitThresholdPct),
      dailyLossLimitPct: number('Daily Loss Limit %', DEFAULT_TWO_X_SETUP.dailyLossLimitPct),
      maximumConsecutiveLosses: number('Maximum Consecutive Losses', DEFAULT_TWO_X_SETUP.maximumConsecutiveLosses),
      maximumTotalLosingTrades: number('Maximum Total Losing Trades', DEFAULT_TWO_X_SETUP.maximumTotalLosingTrades),
      morningWindow: text('Morning Window', DEFAULT_TWO_X_SETUP.morningWindow),
      afternoonWindow: text('Afternoon Window', DEFAULT_TWO_X_SETUP.afternoonWindow)
    },
    warnings
  };
}
