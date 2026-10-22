import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, ShieldCheck } from "lucide-react";
import { blogPosts } from "@/data/content";
import { buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { BlogCover } from "@/components/ui/blog-cover";
import { Badge } from "@/components/ui/badge";
import { Contact } from "@/components/sections/contact";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return {};
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.date,
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <main className="relative min-h-screen pt-24 sm:pt-28">
      <div className="bg-mesh-blue pointer-events-none absolute inset-0" />
      <article className="container relative max-w-4xl">
        <Link
          href="/blog"
          className="glass mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:shadow-glow"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to articles
        </Link>

        <div className="mb-8 h-72 overflow-hidden rounded-3xl">
          <BlogCover cover={post.cover} className="h-full w-full" />
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="default">{post.category}</Badge>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatDate(post.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {post.readTime} min read
          </span>
        </div>

        <h1 className="section-title text-4xl text-balance md:text-5xl">{post.title}</h1>

        <div className="mt-8 flex items-center gap-3 border-y border-border/60 py-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 font-bold text-white">
            RS
          </span>
          <div>
            <p className="font-display text-sm font-bold">Riyad Sarkar</p>
            <p className="text-xs text-muted-foreground">
              Cyber Security Specialist · Digital Recovery Expert
            </p>
          </div>
        </div>

        <div className="mt-10 space-y-6">
          {post.content.map((paragraph, index) => (
            <p
              key={index}
              className={`leading-relaxed text-foreground/90 ${
                index === 0 ? "text-lg font-medium text-foreground" : "text-base"
              }`}
            >
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-12 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-muted-foreground">
            Dealing with a hacked or lost account right now?{" "}
            <Link href="/consultation" className="font-semibold text-primary hover:underline">
              Book a private consultation
            </Link>{" "}
            — most recoveries are resolved within 72 hours.
          </p>
        </div>
      </article>

      {/* Related posts */}
      <div className="container relative mt-20 max-w-6xl">
        <h2 className="mb-8 text-2xl font-bold">
          Continue <span className="text-gradient">Reading</span>
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {related.map((relatedPost) => (
            <Link
              key={relatedPost.slug}
              href={`/blog/${relatedPost.slug}`}
              className="group glass gradient-border flex flex-col overflow-hidden rounded-3xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-glow-lg"
            >
              <div className="h-36 overflow-hidden">
                <BlogCover
                  cover={relatedPost.cover}
                  className="h-full transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-base font-bold leading-snug transition-colors group-hover:text-primary">
                  {relatedPost.title}
                </h3>
                <span className="mt-auto pt-3 text-xs font-semibold text-primary">
                  {formatDate(relatedPost.date)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-20">
        <Contact />
      </div>
    </main>
  );
}
