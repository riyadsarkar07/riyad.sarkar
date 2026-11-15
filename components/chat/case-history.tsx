"use client";

import { History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/portal/status-badge";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types/dashboard";

interface CaseHistoryProps {
  cases: ChatSession[];
  loaded: boolean;
  loading: boolean;
  error: string;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onSelectCase: (id: string) => void;
  formatDate: (value: string) => string;
  bare?: boolean;
}

/** Previous cases are independent of the active queue and its status filter. */
export function CaseHistory({
  cases,
  loaded,
  loading,
  error,
  hasMore,
  onLoadMore,
  onRetry,
  onSelectCase,
  formatDate,
  bare,
}: CaseHistoryProps) {
  return (
    <section className={cn("py-3", bare ? "" : "px-4")} aria-label="Previous customer cases" aria-busy={loading}>
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <History className="h-3.5 w-3.5" aria-hidden="true" /> Previous cases
      </h3>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}{" "}
          <button type="button" className="font-semibold underline underline-offset-2" onClick={onRetry}>
            Retry
          </button>
        </p>
      )}
      {!loaded && loading ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Loading previous cases…
        </p>
      ) : !loaded && error ? null : cases.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {loaded ? "No earlier cases for this customer." : "Select a case to load customer history."}
        </p>
      ) : (
        <ol className="mt-2 max-h-80 space-y-2 overflow-y-auto" aria-label="Customer case history">
          {cases.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectCase(item.id)}
                aria-label={`Open previous case ${item.reference_id ?? item.id}, ${item.status}`}
                className="w-full rounded-xl border border-border/70 bg-card px-3 py-2.5 text-left transition-[background-color,border-color] hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-offset-2"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs font-semibold text-sky-700 dark:text-sky-300">
                    {item.reference_id ?? "Pending ID"}
                  </span>
                  <StatusBadge status={item.status} />
                </span>
                <span className="mt-1 block truncate text-xs text-foreground/85">
                  {item.last_message_preview || "No message preview"}
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Opened {formatDate(item.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {hasMore && (
        <Button type="button" size="sm" variant="outline" className="mt-2 w-full"
          disabled={loading} onClick={onLoadMore}>
          {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
          Load older cases
        </Button>
      )}
    </section>
  );
}
