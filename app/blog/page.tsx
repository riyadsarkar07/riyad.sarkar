import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { blogPosts } from "@/data/content";
import { buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { BlogCover } from "@/components/ui/blog-cover";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = buildMetadata({
  title: "Blog",
  description:
    "Cyber security guides, account recovery tutorials and digital protection strategies by Riyad Sarkar.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <main className="section relative min-h-screen pt-24 sm:pt-28">
      <div className="bg-mesh-blue pointer-events-none absolute inset-0" />
      <div className="container relative">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyber-600 sm:text-xs">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-cyber-500" />
            Insights
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-cyber-500" />
          </div>
          <h1 className="section-title">Latest Insights</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Cyber security guides, recovery tutorials and digital protection strategies — written
            from real-world experience.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group glass gradient-border hover-lift flex h-full flex-col overflow-hidden rounded-[1.35rem]"
            >
              <div className="h-44 overflow-hidden">
                <BlogCover
                  cover={post.cover}
                  className="h-full transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
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
                <h2 className="font-display text-lg font-bold leading-snug transition-colors group-hover:text-primary">
                  {post.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Read Article
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
