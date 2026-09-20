import { CHALLENGE_DAYS, STARTING_CAPITAL } from '@/lib/constants';
import type { ChallengeEntry, DashboardStats, MilestoneSummary } from '@/types/challenge';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

export function getRuleBreaks(entry: ChallengeEntry) {
  const breaks: string[] = [];
  if (!entry.followedStopLoss) breaks.push('Stop loss not followed');
  if (entry.revengeTrade) breaks.push('Revenge trade');
  if (!entry.followedMaxTrades || entry.tradesTaken > 2) breaks.push('Max 2 trades rule broken');
  return breaks;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function sortEntries(entries: ChallengeEntry[]) {
  return [...entries].sort((a, b) => a.day - b.day || a.date.localeCompare(b.date));
}

export function buildStats(entries: ChallengeEntry[]): DashboardStats {
  const sorted = sortEntries(entries);
  const currentDay = Math.min(CHALLENGE_DAYS, Math.max(0, ...sorted.map((entry) => entry.day)));
  const netPnl = sorted.reduce((sum, entry) => sum + entry.pnl, 0);
  const wins = sorted.filter((entry) => entry.result === 'Win');
  const losses = sorted.filter((entry) => entry.result === 'Loss');
  const breakEvens = sorted.filter((entry) => entry.result === 'Break-even');
  const noTrades = sorted.filter((entry) => entry.result === 'No Trade');
  const decidedDays = wins.length + losses.length;
  const bestDay = sorted.length ? Math.max(...sorted.map((entry) => entry.pnl)) : 0;
  const worstDay = sorted.length ? Math.min(...sorted.map((entry) => entry.pnl)) : 0;

  let peak = STARTING_CAPITAL;
  let equity = STARTING_CAPITAL;
  let maxDrawdown = 0;
  sorted.forEach((entry) => {
    equity += entry.pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity - peak);
  });

  let currentStreak = '0 days';
  if (sorted.length) {
    const latest = sorted[sorted.length - 1].result;
    let streak = 0;
    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      if (sorted[index].result !== latest) break;
      streak += 1;
    }
    currentStreak = `${streak} ${latest}${streak === 1 ? '' : 's'}`;
  }

  const latestAmountEnd = [...sorted].reverse().find((entry) => entry.amountEnd && entry.amountEnd > 0)?.amountEnd;

  return {
    currentDay,
    startingCapital: STARTING_CAPITAL,
    currentCapital: latestAmountEnd || STARTING_CAPITAL + netPnl,
    netPnl,
    winDays: wins.length,
    lossDays: losses.length,
    breakEvenDays: breakEvens.length,
    noTradeDays: noTrades.length,
    winRate: decidedDays ? (wins.length / decidedDays) * 100 : 0,
    averageProfitDay: average(wins.map((entry) => entry.pnl)),
    averageLossDay: average(losses.map((entry) => entry.pnl)),
    bestDay,
    worstDay,
    currentStreak,
    maxDrawdown,
    completionPercentage: (currentDay / CHALLENGE_DAYS) * 100,
    averageDiscipline: average(sorted.map((entry) => entry.disciplineScore)),
    ruleBreakCount: sorted.reduce((sum, entry) => sum + getRuleBreaks(entry).length, 0)
  };
}

export function chartRows(entries: ChallengeEntry[]) {
  let equity = STARTING_CAPITAL;
  let peak = STARTING_CAPITAL;
  return sortEntries(entries).map((entry) => {
    equity += entry.pnl;
    if (entry.amountEnd && entry.amountEnd > 0) {
      equity = entry.amountEnd;
    }
    peak = Math.max(peak, equity);
    return {
      day: `D${entry.day}`,
      dayNumber: entry.day,
      pnl: entry.pnl,
      equity,
      discipline: entry.disciplineScore,
      drawdown: equity - peak,
      ruleBreaks: getRuleBreaks(entry).length,
      result: entry.result
    };
  });
}

export function resultDistribution(entries: ChallengeEntry[]) {
  return ['Win', 'Loss', 'Break-even', 'No Trade'].map((result) => ({
    name: result,
    value: entries.filter((entry) => entry.result === result).length
  }));
}

export function buildMilestones(entries: ChallengeEntry[]): MilestoneSummary[] {
  const sorted = sortEntries(entries);
  return [10, 20, 30, 40, 50, 60].map((day) => {
    const upto = sorted.filter((entry) => entry.day <= day);
    const stats = buildStats(upto);
    const lessonEntry = [...upto].reverse().find((entry) => entry.notes.trim());
    return {
      day,
      status: stats.currentDay >= day ? 'Reached' : 'Locked',
      capital: stats.currentCapital,
      netPnl: stats.netPnl,
      winRate: stats.winRate,
      biggestLesson: lessonEntry?.notes || 'Add a lesson when this milestone is reached.',
      averageDiscipline: stats.averageDiscipline
    };
  });
}
