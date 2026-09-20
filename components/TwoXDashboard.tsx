'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import BrandMark from '@/components/BrandMark';
import ChallengeToggle from '@/components/ChallengeToggle';
import MetricCard from '@/components/MetricCard';
import ProgressBar from '@/components/ProgressBar';
import SectionCard from '@/components/SectionCard';
import TwoXCalendar from '@/components/TwoXCalendar';
import TwoXYouTube from '@/components/TwoXYouTube';
import TwoXPositionCalculator from '@/components/TwoXPositionCalculator';
import { downloadText } from '@/lib/storage';
import { formatCurrency } from '@/lib/stats';
import { DEFAULT_TWO_X_SETUP, TWO_X_CACHE_KEY } from '@/lib/twoXConstants';
import { buildTwoXChartRows, buildTwoXStats, tradeNumberPerformance } from '@/lib/twoXStats';
import type { TwoXDailyEntry, TwoXPayload, TwoXTrade } from '@/types/twoXChallenge';

type TwoXTab = 'dashboard' | 'calculator' | 'calendar' | 'analytics' | 'daily' | 'trades' | 'youtube' | 'milestones' | 'setup';

const tabs: { id: TwoXTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'daily', label: 'Daily Log' },
  { id: 'trades', label: 'Trades' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'setup', label: 'Setup' }
];

const colors = {
  panel: '#0d121a',
  grid: '#263241',
  muted: '#a7b0bf',
  profit: '#2fea7b',
  profitFill: '#2fea7b24',
  loss: '#ff5268',
  lossFill: '#ff526824',
  warning: '#f6c34a',
  info: '#4fb6ff'
};

const tooltipStyle = {
  background: colors.panel,
  border: `1px solid ${colors.grid}`,
  borderRadius: 8
};

function formatDate(value: string) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function yesNo(value: boolean) {
  return value ? <span className="text-profit">Yes</span> : <span className="text-loss">No</span>;
}

function ChartPanel({ title, children }: Readonly<{ title: string; children: React.ReactElement }>) {
  return (
    <SectionCard title={title}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

function dailyResult(entry: TwoXDailyEntry) {
  if (entry.pnl > 0) return 'Win';
  if (entry.pnl < 0) return 'Loss';
  return 'Break-even';
}

function tradeTone(trade: TwoXTrade) {
  if (trade.result === 'Win') return 'text-profit';
  if (trade.result === 'Loss') return 'text-loss';
  return 'text-slate-200';
}

export default function TwoXDashboard() {
  const [activeTab, setActiveTab] = useState<TwoXTab>('dashboard');
  const [payload, setPayload] = useState<TwoXPayload>({
    daily: [],
    trades: [],
    setup: DEFAULT_TWO_X_SETUP,
    fetchedAt: '',
    warnings: []
  });
  async function refresh() {
    try {
      const response = await fetch('/api/2x120');
      const next = (await response.json()) as TwoXPayload & { message?: string };
      if (!response.ok || !next.daily || !next.trades || !next.setup) {
        throw new Error(next.message || 'Could not load the 2X in 120 data.');
      }
      setPayload(next);
      window.localStorage.setItem(TWO_X_CACHE_KEY, JSON.stringify(next));
    } catch { /* Keep displaying the last successfully cached data. */ }
  }

  useEffect(() => {
    const cached = window.localStorage.getItem(TWO_X_CACHE_KEY);
    if (cached) {
      try {
        setPayload(JSON.parse(cached) as TwoXPayload);
      } catch {
        window.localStorage.removeItem(TWO_X_CACHE_KEY);
      }
    }
    void refresh();
  }, []);

  const stats = useMemo(() => buildTwoXStats(payload.daily, payload.trades, payload.setup), [payload]);
  const chartRows = useMemo(() => buildTwoXChartRows(payload.daily, payload.setup), [payload]);
  const tradePerformance = useMemo(() => tradeNumberPerformance(payload.trades), [payload.trades]);
  const latestDay = payload.daily.at(-1);
  const openingCapital = latestDay?.opening || stats.currentCapital || payload.setup.startingCapital;
  const dailyProfitThreshold = openingCapital * (payload.setup.profitThresholdPct / 100);
  const dailyLossLimit = openingCapital * (payload.setup.dailyLossLimitPct / 100);
  const capitalTone = stats.netPnl >= 0 ? 'profit' : 'loss';
  const milestoneValues = [
    payload.setup.startingCapital,
    payload.setup.startingCapital * 1.1,
    payload.setup.startingCapital * 1.25,
    payload.setup.startingCapital * 1.5,
    payload.setup.startingCapital * 1.75,
    payload.setup.targetCapital
  ];

  return (
    <main className="min-h-screen bg-canvas text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6 lg:px-8">
        <nav className="sticky top-3 z-20 flex flex-col gap-3 rounded-lg border border-grid bg-panel/95 p-2 shadow-soft backdrop-blur">
          <div className="flex shrink-0 flex-wrap items-center gap-3 px-2 py-1">
            <BrandMark subtitle="2X in 120 Challenge" />
            <ChallengeToggle value="2x120" />
          </div>
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-10 shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${
                  activeTab === tab.id ? 'bg-profit text-black' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <header className="app-surface overflow-hidden">
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-profit">TradeWithNine</p>
              <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">{payload.setup.challengeName}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
                {formatCurrency(payload.setup.startingCapital)} to {formatCurrency(payload.setup.targetCapital)} in {payload.setup.tradingDays} trading days. Stop after {payload.setup.maximumConsecutiveLosses} consecutive losses. Every trade requires a stop loss.
              </p>
            </div>
            <div className="grid min-w-64 grid-cols-2 gap-2 text-center">
              <div className="rounded-md border border-profit/30 bg-profit/10 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Profit threshold</p>
                <p className="mt-1 text-xl font-black text-profit">+{payload.setup.profitThresholdPct}%</p>
              </div>
              <div className="rounded-md border border-loss/30 bg-loss/10 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Hard stop</p>
                <p className="mt-1 text-xl font-black text-loss">-{payload.setup.dailyLossLimitPct}%</p>
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="grid gap-5">
            <SectionCard title={`Capital progress: ${formatCurrency(stats.currentCapital)} of ${formatCurrency(payload.setup.targetCapital)}`} subtitle={`${Math.max(0, stats.capitalProgressPct).toFixed(1)}% of the required capital growth completed`}>
              <div className="grid gap-3">
                <ProgressBar value={stats.capitalProgressPct} />
                <div className="flex justify-between text-sm font-semibold text-muted">
                  <span>{formatCurrency(payload.setup.startingCapital)}</span>
                  <span>{formatCurrency(stats.remainingToTarget)} remaining</span>
                  <span>{formatCurrency(payload.setup.targetCapital)}</span>
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <article className="relative overflow-hidden rounded-lg border border-warning/70 bg-[#18150c] p-5 shadow-[0_0_28px_rgba(246,195,74,0.12)]">
                <span className="absolute inset-x-0 top-0 h-1 bg-warning" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-warning">Primary process KPI</p>
                    <h2 className="mt-2 text-xl font-bold text-white">Average discipline</h2>
                    <p className="mt-1 text-sm text-slate-400">Rule quality across completed days</p>
                  </div>
                  <p className="text-4xl font-black tabular-nums text-warning">{stats.averageDiscipline.toFixed(1)} <span className="text-xl text-amber-200/70">/ 10</span></p>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full border border-warning/20 bg-black/40">
                  <div className="h-full bg-warning transition-all" style={{ width: `${Math.min(100, stats.averageDiscipline * 10)}%` }} />
                </div>
              </article>

              <article className="rounded-lg border border-grid bg-panel p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Day {stats.currentDay || 0} risk plan</p>
                    <h2 className="mt-2 text-xl font-bold text-white">Opening {formatCurrency(openingCapital)}</h2>
                  </div>
                  <span className="rounded-md border border-info/40 bg-info/10 px-3 py-2 text-sm font-bold text-info">{stats.dayProgressPct.toFixed(1)}% complete</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-profit/30 bg-profit/10 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">3% threshold</p>
                    <p className="mt-1 text-xl font-black text-profit">+{formatCurrency(dailyProfitThreshold)}</p>
                  </div>
                  <div className="rounded-md border border-loss/30 bg-loss/10 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">2% hard stop</p>
                    <p className="mt-1 text-xl font-black text-loss">-{formatCurrency(dailyLossLimit)}</p>
                  </div>
                </div>
              </article>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Current Capital" value={formatCurrency(stats.currentCapital)} tone={capitalTone} />
              <MetricCard label="Net P&L" value={formatCurrency(stats.netPnl)} tone={capitalTone} />
              <MetricCard label="Capital Return" value={`${stats.returnPct.toFixed(2)}%`} tone={capitalTone} />
              <MetricCard label="Trading Day" value={`${stats.currentDay} / ${payload.setup.tradingDays}`} />
              <MetricCard label="Total Trades" value={stats.totalTrades} />
              <MetricCard label="Trade Win Rate" value={`${stats.tradeWinRate.toFixed(1)}%`} tone={stats.tradeWinRate >= 50 ? 'profit' : 'neutral'} />
              <MetricCard label="Profit Factor" value={stats.profitFactor === null ? 'No losses' : stats.profitFactor.toFixed(2)} tone={stats.profitFactor !== null && stats.profitFactor >= 1 ? 'profit' : 'neutral'} />
              <MetricCard label="SL Coverage" value={`${stats.stopLossCoveragePct.toFixed(1)}%`} tone={stats.stopLossCoveragePct === 100 ? 'profit' : 'loss'} />
              <MetricCard label="Average Daily P&L" value={formatCurrency(stats.averageDailyPnl)} tone={stats.averageDailyPnl >= 0 ? 'profit' : 'loss'} />
              <MetricCard label="Best Day" value={formatCurrency(stats.bestDay)} tone="profit" />
              <MetricCard label="Worst Day" value={formatCurrency(stats.worstDay)} tone={stats.worstDay < 0 ? 'loss' : 'profit'} />
              <MetricCard label="Max Drawdown" value={`${formatCurrency(stats.maxDrawdown)} (${stats.maxDrawdownPct.toFixed(1)}%)`} tone={stats.maxDrawdown < 0 ? 'loss' : 'neutral'} />
              <MetricCard label="Rule Issues" value={stats.ruleBreakCount} tone={stats.ruleBreakCount ? 'warning' : 'profit'} />
              <MetricCard label="2-Loss Stop Breaches" value={stats.consecutiveStopBreaches} tone={stats.consecutiveStopBreaches ? 'loss' : 'profit'} />
              <MetricCard label="Winning Trades" value={stats.winningTrades} tone="profit" />
              <MetricCard label="Losing Trades" value={stats.losingTrades} tone="loss" />
            </div>
          </div>
        ) : null}

        {activeTab === 'calculator' ? (
          <TwoXPositionCalculator
            currentCapital={stats.currentCapital}
            dailyLossLimitPct={payload.setup.dailyLossLimitPct}
            consecutiveLossLimit={payload.setup.maximumConsecutiveLosses}
          />
        ) : null}

        {activeTab === 'youtube' ? <TwoXYouTube payload={payload} /> : null}

        {activeTab === 'calendar' ? (
          <TwoXCalendar daily={payload.daily} trades={payload.trades} setup={payload.setup} />
        ) : null}

        {activeTab === 'analytics' ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartPanel title="Capital toward ₹2 lakh">
              <ComposedChart data={chartRows}>
                <CartesianGrid stroke={colors.grid} />
                <XAxis dataKey="day" stroke={colors.muted} />
                <YAxis stroke={colors.muted} domain={[payload.setup.startingCapital * 0.9, payload.setup.targetCapital * 1.03]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Area dataKey="equity" name="Capital" stroke={colors.profit} fill={colors.profitFill} strokeWidth={3} />
                <Line dataKey="target" name="Target" stroke={colors.warning} strokeDasharray="6 6" dot={false} />
              </ComposedChart>
            </ChartPanel>
            <ChartPanel title="Daily P&L against limits">
              <ComposedChart data={chartRows}>
                <CartesianGrid stroke={colors.grid} />
                <XAxis dataKey="day" stroke={colors.muted} />
                <YAxis stroke={colors.muted} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="pnl" name="Net P&L">{chartRows.map((row) => <Cell key={row.day} fill={row.pnl >= 0 ? colors.profit : colors.loss} />)}</Bar>
                <Line dataKey="profitThreshold" name="Profit threshold" stroke={colors.warning} strokeWidth={2} />
                <Line dataKey="lossLimit" name="Loss limit" stroke={colors.loss} strokeWidth={2} />
              </ComposedChart>
            </ChartPanel>
            <ChartPanel title="Performance by trade number">
              <BarChart data={tradePerformance}>
                <CartesianGrid stroke={colors.grid} />
                <XAxis dataKey="trade" stroke={colors.muted} />
                <YAxis stroke={colors.muted} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => name === 'pnl' ? formatCurrency(value) : value} />
                <Bar dataKey="pnl" name="Net P&L">{tradePerformance.map((row) => <Cell key={row.trade} fill={row.pnl >= 0 ? colors.profit : colors.loss} />)}</Bar>
              </BarChart>
            </ChartPanel>
            <ChartPanel title="Discipline trend">
              <LineChart data={chartRows}>
                <CartesianGrid stroke={colors.grid} />
                <XAxis dataKey="day" stroke={colors.muted} />
                <YAxis domain={[0, 10]} stroke={colors.muted} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line dataKey="discipline" stroke={colors.warning} strokeWidth={3} />
              </LineChart>
            </ChartPanel>
            <ChartPanel title="Drawdown from capital high">
              <AreaChart data={chartRows}>
                <CartesianGrid stroke={colors.grid} />
                <XAxis dataKey="day" stroke={colors.muted} />
                <YAxis stroke={colors.muted} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Area dataKey="drawdown" stroke={colors.loss} fill={colors.lossFill} strokeWidth={3} />
              </AreaChart>
            </ChartPanel>
          </div>
        ) : null}

        {activeTab === 'daily' ? (
          <SectionCard title="Daily challenge log" subtitle="One row per completed trading day from 2X120 Daily.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-separate border-spacing-y-2 text-left text-sm tabular-nums">
                <thead className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  <tr><th>Day</th><th>Date</th><th>Opening</th><th>Net P&L</th><th>Closing</th><th>Result</th><th>Discipline</th><th>SL all trades</th><th>Rules</th><th>Window</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {payload.daily.map((entry) => (
                    <tr key={entry.id} className="bg-panelSoft transition hover:bg-slate-800/70">
                      <td className="rounded-l-lg p-3 font-bold">D{entry.day}</td>
                      <td className="p-3 text-slate-300">{formatDate(entry.date)}</td>
                      <td className="p-3">{formatCurrency(entry.opening)}</td>
                      <td className={`p-3 font-bold ${entry.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(entry.pnl)}</td>
                      <td className="p-3 font-bold">{formatCurrency(entry.closing)}</td>
                      <td className={`p-3 font-bold ${entry.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{dailyResult(entry)}</td>
                      <td className="p-3">{entry.discipline} / 10</td>
                      <td className="p-3">{yesNo(entry.stopLossAllTrades)}</td>
                      <td className="p-3">{yesNo(entry.rulesFollowed)}</td>
                      <td className="p-3">{entry.tradingWindows || 'Not recorded'}</td>
                      <td className="max-w-sm truncate rounded-r-lg p-3 text-slate-300" title={entry.notes}>{entry.notes || 'No notes'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        ) : null}

        {activeTab === 'trades' ? (
          <SectionCard title="Individual trades" subtitle="Trade order is preserved so consecutive losses and later-trade performance can be measured.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] border-separate border-spacing-y-2 text-left text-sm tabular-nums">
                <thead className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  <tr><th>Day / Trade</th><th>Time</th><th>Contract</th><th>Entry</th><th>SL</th><th>Target</th><th>Exit</th><th>Risk</th><th>P&L</th><th>Result</th><th>SL placed</th><th>SL hit</th><th>Exit reason</th><th>Rules</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {payload.trades.map((trade) => (
                    <tr key={trade.id} className="bg-panelSoft transition hover:bg-slate-800/70">
                      <td className="rounded-l-lg p-3 font-bold">D{trade.day} / T{trade.tradeNumber}</td>
                      <td className="p-3 text-slate-300">{trade.entryTime}–{trade.exitTime}</td>
                      <td className="p-3">{trade.optionType} {trade.strike || ''}</td>
                      <td className="p-3">₹{trade.entryPrice}</td>
                      <td className="p-3">₹{trade.stopLossPrice}</td>
                      <td className="p-3">₹{trade.targetPrice}</td>
                      <td className="p-3">₹{trade.exitPrice}</td>
                      <td className="p-3">{formatCurrency(trade.plannedRisk)}</td>
                      <td className={`p-3 font-bold ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(trade.pnl)}</td>
                      <td className={`p-3 font-bold ${tradeTone(trade)}`}>{trade.result}</td>
                      <td className="p-3">{yesNo(trade.stopLossPlaced)}</td>
                      <td className="p-3">{yesNo(trade.stopLossHit)}</td>
                      <td className="p-3">{trade.exitReason || 'Not recorded'}</td>
                      <td className="p-3">{yesNo(trade.rulesFollowed && !trade.revengeTrade)}</td>
                      <td className="max-w-sm truncate rounded-r-lg p-3 text-slate-300" title={trade.notes}>{trade.notes || 'No notes'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        ) : null}

        {activeTab === 'milestones' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {milestoneValues.map((capital, index) => {
              const reached = stats.currentCapital >= capital;
              const progress = capital <= payload.setup.startingCapital
                ? reached ? 100 : 0
                : Math.max(0, Math.min(100, ((stats.currentCapital - payload.setup.startingCapital) / (capital - payload.setup.startingCapital)) * 100));
              return (
                <section key={capital} className={`rounded-lg border p-5 ${reached ? 'border-profit/40 bg-profit/10' : 'border-grid bg-panel'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.13em] text-muted">Milestone {index + 1}</p>
                      <h2 className="mt-2 text-2xl font-black text-white">{formatCurrency(capital)}</h2>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-sm font-bold ${reached ? 'border-profit/30 text-profit' : 'border-grid text-muted'}`}>{reached ? 'Reached' : 'Locked'}</span>
                  </div>
                  <p className="mt-4 text-sm text-muted">{progress.toFixed(1)}% of this step completed</p>
                </section>
              );
            })}
          </div>
        ) : null}

        {activeTab === 'setup' ? (
          <div className="grid gap-5">
            <SectionCard title="Challenge rules" subtitle="Values loaded from 2X120 Setup, with defaults for blank fields.">
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Starting capital', formatCurrency(payload.setup.startingCapital)],
                  ['Target capital', formatCurrency(payload.setup.targetCapital)],
                  ['Trading days', payload.setup.tradingDays],
                  ['Profit threshold', `${payload.setup.profitThresholdPct}%`],
                  ['Daily hard stop', `${payload.setup.dailyLossLimitPct}%`],
                  ['Consecutive loss stop', payload.setup.maximumConsecutiveLosses],
                  ['Total losing-trade stop', payload.setup.maximumTotalLosingTrades],
                  ['Morning window', payload.setup.morningWindow],
                  ['Afternoon window', payload.setup.afternoonWindow]
                ].map(([label, value]) => <div key={String(label)} className="rounded-md border border-grid bg-panelSoft p-4"><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</dt><dd className="mt-2 text-lg font-bold text-white">{value}</dd></div>)}
              </dl>
            </SectionCard>
            <SectionCard title="Data export" subtitle="Exports contain the currently synced 2X in 120 rows.">
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" type="button" onClick={() => downloadText('tradewithnine-2x120.json', JSON.stringify(payload, null, 2), 'application/json')}>Export JSON</button>
              </div>
            </SectionCard>
          </div>
        ) : null}
      </div>
    </main>
  );
}
