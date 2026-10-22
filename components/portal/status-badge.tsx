import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";

const styles: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  confirmed: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-500 border-red-500/30",
  reschedule_requested: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  open: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  awaiting_reply: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  closed: "bg-slate-500/15 text-slate-500 border-slate-500/30",
  low: "bg-slate-500/15 text-slate-500 border-slate-500/30",
  normal: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  high: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/15 text-red-500 border-red-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? PRIORITY_LABELS[status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        styles[status] ?? "bg-primary/10 text-primary border-primary/20",
      )}
    >
      {label}
    </span>
  );
}
