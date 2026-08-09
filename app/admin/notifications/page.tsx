"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Mail } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { PageHeader } from "@/components/portal/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast";
import type { Notification } from "@/types/dashboard";

export default function AdminNotificationsPage() {
  const supabase = useSupabase();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const sendTest = async () => {
    const { error } = await supabase.from("notifications").insert({
      user_id: null,
      title: "System notice",
      body: "This is a test notification from the admin console.",
      type: "system",
    });
    if (error) toast("error", "Could not send", error.message);
    else {
      toast("success", "Test notification sent");
      load();
    }
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="In-app notifications for users and the admin team."
        actions={
          <Button onClick={sendTest}>
            <Mail className="h-4 w-4" /> Send test
          </Button>
        }
      />

      <p className="mb-5 text-xs text-muted-foreground">
        {unread} unread of {notifications.length} shown · emails are sent server-side via Resend when configured.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass gradient-border rounded-2xl px-6 py-16 text-center text-sm text-muted-foreground">
          No notifications yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`glass rounded-2xl border-l-4 px-5 py-4 ${
                n.read ? "border-l-border/40 opacity-70" : "border-l-cyan-500"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    {!n.read && <span className="h-2 w-2 rounded-full bg-cyan-500" />}
                    {n.title}
                  </p>
                  {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · {n.type} · {n.user_id ? "to user" : "system-wide"}
                  </p>
                </div>
                {!n.read && <Bell className="h-4 w-4 shrink-0 text-cyan-500" />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
