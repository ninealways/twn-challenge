import type { TwoXDailyEntry, TwoXSetup, TwoXStats, TwoXTrade } from '@/types/twoXChallenge';

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function buildTwoXStats(daily: TwoXDailyEntry[], trades: TwoXTrade[], setup: TwoXSetup): TwoXStats {
  const sortedDaily = [...daily].sort((a, b) => a.day - b.day);
  const sortedTrades = [...trades].sort((a, b) => a.day - b.day || a.tradeNumber - b.tradeNumber);
  const currentDay = sortedDaily.length ? Math.max(...sortedDaily.map((entry) => entry.day)) : 0;
  const dailyPnl = sortedDaily.reduce((sum, entry) => sum + entry.pnl, 0);
  const latestClosing = [...sortedDaily].reverse().find((entry) => entry.closing > 0)?.closing;
  const currentCapital = latestClosing || setup.startingCapital + dailyPnl;
  const netPnl = currentCapital - setup.startingCapital;
  const targetGain = Math.max(1, setup.targetCapital - setup.startingCapital);
  const wins = sortedTrades.filter((trade) => trade.result === 'Win');
  const losses = sortedTrades.filter((trade) => trade.result === 'Loss');
  const breakEvens = sortedTrades.filter((trade) => trade.result === 'Break-even');
  const decidedTrades = wins.length + losses.length;
  const grossProfit = wins.reduce((sum, trade) => sum + Math.max(0, trade.pnl), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + Math.min(0, trade.pnl), 0));

  let peak = setup.startingCapital;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  sortedDaily.forEach((entry) => {
    const equity = entry.closing || entry.opening + entry.pnl;
    peak = Math.max(peak, equity);
    const drawdown = equity - peak;
    const drawdownPct = peak ? (drawdown / peak) * 100 : 0;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPct = drawdownPct;
    }
  });

  const tradesByDay = new Map<number, TwoXTrade[]>();
  sortedTrades.forEach((trade) => {
    tradesByDay.set(trade.day, [...(tradesByDay.get(trade.day) || []), trade]);
  });
  let consecutiveStopBreaches = 0;
  tradesByDay.forEach((dayTrades) => {
    let lossStreak = 0;
    let stopIndex = -1;
    dayTrades.forEach((trade, index) => {
      lossStreak = trade.result === 'Loss' ? lossStreak + 1 : 0;
      if (lossStreak >= setup.maximumConsecutiveLosses && stopIndex === -1) stopIndex = index;
    });
    if (stopIndex >= 0 && stopIndex < dayTrades.length - 1) consecutiveStopBreaches += 1;
  });

  const dailyRuleBreaks = sortedDaily.filter((entry) => !entry.rulesFollowed || !entry.stopLossAllTrades).length;
  const tradeRuleBreaks = sortedTrades.filter(
    (trade) => !trade.rulesFollowed || !trade.stopLossPlaced || trade.revengeTrade
  ).length;

  return {
    currentDay,
    currentCapital,
    netPnl,
    returnPct: setup.startingCapital ? (netPnl / setup.startingCapital) * 100 : 0,
    remainingToTarget: Math.max(0, setup.targetCapital - currentCapital),
    capitalProgressPct: ((currentCapital - setup.startingCapital) / targetGain) * 100,
    dayProgressPct: setup.tradingDays ? (currentDay / setup.tradingDays) * 100 : 0,
    totalTrades: sortedTrades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakEvenTrades: breakEvens.length,
    tradeWinRate: decidedTrades ? (wins.length / decidedTrades) * 100 : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
    averageDiscipline: average(sortedDaily.map((entry) => entry.discipline)),
    stopLossCoveragePct: sortedTrades.length
      ? (sortedTrades.filter((trade) => trade.stopLossPlaced).length / sortedTrades.length) * 100
      : 0,
    ruleBreakCount: dailyRuleBreaks + tradeRuleBreaks + consecutiveStopBreaches,
    maxDrawdown,
    maxDrawdownPct,
    averageDailyPnl: average(sortedDaily.map((entry) => entry.pnl)),
    bestDay: sortedDaily.length ? Math.max(...sortedDaily.map((entry) => entry.pnl)) : 0,
    worstDay: sortedDaily.length ? Math.min(...sortedDaily.map((entry) => entry.pnl)) : 0,
    consecutiveStopBreaches
  };
}

export function buildTwoXChartRows(daily: TwoXDailyEntry[], setup: TwoXSetup) {
  let peak = setup.startingCapital;
  return [...daily]
    .sort((a, b) => a.day - b.day)
    .map((entry) => {
      const equity = entry.closing || entry.opening + entry.pnl;
      peak = Math.max(peak, equity);
      return {
        day: `D${entry.day}`,
        dayNumber: entry.day,
        equity,
        target: setup.targetCapital,
        pnl: entry.pnl,
        discipline: entry.discipline,
        drawdown: equity - peak,
        profitThreshold: entry.opening * (setup.profitThresholdPct / 100),
        lossLimit: -entry.opening * (setup.dailyLossLimitPct / 100)
      };
    });
}

export function tradeNumberPerformance(trades: TwoXTrade[]) {
  const grouped = new Map<number, TwoXTrade[]>();
  trades.forEach((trade) => grouped.set(trade.tradeNumber, [...(grouped.get(trade.tradeNumber) || []), trade]));
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([tradeNumber, entries]) => ({
      trade: `T${tradeNumber}`,
      pnl: entries.reduce((sum, trade) => sum + trade.pnl, 0),
      count: entries.length,
      winRate:
        entries.filter((trade) => trade.result !== 'Break-even').length > 0
          ? (entries.filter((trade) => trade.result === 'Win').length /
              entries.filter((trade) => trade.result !== 'Break-even').length) *
            100
          : 0
    }));
}
