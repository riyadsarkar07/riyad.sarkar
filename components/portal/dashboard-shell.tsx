"use client";

import {
  CalendarDays,
  CalendarPlus,
  Home,
  LayoutDashboard,
  Lock,
  Mail,
  Headset,
  MessagesSquare,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PortalNav } from "@/components/portal/portal-nav";

function DashboardNav() {
  const { isAdmin } = useAuth();
  const items = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
    { href: "/dashboard/appointments", label: "My Appointments", icon: CalendarDays },
    { href: "/dashboard/appointments/new", label: "Book Appointment", icon: CalendarPlus },
    { href: "/dashboard/enquiries", label: "Project Enquiries", icon: Mail },
    { href: "/dashboard/support", label: "Support Inbox", icon: MessagesSquare },
    { href: "/dashboard/chat", label: "Live Chat", icon: Headset },
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
    { href: "/dashboard/account", label: "Account Settings", icon: Settings },
    { href: "/dashboard/account#change-password", label: "Change Password", icon: Lock },
    { href: "/", label: "Portfolio Home / Back to Website", icon: Home, end: true },
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
      <div className="portal-canvas min-h-[100dvh]">
        <DashboardNav />
        <div className="lg:pl-72">
          <main className="min-h-[100dvh] pb-16 pt-20 lg:pt-8">
            <div className="mx-auto w-full max-w-6xl px-4 py-5 lg:px-10">{children}</div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
