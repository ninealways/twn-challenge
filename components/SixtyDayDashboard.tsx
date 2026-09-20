'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import BrandMark from '@/components/BrandMark';
import ChallengeToggle from '@/components/ChallengeToggle';
import MetricCard from '@/components/MetricCard';
import MonthlyCalendar from '@/components/MonthlyCalendar';
import ProgressBar from '@/components/ProgressBar';
import Reel2Maker from '@/components/Reel2Maker';
import ReelMaker from '@/components/ReelMaker';
import RuleBadge from '@/components/RuleBadge';
import SectionCard from '@/components/SectionCard';
import ShareCard from '@/components/ShareCard';
import { BRAND, CHALLENGE_DAYS, DEFAULT_INSTRUMENT, STARTING_CAPITAL } from '@/lib/constants';
import { buildMilestones, buildStats, chartRows, formatCurrency, getRuleBreaks, resultDistribution, sortEntries } from '@/lib/stats';
import {
  downloadText,
  entriesToCsv,
  loadEntries,
  loadLastSync,
  loadSheetUrl,
  saveEntries,
  saveLastSync,
  saveSheetUrl
} from '@/lib/storage';
import type { ChallengeEntry, ChallengeResult } from '@/types/challenge';

type Tab = 'dashboard' | 'entry' | 'log' | 'calendar' | 'analytics' | 'milestones' | 'share' | 'reel' | 'reel2';
type SortMode = 'dayAsc' | 'dayDesc' | 'dateAsc' | 'dateDesc';

const emptyEntry = (nextDay: number): ChallengeEntry => ({
  id: '',
  day: nextDay,
  date: new Date().toISOString().slice(0, 10),
  pnl: 0,
  result: 'Win',
  tradesTaken: 1,
  instrument: DEFAULT_INSTRUMENT,
  followedStopLoss: true,
  revengeTrade: false,
  followedMaxTrades: true,
  disciplineScore: 8,
  notes: '',
  mistakes: '',
  improveTomorrow: ''
});

const tabs: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'entry', label: 'Setup' },
  { id: 'log', label: 'Trade Log' },
  { id: 'share', label: 'Instagram' },
  { id: 'reel', label: 'Reel' },
  { id: 'reel2', label: 'Reel 2' }
];

function FormInput({
  label,
  children
}: Readonly<{
  label: string;
  children: React.ReactNode;
}>) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  );
}

function resultTone(result: ChallengeResult) {
  if (result === 'Win') return 'text-profit';
  if (result === 'Loss') return 'text-loss';
  return 'text-slate-200';
}

function buildCaption(entry: ChallengeEntry) {
  return `Day ${entry.day} of my 60 Day Trading Challenge is complete.

Daily P&L: ${formatCurrency(entry.pnl)}
Result: ${entry.result.toUpperCase()}
Trades Taken: ${entry.tradesTaken} / 2
Discipline Score: ${entry.disciplineScore} / 10

Today's lesson:
${entry.notes || 'Process first. Review the setup, execution, and risk.'}

Rules:
✅ NIFTY option buying only
✅ Max 2 trades per day
✅ Stop loss mandatory
✅ No revenge trading

This challenge is about discipline, not hype.

Educational Content Only | Trading Involves Risk`;
}

const hashtags =
  '#TradeWithNine #60DayChallenge #LiveTrading #NiftyOptions #OptionBuying #TradingChallenge #StockMarketIndia #TradingDiscipline #RiskManagement #PublicTradingJournal';

const chartColors = {
  panel: '#0d121a',
  grid: '#263241',
  muted: '#a7b0bf',
  profit: '#2fea7b',
  profitFill: '#2fea7b24',
  loss: '#ff5268',
  lossFill: '#ff526824',
  warning: '#f6c34a',
  neutral: '#e2e8f0',
  secondary: '#64748b'
};

const tooltipStyle = {
  background: chartColors.panel,
  border: `1px solid ${chartColors.grid}`,
  borderRadius: 8
};

export default function SixtyDayDashboard() {
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [filter, setFilter] = useState<'All' | ChallengeResult>('All');
  const [sortMode, setSortMode] = useState<SortMode>('dayAsc');
  const [shareEntryId, setShareEntryId] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetStatus, setSheetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [sheetMessage, setSheetMessage] = useState('');
  const [lastSync, setLastSync] = useState('');
  const [postStatus, setPostStatus] = useState('');
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedSheetUrl = loadSheetUrl();
    const cached = loadEntries();
    setSheetUrl(savedSheetUrl);
    setLastSync(loadLastSync());
    setEntries(cached);
    setShareEntryId(sortEntries(cached).at(-1)?.id || '');
    void refreshFromSheet(savedSheetUrl);
  }, []);

  async function refreshFromSheet(url = sheetUrl) {
    if (!url.trim()) {
      setSheetStatus('error');
      setSheetMessage('Add a Google Sheet URL first.');
      return;
    }

    try {
      setSheetStatus('loading');
      setSheetMessage('Refreshing from Google Sheet...');
      const response = await fetch(`/api/sheet?url=${encodeURIComponent(url.trim())}`);
      const payload = (await response.json()) as { entries?: ChallengeEntry[]; fetchedAt?: string; message?: string };
      if (!response.ok || !payload.entries) {
        throw new Error(payload.message || 'Could not load sheet.');
      }

      const loaded = sortEntries(payload.entries);
      setEntries(loaded);
      saveEntries(loaded);
      saveSheetUrl(url.trim());
      if (payload.fetchedAt) {
        setLastSync(payload.fetchedAt);
        saveLastSync(payload.fetchedAt);
      }
      setShareEntryId(sortEntries(loaded).at(-1)?.id || '');
      setSheetStatus('success');
      setSheetMessage(`Loaded ${loaded.length} row${loaded.length === 1 ? '' : 's'} from Google Sheet.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load sheet.';
      setSheetStatus('error');
      setSheetMessage(`${message} Showing the last cached data in this browser if available.`);
    }
  }

  const stats = useMemo(() => buildStats(entries), [entries]);
  const rows = useMemo(() => chartRows(entries), [entries]);
  const distribution = useMemo(() => resultDistribution(entries), [entries]);
  const milestones = useMemo(() => buildMilestones(entries), [entries]);
  const sortedEntries = useMemo(() => {
    const visible = filter === 'All' ? entries : entries.filter((entry) => entry.result === filter);
    return [...visible].sort((a, b) => {
      if (sortMode === 'dayDesc') return b.day - a.day;
      if (sortMode === 'dateAsc') return a.date.localeCompare(b.date);
      if (sortMode === 'dateDesc') return b.date.localeCompare(a.date);
      return a.day - b.day;
    });
  }, [entries, filter, sortMode]);
  const shareEntry = entries.find((entry) => entry.id === shareEntryId) || sortEntries(entries).at(-1);
  const shareCapital =
    shareEntry
      ? shareEntry.amountEnd ||
        STARTING_CAPITAL + sortEntries(entries).filter((entry) => entry.day <= shareEntry.day).reduce((sum, entry) => sum + entry.pnl, 0)
      : STARTING_CAPITAL;
  async function downloadShareCard() {
    if (!shareRef.current || !shareEntry) return;
    const dataUrl = await toPng(shareRef.current, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: '#050811'
    });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${BRAND}-day-${shareEntry.day}.png`;
    link.click();
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function prepareInstagramPost() {
    if (!shareEntry) return;
    setPostStatus('Preparing post...');
    await downloadShareCard();
    await copyText(`${buildCaption(shareEntry)}\n\nHashtags:\n${hashtags}`);
    window.open('https://www.instagram.com/trade_withnine/', '_blank', 'noopener,noreferrer');
    setPostStatus('PNG downloaded. Caption and hashtags copied. Instagram opened.');
  }

  return (
    <main className="min-h-screen bg-canvas text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6 lg:px-8">
        <nav className="sticky top-3 z-20 flex flex-col gap-3 rounded-lg border border-grid bg-panel/95 p-2 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between" aria-label="Dashboard sections">
          <div className="flex shrink-0 flex-wrap items-center gap-3 px-2 py-1">
            <BrandMark />
            <ChallengeToggle value="60day" />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-10 shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${
                  activeTab === tab.id ? 'bg-profit text-black' : 'bg-transparent text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {activeTab !== 'share' && activeTab !== 'reel' && activeTab !== 'reel2' ? (
          <header className="app-surface p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="sr-only">TradeWithNine 60 Day Trading Challenge</h1>
                <p className="max-w-3xl text-base leading-7 text-muted">
                  NIFTY 50 option buying only | Max 2 trades per day | Stop loss mandatory | No revenge trading |
                  Live trading window: 1:00-2:00 PM IST
                </p>
              </div>
              <div className="rounded-md border border-profit/30 bg-profit/10 px-4 py-3 text-base font-semibold text-profit">
                Process over profits. Discipline over hype.
              </div>
            </div>
          </header>
        ) : null}

        {activeTab === 'dashboard' ? (
          <div className="grid gap-5">
            <SectionCard title={`Day ${stats.currentDay} of ${CHALLENGE_DAYS}`} subtitle="Challenge completion">
              <div className="grid gap-4">
                <ProgressBar value={stats.completionPercentage} />
                <div className="flex justify-between text-sm font-medium text-muted">
                  <span>Day 1</span>
                  <span>{stats.completionPercentage.toFixed(1)}%</span>
                  <span>Day 60</span>
                </div>
              </div>
            </SectionCard>
            <article className="relative overflow-hidden rounded-lg border border-warning/70 bg-[#18150c] p-4 shadow-[0_0_28px_rgba(246,195,74,0.12)] md:p-5">
              <span className="absolute inset-x-0 top-0 h-1 bg-warning" />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-warning">Primary KPI</p>
                  <h3 className="mt-2 text-lg font-bold text-white">Average Discipline</h3>
                  <p className="mt-1 text-sm text-slate-400">Process quality across completed trading days</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-4xl font-black leading-none tabular-nums text-warning">{stats.averageDiscipline.toFixed(1)} <span className="text-xl text-amber-200/70">/ 10</span></p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full border border-warning/20 bg-black/40">
                <div className="h-full rounded-full bg-warning transition-all" style={{ width: `${Math.min(100, stats.averageDiscipline * 10)}%` }} />
              </div>
            </article>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Starting Capital" value={formatCurrency(stats.startingCapital)} />
              <MetricCard label="Current Capital" value={formatCurrency(stats.currentCapital)} tone={stats.netPnl >= 0 ? 'profit' : 'loss'} />
              <MetricCard label="Net P&L" value={formatCurrency(stats.netPnl)} tone={stats.netPnl >= 0 ? 'profit' : 'loss'} />
              <MetricCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
              <MetricCard label="Win Days" value={stats.winDays} tone="profit" />
              <MetricCard label="Loss Days" value={stats.lossDays} tone="loss" />
              <MetricCard label="Break-even Days" value={stats.breakEvenDays} />
              <MetricCard label="No Trade Days" value={stats.noTradeDays} />
              <MetricCard label="Average Profit Day" value={formatCurrency(stats.averageProfitDay)} tone="profit" />
              <MetricCard label="Average Loss Day" value={formatCurrency(stats.averageLossDay)} tone="loss" />
              <MetricCard label="Best Day" value={formatCurrency(stats.bestDay)} tone="profit" />
              <MetricCard label="Worst Day" value={formatCurrency(stats.worstDay)} tone="loss" />
              <MetricCard label="Current Streak" value={stats.currentStreak} />
              <MetricCard label="Max Drawdown" value={formatCurrency(stats.maxDrawdown)} tone="loss" />
              <MetricCard label="Rule Breaks" value={stats.ruleBreakCount} tone={stats.ruleBreakCount ? 'warning' : 'profit'} />
            </div>
          </div>
        ) : null}

        {activeTab === 'entry' ? (
          <div className="grid gap-5">
            <SectionCard title="Google Sheet setup" subtitle={lastSync ? `Last synced: ${new Date(lastSync).toLocaleString()}` : 'Use your sheet as the source of truth. The app caches the last successful sync.'}>
              <div className="grid gap-5">
                <div className="grid gap-3">
                  <FormInput label="Google Sheet URL">
                    <input className="field" value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} />
                  </FormInput>
                  <div className="flex flex-wrap gap-3">
                    <button className="btn-primary" type="button" onClick={() => refreshFromSheet()} disabled={sheetStatus === 'loading'}>
                      {sheetStatus === 'loading' ? 'Refreshing...' : 'Refresh From Sheet'}
                    </button>
                    <a className="btn-muted" href={sheetUrl} target="_blank" rel="noreferrer">
                      Open Google Sheet
                    </a>
                  </div>
                  {sheetMessage ? (
                    <p
                      className={`status-message ${
                        sheetStatus === 'success'
                          ? 'border-profit/30 bg-profit/10 text-profit'
                          : sheetStatus === 'error'
                            ? 'border-loss/30 bg-loss/10 text-loss'
                            : 'border-grid bg-slate-900 text-slate-300'
                      }`}
                    >
                      {sheetMessage}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-grid bg-panelSoft p-4 text-base text-slate-300">
                  <h3 className="text-base font-bold text-white">Recommended sheet headers</h3>
                  <p className="mt-2 leading-7">
                    Date, Amount Start, Profit/Loss, Brokerage/tax, Amount End, Profit Day, Live Trade Day,
                    Discipline with S/L, Comments
                  </p>
                  <p className="mt-3 leading-7 text-warning">
                    Optional for richer posts: Screenshot URL, Result, Trades Taken, Instrument, Mistakes, Improve Tomorrow.
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Data Export" subtitle="Google Sheets is the source of truth. Exports use the currently synced rows.">
              <div className="grid gap-4 md:grid-cols-3">
                <button className="btn-primary" type="button" onClick={() => downloadText('tradewithnine-data.json', JSON.stringify(entries, null, 2), 'application/json')}>
                  Export JSON
                </button>
                <button className="btn-muted" type="button" onClick={() => downloadText('tradewithnine-trade-log.csv', entriesToCsv(sortEntries(entries)), 'text/csv')}>
                  Export CSV Trade Log
                </button>
                <button className="btn-muted" type="button" onClick={() => refreshFromSheet()}>
                  Refresh Google Sheet
                </button>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'log' ? (
          <SectionCard title="Trade Log Table" subtitle="Read-only view from your Google Sheet. Edit rows directly in Google Sheets, then refresh.">
            <div className="mb-5 flex flex-wrap gap-3">
              <select className="field w-auto" value={filter} onChange={(event) => setFilter(event.target.value as 'All' | ChallengeResult)}>
                <option>All</option>
                <option>Win</option>
                <option>Loss</option>
                <option>Break-even</option>
                <option>No Trade</option>
              </select>
              <select className="field w-auto" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                <option value="dayAsc">Day ascending</option>
                <option value="dayDesc">Day descending</option>
                <option value="dateAsc">Date ascending</option>
                <option value="dateDesc">Date descending</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-separate border-spacing-y-2 text-left text-sm tabular-nums">
                <thead className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  <tr>
                    <th>Day</th>
                    <th>Date</th>
                    <th>P&L</th>
                    <th>Result</th>
                    <th>Trades</th>
                    <th>Discipline</th>
                    <th>Rules followed</th>
                    <th>Notes</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry) => {
                    const breaks = getRuleBreaks(entry);
                    return (
                      <tr key={entry.id} className="rounded-lg bg-panelSoft transition hover:bg-slate-800/70">
                        <td className="rounded-l-lg p-3 font-bold">D{entry.day}</td>
                        <td className="p-3 text-slate-300">{entry.date}</td>
                        <td className={`p-3 font-bold ${entry.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(entry.pnl)}</td>
                        <td className={`p-3 font-bold ${resultTone(entry.result)}`}>{entry.result}</td>
                        <td className="p-3">{entry.tradesTaken} / 2</td>
                        <td className="p-3">{entry.disciplineScore} / 10</td>
                        <td className="p-3">{breaks.length ? <span className="text-loss">{breaks.length} break(s)</span> : <span className="text-profit">Yes</span>}</td>
                        <td className="max-w-xs truncate p-3 text-slate-300">{entry.notes}</td>
                        <td className="rounded-r-lg p-3">
                          <a className="btn-small inline-flex" href={sheetUrl} target="_blank" rel="noreferrer">Sheet</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        ) : null}

        {activeTab === 'calendar' ? <MonthlyCalendar entries={entries} /> : null}

        {activeTab === 'analytics' ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartPanel title="Equity Curve"><AreaChart data={rows}><CartesianGrid stroke={chartColors.grid} /><XAxis dataKey="day" stroke={chartColors.muted} /><YAxis stroke={chartColors.muted} /><Tooltip contentStyle={tooltipStyle} /><Area dataKey="equity" stroke={chartColors.profit} fill={chartColors.profitFill} /></AreaChart></ChartPanel>
            <ChartPanel title="Daily P&L"><BarChart data={rows}><CartesianGrid stroke={chartColors.grid} /><XAxis dataKey="day" stroke={chartColors.muted} /><YAxis stroke={chartColors.muted} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="pnl">{rows.map((row) => <Cell key={row.day} fill={row.pnl >= 0 ? chartColors.profit : chartColors.loss} />)}</Bar></BarChart></ChartPanel>
            <ChartPanel title="Win/Loss Distribution"><PieChart><Tooltip contentStyle={tooltipStyle} /><Pie data={distribution} dataKey="value" nameKey="name" outerRadius={110} label>{distribution.map((item) => <Cell key={item.name} fill={item.name === 'Win' ? chartColors.profit : item.name === 'Loss' ? chartColors.loss : item.name === 'Break-even' ? chartColors.neutral : chartColors.secondary} />)}</Pie></PieChart></ChartPanel>
            <ChartPanel title="Discipline Score Trend"><LineChart data={rows}><CartesianGrid stroke={chartColors.grid} /><XAxis dataKey="day" stroke={chartColors.muted} /><YAxis domain={[0, 10]} stroke={chartColors.muted} /><Tooltip contentStyle={tooltipStyle} /><Line dataKey="discipline" stroke={chartColors.profit} strokeWidth={3} /></LineChart></ChartPanel>
            <ChartPanel title="Drawdown Chart"><AreaChart data={rows}><CartesianGrid stroke={chartColors.grid} /><XAxis dataKey="day" stroke={chartColors.muted} /><YAxis stroke={chartColors.muted} /><Tooltip contentStyle={tooltipStyle} /><Area dataKey="drawdown" stroke={chartColors.loss} fill={chartColors.lossFill} /></AreaChart></ChartPanel>
            <ChartPanel title="Rule Breaks Over Time"><BarChart data={rows}><CartesianGrid stroke={chartColors.grid} /><XAxis dataKey="day" stroke={chartColors.muted} /><YAxis allowDecimals={false} stroke={chartColors.muted} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="ruleBreaks" fill={chartColors.warning} /></BarChart></ChartPanel>
          </div>
        ) : null}

        {activeTab === 'milestones' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {milestones.map((milestone) => (
              <section key={milestone.day} className={`rounded-lg border p-5 ${milestone.status === 'Reached' ? 'border-profit/40 bg-profit/10' : 'border-grid bg-panel'}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold leading-tight">Day {milestone.day}</h2>
                  <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-bold ${milestone.status === 'Reached' ? 'border-profit/30 bg-profit/10 text-profit' : 'border-grid bg-panelSoft text-muted'}`}>{milestone.status}</span>
                </div>
                <div className="mt-4 grid gap-3 text-base text-slate-300">
                  <p>Capital: <strong className="text-white">{formatCurrency(milestone.capital)}</strong></p>
                  <p>Net P&L: <strong className={milestone.netPnl >= 0 ? 'text-profit' : 'text-loss'}>{formatCurrency(milestone.netPnl)}</strong></p>
                  <p>Win rate: <strong className="text-white">{milestone.winRate.toFixed(1)}%</strong></p>
                  <p>Avg discipline: <strong className="text-white">{milestone.averageDiscipline.toFixed(1)} / 10</strong></p>
                  <p className="border-t border-grid pt-3 leading-7 text-muted">Biggest lesson: {milestone.biggestLesson}</p>
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {activeTab === 'share' && shareEntry ? (
          <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
            <SectionCard title="Instagram Share Card" subtitle="Preview a 9:16 daily card and export it as PNG.">
              <div className="grid justify-center gap-4">
                <select className="field" value={shareEntry.id} onChange={(event) => setShareEntryId(event.target.value)}>
                  {sortEntries(entries).map((entry) => (
                    <option key={entry.id} value={entry.id}>Day {entry.day} - {entry.result} - {formatCurrency(entry.pnl)}</option>
                  ))}
                </select>
                <div ref={shareRef}>
                  <ShareCard entry={shareEntry} currentCapital={shareCapital} />
                </div>
                <button className="btn-primary" type="button" onClick={downloadShareCard}>Download PNG</button>
                <button className="btn-muted" type="button" onClick={prepareInstagramPost}>Post to Instagram</button>
                {postStatus ? <p className="text-center text-sm font-medium text-muted">{postStatus}</p> : null}
              </div>
            </SectionCard>
            <SectionCard title="Instagram Caption Generator" subtitle="Copy caption and hashtags for the selected day.">
              <div className="grid gap-4">
                <textarea className="field min-h-80" readOnly value={`${buildCaption(shareEntry)}\n\nHashtags:\n${hashtags}`} />
                <div className="flex flex-wrap gap-3">
                  <button className="btn-primary" type="button" onClick={() => copyText(buildCaption(shareEntry))}>Copy Instagram Caption</button>
                  <button className="btn-muted" type="button" onClick={() => copyText(hashtags)}>Copy Hashtags</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <RuleBadge ok={shareEntry.followedStopLoss} label="Stop loss" />
                  <RuleBadge ok={!shareEntry.revengeTrade} label="No revenge" />
                  <RuleBadge ok={shareEntry.followedMaxTrades && shareEntry.tradesTaken <= 2} label="Max 2 trades" />
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'reel' ? <ReelMaker entries={entries} /> : null}

        {activeTab === 'reel2' ? <Reel2Maker entries={entries} /> : null}

      </div>
    </main>
  );
}

function ChartPanel({ title, children }: Readonly<{ title: string; children: React.ReactElement }>) {
  return (
    <SectionCard title={title}>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
