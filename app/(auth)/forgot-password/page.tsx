"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { AuthShell, Field } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await resetPassword(email);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="We'll email you a secure reset link"
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="relative mb-5">
            <span className="absolute -inset-3 rounded-full bg-emerald-400/30 animate-pulse-ring" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow-lg">
              <CheckCircle2 className="h-7 w-7" />
            </div>
          </div>
          <h3 className="font-display text-lg font-bold">Reset link sent</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            If an account exists for <strong className="text-foreground">{email}</strong>, a
            password reset link is on its way.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}
          <Field label="Email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                required
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-11"
              />
            </div>
          </Field>
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Send className="h-5 w-5" /> Send Reset Link
              </>
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
