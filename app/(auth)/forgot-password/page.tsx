"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Send,
} from "lucide-react";
import { AuthShell, Field } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

type Step = "email" | "code" | "password" | "done";

const RESEND_COOLDOWN = 60;
const OTP_LENGTH = 6;

/** Map Supabase OTP errors to friendly, actionable messages. */
function describeOtpError(message: string | null): string | null {
  if (!message) return null;
  const m = message.toLowerCase();
  if (m.includes("expired")) {
    return "This code has expired. Please request a new one.";
  }
  if (m.includes("already been used") || m.includes("already used") || m.includes("reuse")) {
    return "This code has already been used. Please request a new one.";
  }
  if (m.includes("invalid") || m.includes("incorrect") || m.includes("wrong") || m.includes("otp")) {
    return "That code is incorrect. Please check the 6-digit code and try again.";
  }
  if (m.includes("rate") || m.includes("too many") || m.includes("frequent")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return message;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sendRecoveryCode, verifyRecoveryCode, updatePassword, signOut } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [doneEmail, setDoneEmail] = useState("");

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<number | null>(null);

  const startCooldown = useCallback(() => {
    if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = window.setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (cooldownRef.current) window.clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    };
  }, []);

  // Support deep links from the dashboard profile ("Change Password").
  useEffect(() => {
    const prefillEmail = searchParams.get("email");
    if (prefillEmail) setEmail(prefillEmail);
    if (prefillEmail && searchParams.get("sent") === "1") {
      setStep("code");
      setCode("");
      startCooldown();
    }
  }, [searchParams, startCooldown]);

  const sendCode = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    const { error: err } = await sendRecoveryCode(email);
    setBusy(false);
    if (err) {
      setError(
        "We couldn't send a recovery code right now. If an account exists for this email, " +
          "please try again in a moment.",
      );
      return false;
    }
    return true;
  };

  const onSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const ok = await sendCode();
    if (!ok) return;
    setStep("code");
    setCode("");
    startCooldown();
  };

  const onResend = async () => {
    if (busy || cooldown > 0) return;
    setError(null);
    setBusy(true);
    const { error: err } = await sendRecoveryCode(email);
    setBusy(false);
    if (err) {
      setError(describeOtpError(err));
      return;
    }
    setCode("");
    startCooldown();
  };

  const setOtpChar = (i: number, value: string) => {
    const digit = value.replace(/\D/g, "");
    const chars = code.split("");
    chars[i] = digit;
    const next = chars.join("").slice(0, OTP_LENGTH);
    setCode(next);
    if (digit && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setCode(pasted);
    otpRefs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (code.length !== OTP_LENGTH) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError(null);
    setBusy(true);
    const { error: err } = await verifyRecoveryCode(email, code);
    setBusy(false);
    if (err) {
      setError(describeOtpError(err));
      return;
    }
    setStep("password");
    setPassword("");
    setConfirm("");
  };

  const onSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: err } = await updatePassword(password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    await signOut();
    setDoneEmail(email);
    setStep("done");
    window.setTimeout(() => router.replace("/login"), 2400);
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="Recover your account with a 6-digit code"
      footer={
        step !== "done" ? (
          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Go to sign in
            </Link>
          </p>
        )
      }
    >
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {step === "email" && (
        <form onSubmit={onSendCode} className="space-y-4" noValidate>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter your account email and we&apos;ll send you a 6-digit recovery code.
          </p>
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
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Send className="h-5 w-5" /> Send Recovery Code
              </>
            )}
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            If an account exists for this email, a code will be sent to it.
          </p>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={onVerifyCode} className="space-y-5" noValidate>
          <div className="text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Enter the 6-digit code sent to{" "}
              <strong className="text-foreground">{email}</strong>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Didn&apos;t receive it? Check your spam folder.
            </p>
          </div>

          <div
            className="flex justify-center gap-2 sm:gap-3"
            role="group"
            aria-label="Six digit recovery code"
          >
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <Input
                key={i}
                ref={(el) => {
                  otpRefs.current[i] = el;
                }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={code[i] ?? ""}
                onChange={(e) => setOtpChar(i, e.target.value)}
                onPaste={handleOtpPaste}
                onKeyDown={(e) => handleOtpKey(i, e)}
                aria-label={`Digit ${i + 1}`}
                className="h-14 w-11 px-0 text-center text-xl font-bold sm:w-12"
              />
            ))}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={busy || code.length !== OTP_LENGTH}>
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Verifying…
              </>
            ) : (
              <>
                <KeyRound className="h-5 w-5" /> Verify & Continue
              </>
            )}
          </Button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={onResend}
              disabled={busy || cooldown > 0}
              className="inline-flex items-center gap-1 font-semibold text-primary transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={onSubmitPassword} className="space-y-4" noValidate>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Code verified — now choose a new password for your account.
          </p>
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
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? (
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

      {step === "done" && (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="relative mb-5">
            <span className="absolute -inset-3 rounded-full bg-emerald-400/30 animate-pulse-ring" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow-lg">
              <CheckCircle2 className="h-7 w-7" />
            </div>
          </div>
          <h3 className="font-display text-lg font-bold">Password updated</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Your password for <strong className="text-foreground">{doneEmail}</strong> has been
            changed. Redirecting you to sign in…
          </p>
          <Button className="mt-6" onClick={() => router.replace("/login")}>
            <ArrowLeft className="h-4 w-4" /> Go to Login
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
