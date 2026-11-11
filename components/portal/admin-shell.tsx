"use client";

import {
  Bell,
  CalendarDays,
  FolderOpen,
  LayoutDashboard,
  Headset,
  Mail,
  MessagesSquare,
  Settings,
  Users,
} from "lucide-react";
import { AuthProvider } from "@/lib/auth";
import { PortalNav } from "@/components/portal/portal-nav";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, end: true, adminOnly: true },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarDays, adminOnly: true },
  { href: "/admin/tickets", label: "Project Enquiries", icon: Mail, adminOnly: true },
  { href: "/admin/support", label: "Support Inbox", icon: MessagesSquare, adminOnly: true },
  { href: "/admin/chat", label: "Live Chat", icon: Headset },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/admin/files", label: "Files", icon: FolderOpen, adminOnly: true },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, adminOnly: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function AdminDashboardShell({
  children,
  staffRole = "admin",
}: {
  children: React.ReactNode;
  staffRole?: string | null;
}) {
  const visibleItems = staffRole === "admin" ? items : items.filter((item) => !item.adminOnly);
  return (
    <AuthProvider>
      <div className="portal-canvas min-h-[100dvh]">
        <PortalNav items={visibleItems} title="Admin Dashboard" subtitle="Riyad Sarkar" />
        <div className="lg:pl-72">
          <main className="min-h-[100dvh] pb-16 pt-20 lg:pt-8">
            <div className="mx-auto w-full max-w-6xl px-4 py-5 lg:px-10">{children}</div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
