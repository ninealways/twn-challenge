type BrandMarkProps = {
  size?: 'preview' | 'card' | 'dashboard';
  subtitle?: string;
};

export default function BrandMark({ size = 'card', subtitle = '60 Day Trading Challenge' }: BrandMarkProps) {
  const isDashboard = size === 'dashboard';
  const isPreview = size === 'preview';

  return (
    <div className={`flex items-center ${isPreview ? 'gap-1' : 'gap-2.5'}`}>
      <svg className={`${isDashboard ? 'h-10 w-10' : isPreview ? 'h-4 w-4' : 'h-7 w-7'} shrink-0`} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M6 20.5a10.5 10.5 0 0 1 17.6-7.7" fill="none" stroke="#f4f7fb" strokeLinecap="round" strokeWidth="2.2" />
        <path d="M23.6 12.8h-5.1m5.1 0V7.7" fill="none" stroke="#2fea7b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
        <path d="M5.2 24.6h21.6" stroke="#f4f7fb" strokeLinecap="round" strokeWidth="2.2" />
        <rect x="8.2" y="16.5" width="3.4" height="6.6" rx="1" fill="#f4f7fb" />
        <rect x="14.2" y="12.2" width="3.4" height="10.9" rx="1" fill="#f4f7fb" />
        <rect x="20.2" y="8.5" width="3.4" height="14.6" rx="1" fill="#2fea7b" />
      </svg>
      <div className="leading-none">
        <p className={`${isDashboard ? 'text-[30px]' : isPreview ? 'text-[10px]' : 'text-[18px]'} font-black tracking-[-0.02em] text-white`}>
          TradeWith<span className="text-profit">Nine</span>
        </p>
        <p className={`${isDashboard ? 'mt-2 text-[11px]' : isPreview ? 'mt-0.5 text-[5px]' : 'mt-1 text-[8px]'} font-bold uppercase tracking-[0.18em] text-slate-500`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
