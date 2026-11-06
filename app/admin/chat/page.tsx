"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LiveChat } from "@/components/portal/live-chat";
import { PageHeader } from "@/components/portal/page-header";

function AdminChatWorkspace() {
  const searchParams = useSearchParams();
  const session = searchParams.get("session");

  return (
    <div>
      <PageHeader
        title="Support Agent Workspace"
        subtitle="Manage live client sessions — join waiting chats, set priority, record internal notes, and track previous cases. Separate from Support Inbox, project enquiries, and appointments."
      />
      <LiveChat mode="admin" initialSessionId={session} />
    </div>
  );
}

export default function AdminChatPage() {
  return (
    <Suspense>
      <AdminChatWorkspace />
    </Suspense>
  );
}
