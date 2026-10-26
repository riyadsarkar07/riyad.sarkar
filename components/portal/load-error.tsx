import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" /> Retry
      </Button>
    </div>
  );
}
