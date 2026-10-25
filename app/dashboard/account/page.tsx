"use client";

import { useEffect } from "react";
import {
  BadgeCheck,
  CalendarDays,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/portal/page-header";
import { ChangePasswordForm } from "@/components/portal/change-password-form";

/**
 * Account Settings / My Account for the signed-in client.
 * Only ever shows and updates the currently authenticated user's own data.
 */
export default function AccountPage() {
  const { user, profile, isAdmin } = useAuth();
  const verified = !!user?.email_confirmed_at;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#change-password") {
      document.getElementById("change-password")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const rows = [
    {
      icon: Mail,
      label: "Email address",
      value: user?.email ?? "—",
      trailing: verified ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          <BadgeCheck className="h-3 w-3" /> Verified
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
          Unverified
        </span>
      ),
    },
    {
      icon: UserRound,
      label: "Full name",
      value: profile?.full_name ?? "—",
    },
    {
      icon: ShieldCheck,
      label: "Account type",
      value: isAdmin ? "Administrator" : "Client",
    },
    {
      icon: CalendarDays,
      label: "Member since",
      value: profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })
        : "—",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Account Settings"
        subtitle="View your account information and manage your security."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass gradient-border rounded-3xl p-6 sm:p-8">
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
            <UserRound className="h-4 w-4 text-cyan-500" /> Account information
          </h3>
          <dl className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 rounded-xl bg-primary/5 px-4 py-3"
              >
                <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                  <row.icon className="h-3.5 w-3.5" /> {row.label}
                </dt>
                <dd className="flex items-center gap-2 text-right text-sm font-medium">
                  {row.value}
                  {row.trailing}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="change-password" className="glass gradient-border scroll-mt-24 rounded-3xl p-6 sm:p-8">
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
            <KeyRound className="h-4 w-4 text-cyan-500" /> Change Password
          </h3>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            Choose a new password for your account. You&apos;ll stay signed in after updating it.
          </p>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}
