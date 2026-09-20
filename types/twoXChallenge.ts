export type TwoXResult = 'Win' | 'Loss' | 'Break-even';

export type TwoXDailyEntry = {
  id: string;
  day: number;
  date: string;
  opening: number;
  pnl: number;
  charges: number;
  closing: number;
  discipline: number;
  stopLossAllTrades: boolean;
  dailyLossLimitHit: boolean;
  profitThresholdHit: boolean;
  rulesFollowed: boolean;
  tradingWindows: string;
  notes: string;
  screenshotUrl: string;
};

export type TwoXTrade = {
  id: string;
  day: number;
  tradeNumber: number;
  date: string;
  entryTime: string;
  exitTime: string;
  optionType: string;
  strike: number;
  expiry: string;
  entryPrice: number;
  quantity: number;
  stopLossPrice: number;
  targetPrice: number;
  exitPrice: number;
  plannedRisk: number;
  pnl: number;
  result: TwoXResult;
  stopLossPlaced: boolean;
  stopLossHit: boolean;
  exitReason: string;
  revengeTrade: boolean;
  rulesFollowed: boolean;
  notes: string;
  screenshotUrl: string;
};

export type TwoXSetup = {
  challengeName: string;
  startingCapital: number;
  targetCapital: number;
  tradingDays: number;
  profitThresholdPct: number;
  dailyLossLimitPct: number;
  maximumConsecutiveLosses: number;
  maximumTotalLosingTrades: number;
  morningWindow: string;
  afternoonWindow: string;
};

export type TwoXPayload = {
  daily: TwoXDailyEntry[];
  trades: TwoXTrade[];
  setup: TwoXSetup;
  fetchedAt: string;
  warnings: string[];
};

export type TwoXStats = {
  currentDay: number;
  currentCapital: number;
  netPnl: number;
  returnPct: number;
  remainingToTarget: number;
  capitalProgressPct: number;
  dayProgressPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  tradeWinRate: number;
  profitFactor: number | null;
  averageDiscipline: number;
  stopLossCoveragePct: number;
  ruleBreakCount: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  averageDailyPnl: number;
  bestDay: number;
  worstDay: number;
  consecutiveStopBreaches: number;
};
