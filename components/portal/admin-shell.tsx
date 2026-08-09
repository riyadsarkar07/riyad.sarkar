"use client";

import {
  Bell,
  CalendarDays,
  FolderOpen,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  Users,
} from "lucide-react";
import { AuthProvider } from "@/lib/auth";
import { PortalNav } from "@/components/portal/portal-nav";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/admin/support", label: "Support Inbox", icon: MessagesSquare },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/files", label: "Files", icon: FolderOpen },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-[100dvh]">
        <PortalNav items={items} title="Admin Dashboard" subtitle="Riyad Sarkar" />
        <div className="lg:pl-72">
          <main className="min-h-[100dvh] pb-16 pt-20 lg:pt-0">
            <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10">{children}</div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
