"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LiveChat } from "@/components/portal/live-chat";
import { PageHeader } from "@/components/portal/page-header";
import { useAuth } from "@/lib/auth";

function LiveChatInbox() {
  const searchParams = useSearchParams();
  const session = searchParams.get("session");
  const router = useRouter();
  const { isAdmin, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isAdmin) router.replace("/admin/chat");
  }, [isAdmin, isLoaded, router]);

  if (isLoaded && isAdmin) return null;

  return (
    <div>
      <PageHeader
        title="My Live Chat"
        subtitle="Your live sessions with support. Each case has its own ID and stays separate from Support Inbox cases."
      />
      <LiveChat mode="user" initialSessionId={session} />
    </div>
  );
}

export default function DashboardChatPage() {
  return (
    <Suspense>
      <LiveChatInbox />
    </Suspense>
  );
}
