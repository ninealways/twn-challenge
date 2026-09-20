type ProgressBarProps = {
  value: number;
};

export default function ProgressBar({ value }: ProgressBarProps) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="h-3 overflow-hidden rounded-full border border-grid bg-slate-900" aria-label={`Progress ${width}%`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-info via-profit to-warning transition-all"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
