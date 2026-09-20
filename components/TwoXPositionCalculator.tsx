'use client';

import { useEffect, useMemo, useState } from 'react';
import SectionCard from '@/components/SectionCard';
import { formatCurrency } from '@/lib/stats';
import { calculatePositionSize, TWO_X_LOT_SIZE } from '@/lib/twoXPositionSizing';

type TwoXPositionCalculatorProps = {
  currentCapital: number;
  dailyLossLimitPct: number;
  consecutiveLossLimit: number;
};

const standardStops = [5, 10, 15, 20, 25, 30];

function numericValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function lotsLabel(value: number) {
  return `${value} lot${value === 1 ? '' : 's'}`;
}

export default function TwoXPositionCalculator({
  currentCapital,
  dailyLossLimitPct,
  consecutiveLossLimit
}: TwoXPositionCalculatorProps) {
  const defaultRiskPct = dailyLossLimitPct;
  const [optionType, setOptionType] = useState<'CALL' | 'PUT'>('CALL');
  const [capital, setCapital] = useState(currentCapital);
  const [optionPrice, setOptionPrice] = useState(100);
  const [riskPct, setRiskPct] = useState(defaultRiskPct);
  const [customStop, setCustomStop] = useState(12);

  useEffect(() => setCapital(currentCapital), [currentCapital]);
  useEffect(() => setRiskPct(defaultRiskPct), [defaultRiskPct]);

  const dailyHardStop = capital * (dailyLossLimitPct / 100);
  const riskBudget = capital * (riskPct / 100);
  const premiumPerLot = optionPrice * TWO_X_LOT_SIZE;
  const idealSizing = calculatePositionSize({
    capital,
    optionPrice,
    riskPct,
    dailyLossLimitPct,
    consecutiveLossLimit,
    stopPoints: customStop
  });
  const stopDistances = useMemo(
    () => Array.from(new Set([...standardStops, customStop])).filter((value) => value > 0).sort((a, b) => a - b),
    [customStop]
  );
  const rows = stopDistances.map((stopPoints) => calculatePositionSize({
    capital,
    optionPrice,
    riskPct,
    dailyLossLimitPct,
    consecutiveLossLimit,
    stopPoints
  }));

  return (
    <div className="grid gap-5">
      <SectionCard
        title="Option position calculator"
        subtitle="Calculate the maximum lots allowed by both the per-trade risk budget and the available premium capital. Lot size is fixed at 65 units."
      >
        <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-2 block text-sm font-bold text-slate-300">Option type</span>
              <div className="grid grid-cols-2 rounded-md border border-grid bg-[#0a1018] p-1" role="group" aria-label="Option type">
                {(['CALL', 'PUT'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOptionType(type)}
                    className={`min-h-10 rounded px-3 text-sm font-black transition ${optionType === type ? 'bg-profit text-black' : 'text-slate-300 hover:bg-slate-800'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              <span>{optionType} premium</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">₹</span>
                <input className="field pl-8 tabular-nums" type="number" min="0" step="0.05" value={optionPrice} onChange={(event) => setOptionPrice(numericValue(event.target.value))} />
              </div>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              <span>Available capital</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">₹</span>
                <input className="field pl-8 tabular-nums" type="number" min="0" step="100" value={capital} onChange={(event) => setCapital(numericValue(event.target.value))} />
              </div>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              <span>Risk budget per trade</span>
              <div className="relative">
                <input className="field pr-8 tabular-nums" type="number" min="0" max={dailyLossLimitPct} step="0.1" value={riskPct} onChange={(event) => setRiskPct(numericValue(event.target.value))} />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">%</span>
              </div>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-300 sm:col-span-2">
              <span>Custom stop-loss distance</span>
              <div className="relative sm:max-w-xs">
                <input className="field pr-16 tabular-nums" type="number" min="0.5" step="0.5" value={customStop} onChange={(event) => setCustomStop(numericValue(event.target.value))} />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">points</span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-info/35 bg-info/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Lot size</p>
              <p className="mt-2 text-2xl font-black text-info">{TWO_X_LOT_SIZE} units</p>
            </div>
            <div className="rounded-md border border-grid bg-panelSoft p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Premium per lot</p>
              <p className="mt-2 text-2xl font-black text-white">{formatCurrency(premiumPerLot)}</p>
            </div>
            <div className="rounded-md border border-warning/40 bg-warning/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Per-trade budget</p>
              <p className="mt-2 text-2xl font-black text-warning">{formatCurrency(riskBudget)}</p>
            </div>
            <div className="rounded-md border border-loss/40 bg-loss/10 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Daily hard stop</p>
              <p className="mt-2 text-2xl font-black text-loss">{formatCurrency(dailyHardStop)}</p>
            </div>
            <div className={`col-span-2 rounded-md border p-4 ${idealSizing.maxLots > 0 ? 'border-profit/45 bg-profit/10' : 'border-loss/45 bg-loss/10'}`}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Ideal trade size</p>
                  <p className="mt-2 text-sm text-slate-300">For a {customStop}-point SL at a {formatCurrency(optionPrice)} premium</p>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-black ${idealSizing.maxLots > 0 ? 'text-profit' : 'text-loss'}`}>{lotsLabel(idealSizing.maxLots)}</p>
                  <p className="mt-1 text-sm font-bold text-slate-300">{idealSizing.quantity} units · {formatCurrency(idealSizing.capitalRequired)}</p>
                </div>
              </div>
              <p className={`mt-3 border-t pt-3 text-xs font-bold ${idealSizing.withinDailyHardStop ? 'border-profit/20 text-profit' : 'border-loss/25 text-loss'}`}>
                {idealSizing.withinDailyHardStop
                  ? `${consecutiveLossLimit} full SL hits remain within the ${dailyLossLimitPct}% daily hard stop.`
                  : `Do not repeat this size after a stopped trade: ${consecutiveLossLimit} full SL hits would exceed the ${dailyLossLimitPct}% daily hard stop.`}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={`${optionType} sizing by stop-loss distance`}
        subtitle={`Maximum lots = the lower of risk-limited lots and capital-affordable lots. The current ${riskPct.toFixed(1)}% per-trade setting is checked against ${consecutiveLossLimit} full stop-loss trades and the ${dailyLossLimitPct}% daily hard stop.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm tabular-nums">
            <thead className="border-b border-grid text-xs font-bold uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="pb-3">SL distance</th>
                <th className="pb-3">SL price</th>
                <th className="pb-3">Risk / lot</th>
                <th className="pb-3">Risk cap</th>
                <th className="pb-3">Affordable</th>
                <th className="pb-3">Ideal lots</th>
                <th className="pb-3">Quantity</th>
                <th className="pb-3">Capital used</th>
                <th className="pb-3">Max loss</th>
                <th className="pb-3">{consecutiveLossLimit}-SL exposure</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isCustom = row.stopPoints === customStop && !standardStops.includes(customStop);
                return (
                  <tr key={row.stopPoints} className={`border-b border-grid/70 ${isCustom ? 'bg-info/5' : ''}`}>
                    <td className="py-4 font-black text-white">{row.stopPoints} pts {isCustom ? <span className="ml-1 text-xs text-info">Custom</span> : null}</td>
                    <td className="py-4">{row.validStop ? formatCurrency(row.stopPrice) : <span className="text-loss">Invalid</span>}</td>
                    <td className="py-4">{formatCurrency(row.riskPerLot)}</td>
                    <td className="py-4">{lotsLabel(row.riskLimitedLots)}</td>
                    <td className="py-4">{lotsLabel(row.affordableLots)}</td>
                    <td className="py-4"><span className={`inline-flex min-w-16 justify-center rounded-md border px-3 py-2 text-lg font-black ${row.maxLots > 0 ? 'border-profit/40 bg-profit/10 text-profit' : 'border-loss/40 bg-loss/10 text-loss'}`}>{row.maxLots}</span></td>
                    <td className="py-4 font-bold">{row.quantity}</td>
                    <td className="py-4">{formatCurrency(row.capitalRequired)}</td>
                    <td className="py-4 font-bold text-warning">{formatCurrency(row.maxLoss)}</td>
                    <td className={`py-4 font-bold ${row.withinDailyHardStop ? 'text-profit' : 'text-loss'}`}>{formatCurrency(row.consecutiveLossExposure)} · {row.withinDailyHardStop ? 'Within limit' : 'Over limit'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 border-t border-grid pt-4 text-xs leading-5 text-muted">
          This is a mechanical position-size estimate. It does not include slippage, gap risk, taxes, brokerage, exchange charges, or broker-specific margin requirements.
        </p>
      </SectionCard>
    </div>
  );
}
