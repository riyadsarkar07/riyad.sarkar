"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { AuthShell, Field } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

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
    const { error: err } = await updatePassword(password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
  };

  return (
    <AuthShell
      title="Set new password"
      subtitle="Choose a strong password for your account"
      footer={
        !done && (
          <p className="text-center text-sm text-muted-foreground">
            Changed your mind?{" "}
            <Link href="/dashboard" className="font-semibold text-primary hover:underline">
              Go to dashboard
            </Link>
          </p>
        )
      }
    >
      {done ? (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="relative mb-5">
            <span className="absolute -inset-3 rounded-full bg-emerald-400/30 animate-pulse-ring" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow-lg">
              <CheckCircle2 className="h-7 w-7" />
            </div>
          </div>
          <h3 className="font-display text-lg font-bold">Password updated</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Your password has been changed successfully.
          </p>
          <Button className="mt-6" onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}
          <Field label="New Password">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                required
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirm New Password">
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                required
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pl-11"
              />
            </div>
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Updating…
              </>
            ) : (
              <>
                <KeyRound className="h-5 w-5" /> Update Password
              </>
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
