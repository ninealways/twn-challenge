import BrandMark from '@/components/BrandMark';
import { CHALLENGE_DAYS, STARTING_CAPITAL } from '@/lib/constants';
import { formatCurrency, getRuleBreaks } from '@/lib/stats';
import type { ChallengeEntry } from '@/types/challenge';

type ShareCardProps = {
  entry: ChallengeEntry;
  currentCapital: number;
};

const milestones = [10, 20, 30, 40, 50, 60];

function MarketBackdrop({ trend }: { trend: 'bullish' | 'bearish' | 'flat' }) {
  const candles =
    trend === 'bearish'
      ? [
          { x: 28, y: 170, h: 36, red: true },
          { x: 58, y: 218, h: 42, red: true },
          { x: 88, y: 196, h: 32, red: false },
          { x: 118, y: 266, h: 52, red: true },
          { x: 148, y: 308, h: 40, red: true },
          { x: 178, y: 286, h: 36, red: false },
          { x: 208, y: 352, h: 48, red: true },
          { x: 238, y: 330, h: 34, red: false },
          { x: 268, y: 404, h: 58, red: true },
          { x: 298, y: 382, h: 38, red: false },
          { x: 328, y: 456, h: 54, red: true }
        ]
      : trend === 'bullish'
        ? [
            { x: 28, y: 456, h: 44, red: false },
            { x: 58, y: 424, h: 34, red: true },
            { x: 88, y: 388, h: 46, red: false },
            { x: 118, y: 356, h: 36, red: false },
            { x: 148, y: 334, h: 34, red: true },
            { x: 178, y: 292, h: 52, red: false },
            { x: 208, y: 266, h: 36, red: true },
            { x: 238, y: 230, h: 50, red: false },
            { x: 268, y: 198, h: 38, red: false },
            { x: 298, y: 172, h: 34, red: true },
            { x: 328, y: 132, h: 54, red: false }
          ]
        : [
            { x: 28, y: 320, h: 34, red: false },
            { x: 58, y: 348, h: 42, red: true },
            { x: 88, y: 314, h: 30, red: false },
            { x: 118, y: 340, h: 36, red: true },
            { x: 148, y: 306, h: 38, red: false },
            { x: 178, y: 334, h: 34, red: true },
            { x: 208, y: 304, h: 40, red: false },
            { x: 238, y: 336, h: 36, red: true },
            { x: 268, y: 310, h: 34, red: false },
            { x: 298, y: 340, h: 38, red: true },
            { x: 328, y: 314, h: 34, red: false }
          ];

  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 360 640" aria-hidden="true">
      {candles.map((candle, index) => {
        const candleTone = candle.red ? '#ff5268' : '#2fea7b';
        return (
          <g key={`${candle.x}-${index}`} opacity="0.05">
            <line x1={candle.x} x2={candle.x} y1={candle.y - 18} y2={candle.y + candle.h + 16} stroke={candleTone} strokeOpacity="1" strokeWidth="1.5" />
            <rect x={candle.x - 6} y={candle.y} width="12" height={candle.h} rx="1.5" fill={candleTone} fillOpacity="1" />
          </g>
        );
      })}
    </svg>
  );
}

function MetricTile({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-grid bg-panel/80 p-2">
      <p className="whitespace-nowrap text-[6.5px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className={`mt-1 whitespace-nowrap text-sm font-black leading-tight ${tone}`}>{value}</p>
    </div>
  );
}

export default function ShareCard({ entry, currentCapital }: ShareCardProps) {
  const ruleBreaks = getRuleBreaks(entry);
  const isProfit = entry.pnl > 0;
  const isLoss = entry.pnl < 0;
  const trend = isProfit ? 'bullish' : isLoss ? 'bearish' : 'flat';
  const resultTone = isProfit ? 'text-profit' : isLoss ? 'text-loss' : 'text-slate-100';
  const resultBg = isProfit ? 'bg-profit text-black' : isLoss ? 'bg-loss text-white' : 'bg-slate-200 text-black';
  const completion = Math.min(100, Math.max(0, (entry.day / CHALLENGE_DAYS) * 100));
  const nextMilestone = milestones.find((day) => day >= entry.day) || 60;

  return (
    <div className="share-card relative aspect-[9/16] w-[360px] overflow-hidden rounded-[18px] border border-grid bg-canvas text-white shadow-2xl">
      <MarketBackdrop trend={trend} />
      <div className="absolute inset-0 bg-gradient-to-b from-canvas/72 via-canvas/54 to-canvas/78" />

      <div className="absolute inset-x-5 bottom-[10%] top-[10%] z-10 flex flex-col overflow-hidden py-3">
        <header className="flex items-start justify-between">
          <BrandMark />
          <div className={`rounded-full px-3 py-1 text-xs font-black tracking-[0.12em] ${resultBg}`}>{entry.result.toUpperCase()}</div>
        </header>

        <section className="mt-3 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Trading Day</p>
          <div className="mt-2 flex items-end justify-center gap-2">
            <span className={`text-[76px] font-black leading-[0.82] ${resultTone}`}>{entry.day}</span>
            <span className="pb-1.5 text-xl font-black text-slate-500">/ {CHALLENGE_DAYS}</span>
          </div>
          <div className="mx-auto mt-3 h-2 w-full overflow-hidden rounded-full border border-grid bg-slate-950">
            <div className={`h-full rounded-full ${isLoss ? 'bg-loss' : 'bg-profit'}`} style={{ width: `${completion}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
            <span>Day 1</span>
            <span>{completion.toFixed(1)}% complete</span>
            <span>Day 60</span>
          </div>
        </section>

        <section className={`mt-3 rounded-xl border p-3 text-center ${isLoss ? 'border-loss/45 bg-[#14070b]' : isProfit ? 'border-profit/45 bg-[#07140d]' : 'border-info/45 bg-[#07101a]'}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Daily P&L</p>
          <p className={`mt-2 text-[44px] font-black leading-none ${resultTone}`}>{formatCurrency(entry.pnl)}</p>
          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">NIFTY option buying only</p>
        </section>

        <section className="mt-3 grid grid-cols-3 gap-2">
          <MetricTile label="Discipline" value={`${entry.disciplineScore}/10`} tone={ruleBreaks.length ? 'text-loss' : 'text-profit'} />
          <MetricTile label="Trades Taken" value={`${entry.tradesTaken || 0}/2`} tone={entry.tradesTaken <= 2 ? 'text-profit' : 'text-loss'} />
          <MetricTile label="Current Capital" value={formatCurrency(currentCapital)} tone={currentCapital >= STARTING_CAPITAL ? 'text-profit' : 'text-loss'} />
        </section>

        <section className="mt-3 rounded-xl border border-grid bg-panelSoft/80 p-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Milestones</p>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-profit">Next: Day {nextMilestone}</p>
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {milestones.map((day) => {
              const reached = entry.day >= day;
              return (
                <div key={day} className="text-center">
                  <div className={`mx-auto h-6 w-6 rounded-full border text-[9px] font-black leading-6 ${reached ? 'border-profit bg-profit text-black' : 'border-slate-700 text-slate-600'}`}>
                    {day}
                  </div>
                  <p className={`mt-1 text-[7px] font-black uppercase ${reached ? 'text-profit' : 'text-slate-600'}`}>Day</p>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="mt-auto pt-2 text-center text-[8px] font-bold uppercase leading-snug tracking-[0.12em] text-slate-500">
          <p>Start {formatCurrency(STARTING_CAPITAL)} <span className="mx-1.5 text-slate-700">|</span> Educational Content Only</p>
          <p>Trading Involves Risk</p>
        </footer>
      </div>
    </div>
  );
}
