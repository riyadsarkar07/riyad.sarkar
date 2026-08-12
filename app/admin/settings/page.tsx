"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { updateSettingsAction } from "@/app/actions";
import { PageHeader } from "@/components/portal/page-header";
import { ChangePasswordForm } from "@/components/portal/change-password-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast";

export default function AdminSettingsPage() {
  const supabase = useSupabase();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("settings").select("*");
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.key] = row.value;
      if (active) {
        setSettings(map);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const save = async (key: string, value: string) => {
    setSavingKey(key);
    const res = await updateSettingsAction(key, value);
    setSavingKey(null);
    if (res.ok) {
      setSettings((prev) => ({ ...prev, [key]: value }));
      toast("success", "Setting saved");
    } else {
      toast("error", "Save failed", res.error);
    }
  };

  const notifyValue = settings["notify_admin_email"] ?? "true";

  return (
    <div>
      <PageHeader title="Settings" subtitle="Small portal-wide configuration options." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass gradient-border rounded-2xl p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
            <ShieldCheck className="h-4 w-4 text-cyan-500" /> Notifications
          </h2>
          {loading ? (
            <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-white/40 px-5 py-4 dark:bg-white/5">
              <div>
                <p className="text-sm font-semibold">Email the admin for activity</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  riyadsarkar1243@gmail.com is notified when clients book appointments or open tickets.
                </p>
              </div>
              {savingKey === "notify_admin_email" ? (
                <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
              ) : (
                <button
                  onClick={() => save("notify_admin_email", notifyValue === "true" ? "false" : "true")}
                  aria-pressed={notifyValue === "true"}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    notifyValue === "true" ? "bg-emerald-500" : "bg-border"
                  }`}
                  aria-label="Toggle admin email notifications"
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      notifyValue === "true" ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              )}
            </div>
          )}
        </section>

        <section className="glass gradient-border rounded-2xl p-6">
          <h2 className="mb-4 font-display text-base font-bold">Environment</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
              <dt className="text-muted-foreground">Supabase project</dt>
              <dd className="font-mono text-xs">iixuowpwmumtpjrurztn</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
              <dt className="text-muted-foreground">Email provider</dt>
              <dd className="text-xs">Resend (server-side, key optional)</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
              <dt className="text-muted-foreground">Admin email</dt>
              <dd className="text-xs">riyadsarkar1243@gmail.com</dd>
            </div>
          </dl>
        </section>

        <section id="change-password" className="glass gradient-border rounded-2xl p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
            <KeyRound className="h-4 w-4 text-cyan-500" /> Change Password
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            Update the password for your own admin account. You&apos;ll stay signed in after
            changing it.
          </p>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}
