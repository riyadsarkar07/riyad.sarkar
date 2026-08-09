"use client";

import {
  CalendarDays,
  CalendarPlus,
  LayoutDashboard,
  MessagesSquare,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PortalNav } from "@/components/portal/portal-nav";

function DashboardNav() {
  const { isAdmin } = useAuth();
  const items = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
    { href: "/dashboard/appointments/new", label: "Book Appointment", icon: CalendarPlus },
    { href: "/dashboard/appointments", label: "My Appointments", icon: CalendarDays },
    { href: "/dashboard/support", label: "Support Inbox", icon: MessagesSquare },
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ];
  if (isAdmin) {
    items.push({ href: "/admin", label: "Admin Dashboard", icon: ShieldCheck });
  }
  return (
    <PortalNav items={items} title="Client Portal" subtitle="Riyad Sarkar" />
  );
}

export function UserDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-[100dvh]">
        <DashboardNav />
        <div className="lg:pl-72">
          <main className="min-h-[100dvh] pb-16 pt-20 lg:pt-0">
            <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10">{children}</div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
