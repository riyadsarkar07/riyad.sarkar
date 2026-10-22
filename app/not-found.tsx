import Link from "next/link";
import { Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-16">
      <div className="bg-mesh-blue pointer-events-none absolute inset-0" />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative text-center">
        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-glow-lg">
          <span className="absolute -inset-3 rounded-[1.75rem] bg-cyan-400/20 animate-pulse-ring" />
          <ShieldAlert className="relative h-12 w-12" />
        </div>
        <p className="font-display text-8xl font-bold text-gradient">404</p>
        <h1 className="mt-4 text-2xl font-bold md:text-3xl">Access Denied</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          The page you're looking for doesn't exist, has moved, or was removed for security.
          Let's get you back to safety.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">
              <Home className="mr-1 h-4 w-4" />
              Return Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/#contact">Contact Me</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
