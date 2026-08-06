import { Logo } from "@/components/ui/logo";
import { Skeleton } from "@/components/ui/skeleton";

/** Page transition skeleton shown while routes load. */
export default function Loading() {
  return (
    <main className="min-h-screen pt-32">
      <div className="container space-y-10">
        <div className="mx-auto max-w-3xl space-y-5 text-center">
          <div className="flex justify-center">
            <Logo size={56} />
          </div>
          <Skeleton className="mx-auto h-12 w-3/4" />
          <Skeleton className="mx-auto h-5 w-1/2" />
          <Skeleton className="mx-auto h-5 w-2/3" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    </main>
  );
}
