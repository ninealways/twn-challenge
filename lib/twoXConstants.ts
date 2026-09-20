import type { TwoXSetup } from '@/types/twoXChallenge';

export const TWO_X_SHEET_ID = '10HAcJFQ_D1oFAy6aq7x_KwdeSiN4wQqThKR9--XVXY0';
export const TWO_X_DAILY_GID = '1864710037';
export const TWO_X_TRADES_GID = '1727254666';
export const TWO_X_SETUP_GID = '55562284';
export const TWO_X_SHEET_URL = `https://docs.google.com/spreadsheets/d/${TWO_X_SHEET_ID}/edit?gid=${TWO_X_DAILY_GID}#gid=${TWO_X_DAILY_GID}`;

export const DEFAULT_TWO_X_SETUP: TwoXSetup = {
  challengeName: '2X in 120',
  startingCapital: 100000,
  targetCapital: 200000,
  tradingDays: 120,
  profitThresholdPct: 3,
  dailyLossLimitPct: 2,
  maximumConsecutiveLosses: 2,
  maximumTotalLosingTrades: 3,
  morningWindow: '09:30-10:30',
  afternoonWindow: '13:30-14:30'
};

export const TWO_X_CACHE_KEY = 'tradewithnine.2x120.payload.v1';
