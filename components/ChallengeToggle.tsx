import Link from 'next/link';

export type ChallengeView = '60day' | '2x120';

export default function ChallengeToggle({
  value
}: Readonly<{ value: ChallengeView }>) {
  return (
    <div className="flex rounded-md border border-grid bg-black/30 p-1" aria-label="Select challenge">
      <Link
        href="/60days"
        className={`min-h-9 whitespace-nowrap rounded px-3 text-sm font-bold transition ${
          value === '60day' ? 'bg-slate-700 text-white' : 'text-muted hover:bg-slate-800 hover:text-white'
        } flex items-center`}
      >
        60 Day
      </Link>
      <Link
        href="/2x120"
        className={`min-h-9 whitespace-nowrap rounded px-3 text-sm font-bold transition ${
          value === '2x120' ? 'bg-profit text-black' : 'text-muted hover:bg-slate-800 hover:text-white'
        } flex items-center`}
      >
        2X in 120
      </Link>
    </div>
  );
}
