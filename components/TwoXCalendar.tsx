'use client';

import { useEffect, useMemo, useState } from 'react';
import SectionCard from '@/components/SectionCard';
import { formatCurrency } from '@/lib/stats';
import type { TwoXDailyEntry, TwoXSetup, TwoXTrade } from '@/types/twoXChallenge';

type TwoXCalendarProps = {
  daily: TwoXDailyEntry[];
  trades: TwoXTrade[];
  setup: TwoXSetup;
};

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function shiftMonth(key: string, offset: number) {
  const [year, month] = key.split('-').map(Number);
  const shifted = new Date(year, month - 1 + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function calendarDays(key: string) {
  const [year, month] = key.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const days: Array<Date | null> = [];
  const mondayFirstOffset = (first.getDay() + 6) % 7;

  for (let index = 0; index < mondayFirstOffset; index += 1) days.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) days.push(new Date(year, month - 1, day));
  while (days.length % 7 !== 0) days.push(null);

  return days;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function entryTone(entry?: TwoXDailyEntry, weekend = false) {
  if (weekend) return 'border-slate-800 bg-[#080b11] text-slate-600';
  if (!entry) return 'border-grid bg-panelSoft/55 text-muted';
  if (entry.pnl > 0) return 'border-profit/45 bg-profit/10';
  if (entry.pnl < 0) return 'border-loss/45 bg-loss/10';
  return 'border-info/40 bg-info/10';
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

export default function TwoXCalendar({ daily, trades, setup }: TwoXCalendarProps) {
  const sortedDaily = useMemo(() => [...daily].sort((a, b) => a.date.localeCompare(b.date) || a.day - b.day), [daily]);
  const latestMonth = sortedDaily.at(-1)?.date.slice(0, 7) || new Date().toISOString().slice(0, 7);
  const [activeMonth, setActiveMonth] = useState(latestMonth);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (!selectedDate || monthKey(selectedDate) !== activeMonth) {
      const latestInMonth = [...sortedDaily].reverse().find((entry) => monthKey(entry.date) === activeMonth);
      setSelectedDate(latestInMonth?.date || '');
    }
  }, [activeMonth, selectedDate, sortedDaily]);

  const monthEntries = useMemo(
    () => sortedDaily.filter((entry) => monthKey(entry.date) === activeMonth),
    [activeMonth, sortedDaily]
  );
  const entriesByDate = useMemo(() => new Map(monthEntries.map((entry) => [entry.date, entry])), [monthEntries]);
  const monthDayNumbers = useMemo(() => new Set(monthEntries.map((entry) => entry.day)), [monthEntries]);
  const monthTrades = useMemo(
    () => trades.filter((trade) => monthKey(trade.date) === activeMonth || monthDayNumbers.has(trade.day)),
    [activeMonth, monthDayNumbers, trades]
  );
  const tradesByDay = useMemo(() => {
    const grouped = new Map<number, TwoXTrade[]>();
    monthTrades.forEach((trade) => grouped.set(trade.day, [...(grouped.get(trade.day) || []), trade]));
    return grouped;
  }, [monthTrades]);

  const monthPnl = monthEntries.reduce((sum, entry) => sum + entry.pnl, 0);
  const firstOpening = monthEntries.find((entry) => entry.opening > 0)?.opening || setup.startingCapital;
  const monthReturn = firstOpening ? (monthPnl / firstOpening) * 100 : 0;
  const latestClosing = [...monthEntries].reverse().find((entry) => entry.closing > 0)?.closing || firstOpening + monthPnl;
  const averageDiscipline = average(monthEntries.map((entry) => entry.discipline));
  const compliantDays = monthEntries.filter((entry) => entry.rulesFollowed && entry.stopLossAllTrades).length;
  const selectedEntry = entriesByDate.get(selectedDate);
  const selectedTrades = selectedEntry ? tradesByDay.get(selectedEntry.day) || [] : [];
  const selectedDayReturn = selectedEntry?.opening ? (selectedEntry.pnl / selectedEntry.opening) * 100 : 0;

  return (
    <div className="grid gap-5">
      <SectionCard
        title={`${monthLabel(activeMonth)} progress`}
        subtitle="Capital growth and process quality by trading day. Select a completed day to inspect its trades."
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-small" type="button" onClick={() => setActiveMonth(shiftMonth(activeMonth, -1))} aria-label="Previous month">Previous</button>
            <input
              className="field min-h-9 w-40 py-1 text-sm"
              type="month"
              value={activeMonth}
              onChange={(event) => setActiveMonth(event.target.value)}
              aria-label="Calendar month"
            />
            <button className="btn-small" type="button" onClick={() => setActiveMonth(shiftMonth(activeMonth, 1))} aria-label="Next month">Next</button>
          </div>
        }
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            ['Month P&L', formatCurrency(monthPnl), monthPnl >= 0 ? 'text-profit' : 'text-loss'],
            ['Month return', `${monthReturn >= 0 ? '+' : ''}${monthReturn.toFixed(2)}%`, monthReturn >= 0 ? 'text-profit' : 'text-loss'],
            ['Closing capital', formatCurrency(latestClosing), 'text-white'],
            ['Trading days', String(monthEntries.length), 'text-white'],
            ['Total trades', String(monthTrades.length), 'text-info'],
            ['Avg discipline', `${averageDiscipline.toFixed(1)} / 10`, averageDiscipline >= 9 ? 'text-warning' : 'text-white']
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-md border border-grid bg-panelSoft px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
              <p className={`mt-1 text-lg font-black tabular-nums ${tone}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-muted">
          <span><strong className="text-profit">{compliantDays}</strong> compliant day{compliantDays === 1 ? '' : 's'}</span>
          <span><strong className="text-warning">{monthEntries.length - compliantDays}</strong> day{monthEntries.length - compliantDays === 1 ? '' : 's'} to review</span>
          <span>Green/red shows positive/negative daily P&amp;L</span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[980px]">
            <div className="mb-2 grid grid-cols-7 gap-2">
              {weekdays.map((weekday) => (
                <div key={weekday} className={`px-2 py-1 text-center text-xs font-black uppercase tracking-[0.14em] ${weekday === 'Sat' || weekday === 'Sun' ? 'text-slate-600' : 'text-muted'}`}>
                  {weekday}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays(activeMonth).map((date, index) => {
                if (!date) return <div key={`empty-${index}`} className="min-h-40" />;

                const dateKey = isoDate(date);
                const entry = entriesByDate.get(dateKey);
                const weekend = date.getDay() === 0 || date.getDay() === 6;
                const dayTrades = entry ? tradesByDay.get(entry.day) || [] : [];
                const dayReturn = entry?.opening ? (entry.pnl / entry.opening) * 100 : 0;
                const selected = selectedDate === dateKey;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={!entry}
                    onClick={() => setSelectedDate(dateKey)}
                    className={`min-h-40 rounded-md border p-3 text-left transition ${entryTone(entry, weekend)} ${selected ? 'ring-2 ring-warning ring-offset-2 ring-offset-panel' : ''} ${entry ? 'hover:-translate-y-0.5 hover:border-warning/70' : 'cursor-default'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-black ${weekend ? 'text-slate-600' : 'text-slate-200'}`}>{date.getDate()}</span>
                      {entry ? <span className="text-xs font-black text-white">D{entry.day}</span> : null}
                    </div>
                    {entry ? (
                      <div className="mt-5 grid gap-1.5">
                        <p className={`text-xl font-black tabular-nums ${entry.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(entry.pnl)}</p>
                        <p className={`text-xs font-bold tabular-nums ${entry.pnl >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{dayReturn >= 0 ? '+' : ''}{dayReturn.toFixed(2)}%</p>
                        <p className="text-xs font-semibold text-slate-300">Capital {formatCurrency(entry.closing)}</p>
                        <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-xs font-bold">
                          <span>{dayTrades.length} trade{dayTrades.length === 1 ? '' : 's'}</span>
                          <span className={entry.discipline >= 9 ? 'text-warning' : 'text-slate-300'}>{entry.discipline}/10</span>
                        </div>
                        <p className={`text-[11px] font-bold uppercase ${entry.rulesFollowed && entry.stopLossAllTrades ? 'text-profit' : 'text-warning'}`}>
                          {entry.rulesFollowed && entry.stopLossAllTrades ? 'Rules followed' : 'Review rules'}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-20 text-xs font-semibold">{weekend ? 'Market closed' : 'No entry'}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SectionCard>

      {selectedEntry ? (
        <SectionCard
          title={`Day ${selectedEntry.day} · ${formatDate(selectedEntry.date)}`}
          subtitle={selectedEntry.notes || 'No notes recorded for this trading day.'}
          actions={selectedEntry.screenshotUrl ? <a className="btn-small" href={selectedEntry.screenshotUrl} target="_blank" rel="noreferrer">Open screenshot</a> : undefined}
        >
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-grid bg-panelSoft p-4 text-sm">
              <div><dt className="text-xs font-bold uppercase text-muted">Net P&amp;L</dt><dd className={`mt-1 text-xl font-black ${selectedEntry.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(selectedEntry.pnl)}</dd></div>
              <div><dt className="text-xs font-bold uppercase text-muted">Daily return</dt><dd className={`mt-1 text-xl font-black ${selectedDayReturn >= 0 ? 'text-profit' : 'text-loss'}`}>{selectedDayReturn >= 0 ? '+' : ''}{selectedDayReturn.toFixed(2)}%</dd></div>
              <div><dt className="text-xs font-bold uppercase text-muted">Opening</dt><dd className="mt-1 font-bold">{formatCurrency(selectedEntry.opening)}</dd></div>
              <div><dt className="text-xs font-bold uppercase text-muted">Closing</dt><dd className="mt-1 font-bold">{formatCurrency(selectedEntry.closing)}</dd></div>
              <div><dt className="text-xs font-bold uppercase text-muted">Discipline</dt><dd className="mt-1 font-bold text-warning">{selectedEntry.discipline} / 10</dd></div>
              <div><dt className="text-xs font-bold uppercase text-muted">Trading window</dt><dd className="mt-1 font-bold">{selectedEntry.tradingWindows || 'Not recorded'}</dd></div>
            </dl>

            <div className="overflow-x-auto">
              {selectedTrades.length ? (
                <table className="w-full min-w-[720px] text-left text-sm tabular-nums">
                  <thead className="border-b border-grid text-xs font-bold uppercase tracking-[0.1em] text-muted">
                    <tr><th className="pb-3">Trade</th><th className="pb-3">Time</th><th className="pb-3">Contract</th><th className="pb-3">P&amp;L</th><th className="pb-3">SL</th><th className="pb-3">Exit</th><th className="pb-3">Rules</th></tr>
                  </thead>
                  <tbody>
                    {selectedTrades.map((trade) => (
                      <tr key={trade.id} className="border-b border-grid/70">
                        <td className="py-3 font-black">T{trade.tradeNumber}</td>
                        <td className="py-3 text-slate-300">{trade.entryTime}–{trade.exitTime}</td>
                        <td className="py-3">{trade.optionType} {trade.strike || ''}</td>
                        <td className={`py-3 font-black ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(trade.pnl)}</td>
                        <td className={`py-3 font-bold ${trade.stopLossPlaced ? 'text-profit' : 'text-loss'}`}>{trade.stopLossPlaced ? 'Placed' : 'Missing'}</td>
                        <td className="py-3">{trade.exitReason || 'Not recorded'}</td>
                        <td className={`py-3 font-bold ${trade.rulesFollowed && !trade.revengeTrade ? 'text-profit' : 'text-warning'}`}>{trade.rulesFollowed && !trade.revengeTrade ? 'Followed' : 'Review'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="rounded-md border border-grid bg-panelSoft p-4 text-sm text-muted">No individual trades are linked to this day yet.</p>}
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
