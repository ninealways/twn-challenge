type RuleBadgeProps = {
  ok: boolean;
  label: string;
};

export default function RuleBadge({ ok, label }: RuleBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-sm font-bold ${
        ok ? 'border-profit/30 bg-profit/10 text-profit' : 'border-loss/30 bg-loss/10 text-loss'
      }`}
    >
      {ok ? 'OK' : 'Break'} · {label}
    </span>
  );
}
