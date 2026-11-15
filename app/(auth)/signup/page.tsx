"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
  UserPlus,
} from "lucide-react";
import { AuthShell, Field } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-path";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const { needsEmailConfirmation, error: err } = await signUp({
      fullName,
      email,
      phone,
      password,
    });
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    if (needsEmailConfirmation) {
      setSent(true);
    } else {
      router.push(safeNextPath(searchParams.get("next")) ?? "/dashboard");
      router.refresh();
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="relative mb-5">
          <span className="absolute -inset-3 rounded-full bg-emerald-400/30 animate-pulse-ring" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow-lg">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        </div>
        <h3 className="font-display text-lg font-bold">Check your inbox</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          We sent a verification link to <strong className="text-foreground">{email}</strong>.
          Click it to activate your account, then sign in.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() =>
            router.push(
              safeNextPath(searchParams.get("next"))
                ? `/login?next=${encodeURIComponent(searchParams.get("next") ?? "")}`
                : "/login",
            )
          }
        >
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      <Field label="Full Name" htmlFor="full-name">
        <div className="relative">
          <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            required
            id="full-name"
            autoComplete="name"
            placeholder="Riyad Ahmed"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="pl-11"
          />
        </div>
      </Field>
      <Field label="Email" htmlFor="signup-email">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            required
            type="email"
            id="signup-email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-11"
          />
        </div>
      </Field>
      <Field label="Phone / WhatsApp" htmlFor="signup-phone">
        <div className="relative">
          <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            required
            type="tel"
            id="signup-phone"
            autoComplete="tel"
            placeholder="+880 1XXX-XXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-11"
          />
        </div>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Password" htmlFor="signup-password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              required
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              id="signup-password"
            placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-11 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="Confirm Password" htmlFor="confirm-password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              required
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              id="confirm-password"
            placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pl-11"
            />
          </div>
        </Field>
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Creating account…
          </>
        ) : (
          <>
            <UserPlus className="h-5 w-5" /> Create Account
          </>
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="font-semibold text-primary hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-semibold text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}

function SignupLoginLink() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  return (
    <Link
      href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
      className="font-semibold text-primary hover:underline"
    >
      Sign in
    </Link>
  );
}

export default function SignupPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Sign up to book appointments and open support tickets"
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Suspense fallback={<Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>}>
            <SignupLoginLink />
          </Suspense>
        </p>
      }
    >
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
