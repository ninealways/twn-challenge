export type ChallengeResult = 'Win' | 'Loss' | 'Break-even' | 'No Trade';

export type ChallengeEntry = {
  id: string;
  day: number;
  date: string;
  pnl: number;
  brokerage?: number;
  amountStart?: number;
  amountEnd?: number;
  result: ChallengeResult;
  tradesTaken: number;
  instrument: string;
  followedStopLoss: boolean;
  revengeTrade: boolean;
  followedMaxTrades: boolean;
  disciplineScore: number;
  screenshotDataUrl?: string;
  notes: string;
  mistakes: string;
  improveTomorrow: string;
};

export type DashboardStats = {
  currentDay: number;
  startingCapital: number;
  currentCapital: number;
  netPnl: number;
  winDays: number;
  lossDays: number;
  breakEvenDays: number;
  noTradeDays: number;
  winRate: number;
  averageProfitDay: number;
  averageLossDay: number;
  bestDay: number;
  worstDay: number;
  currentStreak: string;
  maxDrawdown: number;
  completionPercentage: number;
  averageDiscipline: number;
  ruleBreakCount: number;
};

export type MilestoneSummary = {
  day: number;
  status: 'Locked' | 'Reached';
  capital: number;
  netPnl: number;
  winRate: number;
  biggestLesson: string;
  averageDiscipline: number;
};
