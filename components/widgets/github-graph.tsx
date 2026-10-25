"use client";

import { useEffect, useState } from "react";
import { GitCommitHorizontal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Day {
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  date: string;
}

const cellColors: Record<Day["level"], string> = {
  0: "bg-primary/[0.06]",
  1: "bg-sky-300/60 dark:bg-sky-800/60",
  2: "bg-sky-400/70 dark:bg-sky-700/70",
  3: "bg-blue-500/80 dark:bg-blue-600/80",
  4: "bg-gradient-to-br from-blue-600 to-cyan-500",
};

/**
 * GitHub-style contribution graph. Attempts the live GitHub API and
 * falls back to a locally generated activity grid when unavailable.
 */
export function GitHubGraph({ username }: { username: string }) {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`https://github-contributions-api.jogruber.de/v4/${username}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled || !data?.contributions) return;
        const mapped = data.contributions.map(
          (c: { date: string; count: number }): Day => ({
            date: c.date,
            count: c.count,
            level: Math.min(4, Math.ceil(c.count / 4)) as Day["level"],
          }),
        );
        if (mapped.length >= 49) {
          setDays(mapped.slice(-182));
          setLive(true);
        }
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [username]);

  const total = days.reduce((sum, d) => sum + d.count, 0);
  const weeks = Math.ceil(days.length / 7);

  return (
    <div className="glass hover-lift h-full rounded-[1.2rem] px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <GitCommitHorizontal className="h-4 w-4 text-cyan-500" />
          GitHub Activity
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </p>
        <span className="text-xs font-semibold text-primary">
          {live ? `${total} contributions` : loading ? "Loading" : "Unavailable"}
        </span>
      </div>

      {!live && !loading ? (
        <p className="py-4 text-xs text-muted-foreground">
          Live GitHub activity could not be loaded. No estimated data is shown.
        </p>
      ) : (
        <>
          <div className="flex gap-[3px] overflow-hidden">
            {Array.from({ length: weeks }).map((_, week) => (
              <div key={week} className="grid flex-1 grid-rows-7 gap-[3px]">
                {days
                  .slice(week * 7, week * 7 + 7)
                  .map((d, i) => (
                    <span
                      key={i}
                      title={`${d.date}: ${d.count} contributions`}
                      className={cn(
                        "h-2.5 w-full rounded-[3px] transition-transform hover:scale-125",
                        cellColors[d.level],
                      )}
                    />
                  ))}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="truncate">@{username}</span>
            <span className="flex items-center gap-1">
              Less
              {Object.values(cellColors).map((color) => (
                <span key={color} className={cn("h-2 w-2 rounded-[2px]", color)} />
              ))}
              More
            </span>
          </div>
        </>
      )}
    </div>
  );
}
