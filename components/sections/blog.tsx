"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { blogPosts } from "@/data/content";
import { RevealGroup, RevealItem } from "@/components/effects/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { BlogCover } from "@/components/ui/blog-cover";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

/** Blog section — latest insights grid. */
export function Blog() {
  const posts = blogPosts.slice(0, 3);

  return (
    <section id="blog" className="section relative overflow-hidden">
      <div className="container">
        <SectionHeading
          eyebrow="Blog"
          title="Latest Insights"
          description="Cyber security guides, recovery tutorials and digital protection strategies."
        />

        <RevealGroup className="mt-14 grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <RevealItem key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group glass gradient-border flex h-full flex-col overflow-hidden rounded-3xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-glow-lg"
              >
                <div className="h-44 overflow-hidden">
                  <BlogCover
                    cover={post.cover}
                    className="h-full transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <Badge variant="default">{post.category}</Badge>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(post.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {post.readTime} min
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold leading-snug transition-colors group-hover:text-primary">
                    {post.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {post.excerpt}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Read Article
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </span>
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
