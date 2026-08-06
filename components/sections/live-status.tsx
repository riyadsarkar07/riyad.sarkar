"use client";

import { LiveClock } from "@/components/widgets/live-clock";
import { WeatherWidget } from "@/components/widgets/weather-widget";
import { VisitorCounter } from "@/components/widgets/visitor-counter";
import { GitHubGraph } from "@/components/widgets/github-graph";
import { RevealGroup, RevealItem } from "@/components/effects/reveal";

/** Live status dashboard — clock, weather, visitors, GitHub activity. */
export function LiveStatus() {
  return (
    <section id="status" className="relative py-16 md:py-20" aria-label="Live status">
      <div className="container">
        <RevealGroup className="grid gap-5 lg:grid-cols-[1fr_1fr_0.8fr_1.4fr]">
          <RevealItem>
            <LiveClock />
          </RevealItem>
          <RevealItem>
            <WeatherWidget />
          </RevealItem>
          <RevealItem>
            <VisitorCounter />
          </RevealItem>
          <RevealItem>
            <GitHubGraph username="riyadsarkar07" />
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  );
}
