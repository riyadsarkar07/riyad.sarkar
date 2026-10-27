"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LiveChat } from "@/components/portal/live-chat";
import { PageHeader } from "@/components/portal/page-header";

function LiveChatInbox() {
  const searchParams = useSearchParams();
  const session = searchParams.get("session");

  return (
    <div>
      <PageHeader
        title="Live Chat"
        subtitle="Realtime conversations with support agents. Each session has its own ID and is kept separate from Support Inbox cases."
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
