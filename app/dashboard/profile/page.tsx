"use client";

import { useState } from "react";
import { Loader2, Mail, Phone, Save, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { TIMEZONES } from "@/lib/constants";
import { PageHeader } from "@/components/portal/page-header";
import { ChangePasswordForm } from "@/components/portal/change-password-form";
import { Field } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/lib/toast";

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [timezone, setTimezone] = useState(profile?.timezone ?? "Asia/Dhaka (GMT+6)");
  const [saving, setSaving] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateProfile({ full_name: fullName, phone, timezone });
    setSaving(false);
    if (error) {
      toast("error", "Could not save", error);
    } else {
      toast("success", "Profile updated");
    }
  };

  const resendConfirm = async () => {
    if (!user) return;
    setEmailLoading(true);
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email ?? "",
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setEmailLoading(false);
    if (error) {
      toast("error", "Could not resend", error.message);
    } else {
      toast("success", "Verification email sent");
    }
  };

  const verified = !!user?.email_confirmed_at;

  return (
    <div>
      <PageHeader title="Profile" subtitle="Manage your personal details and account security." />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <form onSubmit={save} className="saas-card space-y-5 rounded-3xl p-6 sm:p-8">
          <h3 className="flex items-center gap-2 font-display text-base font-bold">
            <UserRound className="h-4 w-4 text-cyan-500" /> Personal details
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full Name">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </Field>
            <Field label="Phone / WhatsApp">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-11" required />
              </div>
            </Field>
            <Field label="Timezone" className="sm:col-span-2">
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-input bg-white/60 px-4 py-2 text-sm text-foreground shadow-sm transition-all focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none dark:bg-white/5"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Member since{" "}
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : "—"}
            </p>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
            </Button>
          </div>
        </form>

        <div className="space-y-5">
          <div className="saas-card rounded-3xl p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
              <Mail className="h-4 w-4 text-cyan-500" /> Account & security
            </h3>
            <div className="space-y-3">
              <div className="rounded-xl bg-primary/5 px-4 py-3">
                <p className="text-xs text-muted-foreground">Email address</p>
                <p className="mt-0.5 flex items-center gap-2 text-sm font-medium">
                  {user?.email}
                  {verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  ) : (
                    <button
                      onClick={resendConfirm}
                      disabled={emailLoading}
                      className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 hover:underline disabled:opacity-50"
                    >
                      {emailLoading ? "Sending…" : "Unverified · Resend"}
                    </button>
                  )}
                </p>
              </div>
              <ChangePasswordForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
