import type { ChallengeEntry } from '@/types/challenge';

export const STARTING_CAPITAL = 25000;
export const CHALLENGE_DAYS = 60;
export const BRAND = 'TradeWithNine';
export const DEFAULT_INSTRUMENT = 'NIFTY 50 option buying';
export const STORAGE_KEY = 'tradewithnine.challenge.entries.v1';
export const SHEET_URL_KEY = 'tradewithnine.challenge.sheetUrl.v1';
export const LAST_SYNC_KEY = 'tradewithnine.challenge.lastSync.v1';
export const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/10HAcJFQ_D1oFAy6aq7x_KwdeSiN4wQqThKR9--XVXY0/edit?gid=472907113#gid=472907113';

export const seedEntries: ChallengeEntry[] = [
  {
    id: 'seed-day-1',
    day: 1,
    date: '2026-06-16',
    pnl: 2461,
    result: 'Win',
    tradesTaken: 2,
    instrument: DEFAULT_INSTRUMENT,
    followedStopLoss: true,
    revengeTrade: false,
    followedMaxTrades: true,
    disciplineScore: 8,
    notes: 'Followed plan and closed profitable.',
    mistakes: 'Could improve entry patience.',
    improveTomorrow: 'Wait for cleaner confirmation before entering.'
  },
  {
    id: 'seed-day-2',
    day: 2,
    date: '2026-06-17',
    pnl: -2024,
    result: 'Loss',
    tradesTaken: 2,
    instrument: DEFAULT_INSTRUMENT,
    followedStopLoss: true,
    revengeTrade: false,
    followedMaxTrades: true,
    disciplineScore: 6,
    notes: 'Loss day. Need to review execution and respect stop loss.',
    mistakes: 'Execution was not clean after first trade.',
    improveTomorrow: 'Reduce hesitation and stop after planned setups.'
  }
];
