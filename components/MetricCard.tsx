import { ReactNode } from 'react';

type MetricCardProps = {
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'profit' | 'loss' | 'warning';
};

export default function MetricCard({ label, value, tone = 'neutral' }: MetricCardProps) {
  const toneClass = {
    neutral: 'border-info/45 text-white',
    profit: 'border-profit/60 text-profit',
    loss: 'border-loss/60 text-loss',
    warning: 'border-warning/60 text-warning'
  } satisfies Record<NonNullable<MetricCardProps['tone']>, string>;

  return (
    <article className={`rounded-lg border border-grid border-l-4 bg-panelSoft p-4 transition hover:border-slate-500 ${toneClass[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className="mt-2 text-2xl font-bold leading-tight tabular-nums">{value}</div>
    </article>
  );
}
