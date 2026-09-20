'use client';

import { useEffect, useMemo, useState } from 'react';
import MetricCard from '@/components/MetricCard';
import SectionCard from '@/components/SectionCard';
import { STARTING_CAPITAL } from '@/lib/constants';
import { formatCurrency, getRuleBreaks, sortEntries } from '@/lib/stats';
import type { ChallengeEntry } from '@/types/challenge';

type MonthlyCalendarProps = {
  entries: ChallengeEntry[];
};

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function calendarDays(key: string) {
  const [year, month] = key.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const days: Array<Date | null> = [];
  const startOffset = first.getDay();
  for (let index = 0; index < startOffset; index += 1) days.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) days.push(new Date(year, month - 1, day));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function resultStyles(entry?: ChallengeEntry, isWeekend = false) {
  if (isWeekend) return 'border-slate-800 bg-slate-950/80 text-slate-600';
  if (!entry) return 'border-grid bg-panel text-muted';
  if (entry.result === 'Win') return 'border-profit/45 bg-profit/10 text-profit';
  if (entry.result === 'Loss') return 'border-loss/45 bg-loss/10 text-loss';
  if (entry.result === 'No Trade') return 'border-grid bg-slate-900/70 text-slate-400';
  return 'border-info/45 bg-info/10 text-info';
}

export default function MonthlyCalendar({ entries }: MonthlyCalendarProps) {
  const sorted = useMemo(() => sortEntries(entries), [entries]);
  const months = useMemo(() => Array.from(new Set(sorted.map((entry) => monthKey(entry.date)))).sort(), [sorted]);
  const [activeMonth, setActiveMonth] = useState(months.at(-1) || new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (months.length && !months.includes(activeMonth)) setActiveMonth(months.at(-1) || activeMonth);
  }, [activeMonth, months]);

  const monthEntries = sorted.filter((entry) => monthKey(entry.date) === activeMonth);
  const entriesByDate = new Map(monthEntries.map((entry) => [entry.date, entry]));
  const monthPnl = monthEntries.reduce((sum, entry) => sum + entry.pnl, 0);
  const winDays = monthEntries.filter((entry) => entry.result === 'Win').length;
  const lossDays = monthEntries.filter((entry) => entry.result === 'Loss').length;
  const ruleBreaks = monthEntries.reduce((sum, entry) => sum + getRuleBreaks(entry).length, 0);
  const avgDiscipline = average(monthEntries.map((entry) => entry.disciplineScore));
  const latestCapital = [...monthEntries].reverse().find((entry) => entry.amountEnd && entry.amountEnd > 0)?.amountEnd;
  const capital = latestCapital || STARTING_CAPITAL + sorted.filter((entry) => entry.date <= `${activeMonth}-31`).reduce((sum, entry) => sum + entry.pnl, 0);

  return (
    <div className="grid gap-5">
      <SectionCard title={`${monthLabel(activeMonth)} Calendar`} subtitle="Daily challenge progress from your synced Google Sheet.">
        {months.length > 1 ? (
          <div className="mb-5 max-w-xs">
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              <span>Month</span>
              <select className="field" value={activeMonth} onChange={(event) => setActiveMonth(event.target.value)}>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {monthLabel(month)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Month P&L" value={formatCurrency(monthPnl)} tone={monthPnl >= 0 ? 'profit' : 'loss'} />
          <MetricCard label="Current Capital" value={formatCurrency(capital)} tone={capital >= STARTING_CAPITAL ? 'profit' : 'loss'} />
          <MetricCard label="Win Days" value={winDays} tone="profit" />
          <MetricCard label="Loss Days" value={lossDays} tone="loss" />
          <MetricCard label="Avg Discipline" value={`${avgDiscipline.toFixed(1)} / 10`} tone={ruleBreaks ? 'warning' : 'profit'} />
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <div
              key={day}
              className={`px-2 py-1 text-center text-xs font-bold uppercase tracking-[0.14em] ${
                index === 0 || index === 6 ? 'text-slate-600' : 'text-muted'
              }`}
            >
              {day}
            </div>
          ))}
          {calendarDays(activeMonth).map((date, index) => {
            const key = date ? isoDate(date) : `empty-${index}`;
            const entry = date ? entriesByDate.get(key) : undefined;
            const isWeekend = Boolean(date && (date.getDay() === 0 || date.getDay() === 6));
            return (
              <article key={key} className={`min-h-32 rounded-lg border p-3 ${resultStyles(entry, isWeekend)}`}>
                {date ? (
                  <div className="grid h-full content-between gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm font-bold ${isWeekend ? 'text-slate-600' : 'text-slate-300'}`}>{date.getDate()}</span>
                      {entry ? <span className="text-[10px] font-black uppercase tracking-[0.12em]">D{entry.day}</span> : null}
                    </div>
                    {entry ? (
                      <div className="grid gap-1">
                        <p className="text-lg font-black leading-tight tabular-nums">{formatCurrency(entry.pnl)}</p>
                        {entry.result === 'Break-even' || entry.result === 'No Trade' ? (
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{entry.result}</p>
                        ) : null}
                        <p className="text-xs font-semibold text-slate-400">Discipline {entry.disciplineScore}/10</p>
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-slate-600">{isWeekend ? 'No trade day' : 'No entry'}</p>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
