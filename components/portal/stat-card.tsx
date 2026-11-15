import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <div className="portal-surface group relative overflow-hidden rounded-xl p-5 transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/15 bg-sky-500/10 text-sky-700 dark:text-sky-300">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
