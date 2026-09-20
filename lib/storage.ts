import { DEFAULT_SHEET_URL, LAST_SYNC_KEY, seedEntries, SHEET_URL_KEY, STORAGE_KEY } from '@/lib/constants';
import type { ChallengeEntry } from '@/types/challenge';

export function loadEntries(): ChallengeEntry[] {
  if (typeof window === 'undefined') return seedEntries;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedEntries));
    return seedEntries;
  }

  try {
    return JSON.parse(raw) as ChallengeEntry[];
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedEntries));
    return seedEntries;
  }
}

export function saveEntries(entries: ChallengeEntry[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function loadSheetUrl() {
  if (typeof window === 'undefined') return DEFAULT_SHEET_URL;
  return window.localStorage.getItem(SHEET_URL_KEY) || DEFAULT_SHEET_URL;
}

export function saveSheetUrl(url: string) {
  window.localStorage.setItem(SHEET_URL_KEY, url);
}

export function loadLastSync() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(LAST_SYNC_KEY) || '';
}

export function saveLastSync(value: string) {
  window.localStorage.setItem(LAST_SYNC_KEY, value);
}

export function makeEntryId() {
  return `entry-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

export function entriesToCsv(entries: ChallengeEntry[]) {
  const headers = [
    'Day',
    'Date',
    'P&L',
    'Brokerage/Tax',
    'Amount Start',
    'Amount End',
    'Result',
    'Trades',
    'Instrument',
    'Stop Loss Followed',
    'Revenge Trade',
    'Max Trades Followed',
    'Discipline Score',
    'Notes',
    'Mistakes',
    'Improve Tomorrow'
  ];
  const rows = entries.map((entry) => [
    entry.day,
    entry.date,
    entry.pnl,
    entry.brokerage || 0,
    entry.amountStart || '',
    entry.amountEnd || '',
    entry.result,
    entry.tradesTaken,
    entry.instrument,
    entry.followedStopLoss ? 'Yes' : 'No',
    entry.revengeTrade ? 'Yes' : 'No',
    entry.followedMaxTrades ? 'Yes' : 'No',
    entry.disciplineScore,
    entry.notes,
    entry.mistakes,
    entry.improveTomorrow
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
}

export function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
