'use client';

import { useEffect, useRef, useState } from 'react';
import SectionCard from '@/components/SectionCard';
import { formatCurrency } from '@/lib/stats';
import type { TwoXPayload } from '@/types/twoXChallenge';

type Draft = { title: string; description: string; headline: string; time: string };
const localDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function TwoXYouTube({ payload }: { payload: TwoXPayload }) {
  const [selection, setSelection] = useState('upcoming');
  const latest = [...payload.daily].sort((a, b) => b.day - a.day)[0];
  const entry = payload.daily.find((row) => row.id === selection);
  return (
    <div className="min-w-0">
      <label className="mb-5 grid max-w-md gap-2 text-sm font-bold">
        Content for
        <select className="field" value={selection} onChange={(event) => setSelection(event.target.value)}>
          <option value="upcoming">Upcoming live</option>
          {[...payload.daily].sort((a, b) => b.day - a.day).map((row) => <option key={row.id} value={row.id}>Day {row.day} recap | {row.date}</option>)}
        </select>
      </label>
      <YouTubeDraft key={`${selection}-${entry?.day ?? latest?.day ?? 0}`} payload={payload} entry={entry} nextDay={(latest?.day || 0) + 1} />
    </div>
  );
}

function YouTubeDraft({ payload, entry, nextDay }: { payload: TwoXPayload; entry?: TwoXPayload['daily'][number]; nextDay: number }) {
  const [day, setDay] = useState(entry?.day || nextDay);
  const [date, setDate] = useState(entry?.date || localDate());
  const [draft, setDraft] = useState<Draft>({ title: '', description: '', headline: 'NIFTY LIVE', time: '' });
  const [ready, setReady] = useState('');
  const [message, setMessage] = useState('');
  const [thumbnailReady, setThumbnailReady] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mode = entry ? 'recap' : 'live';
  const previousStorageKey = `twn-youtube-${mode}-${day}-${date}`;
  // Keep earlier live drafts intact while adopting the new default template.
  const storageKey = entry ? previousStorageKey : `${previousStorageKey}-v2`;

  function generate(time: string): Draft {
    if (!entry) {
      const { startingCapital, targetCapital, tradingDays, challengeName, dailyLossLimitPct, maximumConsecutiveLosses } = payload.setup;
      const titleCapital = (capital: number) => capital >= 100000
        ? `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(capital / 100000)} Lakh`
        : formatCurrency(capital);
      return {
        title: `Can ${titleCapital(startingCapital)} Become ${titleCapital(targetCapital)}? 📈 | DAY ${day} LIVE | ${challengeName} | NIFTY Options`.slice(0, 100),
        headline: 'NIFTY LIVE',
        time,
        description: [
          day === 1 ? `DAY 1 of ${challengeName} begins today. 📈` : `DAY ${day} of ${challengeName}: the journey continues. 📈`,
          `${date}${time ? ` | ${time} IST` : ''}`,
          '',
          `Starting Capital: ${formatCurrency(startingCapital)}`,
          `Goal: ${formatCurrency(targetCapital)}`,
          `Maximum Timeline: ${tradingDays} Trading Days`,
          '',
          `After completing my 60-day trading journey, ${day === 1 ? "I'm starting" : "I'm continuing"} a new phase with one priority: better execution and disciplined risk management.`,
          '',
          "There is no requirement to trade every day and no fixed number of trades. I'll trade only when I find a setup that meets my criteria.",
          '',
          'My core rules:',
          `• Maximum daily loss: ${dailyLossLimitPct}% of opening capital`,
          '• Stop-loss on every trade',
          `• Stop after ${maximumConsecutiveLosses} consecutive losing trades`,
          '• No revenge trading',
          '• Position size calculated before entry',
          `• Capital protection comes before the ${titleCapital(targetCapital)} target`,
          '',
          "I'll be documenting the complete journey: profitable days, losing days, mistakes, chart analysis and lessons.",
          '',
          `This is not a claim that ${titleCapital(startingCapital)} will definitely become ${titleCapital(targetCapital)}. The purpose is to document the attempt and improve as a trader.`,
          '',
          `Subscribe to follow the journey from Day 1 to Day ${tradingDays}.`,
          '',
          'Follow TradeWithNine',
          'Instagram: https://www.instagram.com/trade_withnine/',
          '',
          '⚠️ Disclaimer: This live stream is for educational and documentation purposes only. I am not a SEBI-registered investment adviser. Nothing shown or discussed should be considered investment or trading advice. F&O trading involves substantial risk and may result in significant financial loss. Please do your own research and consult a qualified financial professional where appropriate.',
          '',
          '#2Xin120 #NiftyOptions #OptionsTrading #LiveTrading #IntradayTrading #TradingJourney #Nifty50 #TradeWithNine'
        ].join('\n')
      };
    }
    const label = entry ? 'NIFTY Options Trading Recap' : 'NIFTY Options LIVE';
    const result = entry ? ` | P&L ${formatCurrency(entry.pnl)}` : '';
    return {
      title: `${label} | Day ${day} | ${payload.setup.challengeName}${result}`.slice(0, 100),
      headline: entry ? `P&L ${formatCurrency(entry.pnl)}` : 'NIFTY LIVE',
      time,
      description: [
        `Day ${day} of ${payload.setup.challengeName} with TradeWithNine.`,
        `${date}${time ? ` | ${time} IST` : ''}`,
        '',
        `Challenge goal: grow ${formatCurrency(payload.setup.startingCapital)} to ${formatCurrency(payload.setup.targetCapital)} over ${payload.setup.tradingDays} trading days. This is a goal, not a promised return.`,
        '',
        entry ? `Day recap\nNet P&L: ${formatCurrency(entry.pnl)}\nClosing capital: ${formatCurrency(entry.closing)}\nDiscipline: ${entry.discipline}/10${entry.notes ? `\n\nToday's notes\n${entry.notes}` : ''}` : 'Live NIFTY option buying: watching setups, planning entries, placing stop losses, and reviewing execution.',
        '',
        `Trading rules\n- Stop loss on every trade\n- Stop after ${payload.setup.maximumConsecutiveLosses} consecutive losses\n- ${payload.setup.dailyLossLimitPct}% daily loss hard stop\n- ${payload.setup.profitThresholdPct}% profit review threshold\n- No revenge trading`,
        '',
        'Follow TradeWithNine\nInstagram: https://www.instagram.com/trade_withnine/',
        '',
        'Educational content only. Trading involves risk. This stream is not a buy or sell recommendation.',
        '',
        '#TradeWithNine #NiftyOptions #LiveTrading #TradingDiscipline #2Xin120'
      ].join('\n')
    };
  }

  useEffect(() => {
    setReady('');
    let restored: Draft | undefined;
    let previousTime = '';
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && ['title', 'description', 'headline', 'time'].every((key) => typeof saved[key] === 'string')) restored = saved;
      if (!restored && !entry) {
        const previous = JSON.parse(localStorage.getItem(previousStorageKey) || 'null');
        if (typeof previous?.time === 'string') previousTime = previous.time;
      }
    } catch { /* Use generated copy when no usable draft is stored. */ }
    setDraft(restored || generate(previousTime));
    setReady(storageKey);
    // Each day/date owns an independent editable draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (ready !== storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(draft)); } catch { setMessage('Draft could not be saved in this browser. Copy your text before leaving.'); }
  }, [draft, ready, storageKey]);

  useEffect(() => {
    setThumbnailReady(false);
    const surface = canvas.current;
    const ctx = surface?.getContext('2d');
    if (!surface || !ctx) return;
    let cancelled = false;
    const original = new Image();
    const clean = new Image();
    const render = () => {
      if (cancelled) return;
      surface.width = original.naturalWidth;
      surface.height = original.naturalHeight;
      ctx.drawImage(original, 0, 0);
      if (day !== 1) {
        // Patch only the old lettering; preserve every original pixel elsewhere.
        const x = 1168, y = 164, width = 370, height = 146;
        ctx.drawImage(clean,
          x * clean.naturalWidth / surface.width, y * clean.naturalHeight / surface.height,
          width * clean.naturalWidth / surface.width, height * clean.naturalHeight / surface.height,
          x, y, width, height);
        let size = 174;
        const label = `DAY ${day}`;
        ctx.font = `900 ${size}px Arial`;
        while (ctx.measureText(label).width > 452 && size > 40) {
          size -= 1;
          ctx.font = `900 ${size}px Arial`;
        }
        const baseline = 297;
        const white = ctx.createLinearGradient(0, baseline - size, 0, baseline);
        white.addColorStop(0, '#ffffff'); white.addColorStop(1, '#d4d4d4');
        ctx.fillStyle = white;
        ctx.fillText('DAY ', 1178, baseline);
        const green = ctx.createLinearGradient(0, baseline - size * 0.75, 0, baseline);
        green.addColorStop(0, '#bcffd5'); green.addColorStop(1, '#00ed52');
        ctx.fillStyle = green;
        ctx.fillText(String(day), 1178 + ctx.measureText('DAY ').width, baseline);
      }
      setThumbnailReady(true);
    };
    const fail = () => { if (!cancelled) setMessage('Thumbnail image could not load. Reload the page to retry.'); };
    original.onload = () => {
      if (day === 1) render();
      else clean.src = '/reel-assets/youtube-day-clean.png';
    };
    clean.onload = render;
    original.onerror = fail;
    clean.onerror = fail;
    original.src = '/reel-assets/youtube-day-template.png';
    return () => { cancelled = true; };
  }, [day]);

  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setMessage(`${label} copied.`); }
    catch { setMessage('Clipboard access failed. Select and copy the text in its field.'); }
  }

  function download() {
    if (!thumbnailReady) return;
    canvas.current?.toBlob((blob) => {
      if (!blob) { setMessage('Thumbnail export failed. Please try again.'); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `tradewithnine-day-${day}-${mode}.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Thumbnail downloaded.');
    }, 'image/png');
  }

  return (
    <div className="grid min-w-0 gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold">Trading day<input className="field" type="number" min="1" max={payload.setup.tradingDays} step="1" value={day} disabled={!!entry} onChange={(event) => setDay(Math.max(1, Math.min(payload.setup.tradingDays, Math.floor(Number(event.target.value)) || 1)))} /></label>
        <label className="grid gap-2 text-sm font-bold">Stream date<input className="field" type="date" value={date} disabled={!!entry} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} /></label>
        <label className="grid gap-2 text-sm font-bold">Session time (IST)<input className="field" placeholder="e.g. 9:30 AM" maxLength={30} value={draft.time} onChange={(event) => {
          const time = event.target.value;
          const previous = `${date}${draft.time ? ` | ${draft.time} IST` : ''}`;
          setDraft({ ...draft, time, description: draft.description.split('\n').map((line) => line === previous ? `${date}${time ? ` | ${time} IST` : ''}` : line).join('\n') });
        }} /></label>
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <SectionCard title="YouTube copy" actions={<button className="btn-small" onClick={() => setDraft(generate(draft.time))}>Regenerate copy</button>}>
          <label className="grid gap-2 text-sm font-bold">Title<textarea className="field min-h-24 resize-y" maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <div className="my-3 flex items-center justify-between"><span className="text-xs text-muted">{draft.title.length}/100</span><button className="btn-small" disabled={!draft.title} onClick={() => void copy(draft.title, 'Title')}>Copy title</button></div>
          <label className="grid gap-2 text-sm font-bold">Description<textarea className="field min-h-80 resize-y text-sm" maxLength={5000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <div className="mt-3 flex items-center justify-between"><span className="text-xs text-muted">{draft.description.length}/5000</span><button className="btn-small" disabled={!draft.description} onClick={() => void copy(draft.description, 'Description')}>Copy description</button></div>
        </SectionCard>
        <SectionCard title="Daily thumbnail" actions={<button className="btn-primary" disabled={!thumbnailReady} onClick={download}>Download PNG</button>}>
          <canvas ref={canvas} width={1671} height={941} className="h-auto w-full rounded-md" aria-label={`YouTube thumbnail for day ${day}`} />
          <p className="mt-3 text-xs text-muted">1671 × 941 · PNG</p>
        </SectionCard>
      </div>
      <p role="status" className="min-h-6 text-sm text-info">{message}</p>
    </div>
  );
}
