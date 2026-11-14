import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: number;
  note: string;
  icon: ReactNode;
  iconClassName: string;
}

export function StatCard({
  label,
  value,
  note,
  icon,
  iconClassName,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClassName}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <p className="mt-4 text-xs text-slate-500">{note}</p>
    </article>
  );
}
