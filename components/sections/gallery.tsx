"use client";

import { useState } from "react";
import { galleryItems, galleryCategories } from "@/data/content";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { RevealGroup, RevealItem } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";

const heights = [
  "h-64",
  "h-80",
  "h-64",
  "h-72",
  "h-80",
  "h-64",
  "h-72",
  "h-64",
];

/** Gallery — luxury masonry of AI-art cyber visuals. */
export function Gallery() {
  const { t } = useI18n();
  const [filter, setFilter] = useState("All");

  const filtered =
    filter === "All" ? galleryItems : galleryItems.filter((item) => item.category === filter);

  return (
    <section id="gallery" className="section relative overflow-hidden">
      <div className="container">
        <SectionHeading
          eyebrow="Gallery"
          title={t.gallery.title}
          description={t.gallery.subtitle}
        />

        {/* Filters */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 sm:mt-8">
          {galleryCategories.map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                filter === category
                  ? "btn-primary-glow text-white shadow-glow"
                  : "glass text-muted-foreground hover:text-primary",
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Masonry */}
        <RevealGroup className="mt-6 columns-1 gap-4 sm:mt-8 sm:columns-2 lg:columns-4 [&>*]:mb-4">
          {filtered.map((item, index) => (
            <RevealItem key={item.id} className="break-inside-avoid">
              <div
                className={cn(
                  "group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br",
                  item.gradient,
                  heights[index % heights.length],
                )}
              >
                <div className="bg-grid absolute inset-0 opacity-30" />
                <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                </div>

                {/* Animated icon artwork */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute -inset-6 rounded-full bg-white/20 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/25 text-white shadow-lg backdrop-blur-md transition-all duration-500 group-hover:scale-125 group-hover:rotate-6">
                      <Icon name={item.icon} className="h-8 w-8" />
                    </div>
                  </div>
                </div>

                {/* Caption */}
                <div className="absolute inset-x-0 bottom-0 translate-y-1 p-5 opacity-100 sm:translate-y-2 sm:opacity-0 sm:transition-all sm:duration-500 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                  <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
                    {item.category}
                  </p>
                  <p className="font-display text-base font-bold text-white">{item.title}</p>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
