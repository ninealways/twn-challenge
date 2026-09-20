import { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function SectionCard({ title, subtitle, actions, children }: SectionCardProps) {
  return (
    <section className="app-surface p-4 md:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold leading-tight text-white">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
