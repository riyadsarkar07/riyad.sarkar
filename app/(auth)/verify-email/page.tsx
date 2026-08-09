"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { AuthShell, Field } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Almost there — confirm your address to activate your account"
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already verified?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={resend} className="space-y-4" noValidate>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We sent a confirmation link to your email. Click it to activate your account. If you
          didn&apos;t receive it, enter your email below to resend.
        </p>
        {status === "sent" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
            Verification email sent — please check your inbox.
          </div>
        )}
        {status === "error" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {message}
          </div>
        )}
        <Field label="Email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              required
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11"
            />
          </div>
        </Field>
        <Button type="submit" className="w-full" size="lg" disabled={status === "sending"}>
          {status === "sending" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Sending…
            </>
          ) : (
            <>
              <RefreshCw className="h-5 w-5" /> Resend Verification Email
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
