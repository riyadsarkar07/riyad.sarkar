"use client";

import { LiveChat } from "@/components/portal/live-chat";
import { PageHeader } from "@/components/portal/page-header";

export default function AdminChatPage() {
  return (
    <div>
      <PageHeader
        title="Live Chat"
        subtitle="Realtime client sessions. Separate from Support Inbox cases, project enquiries, and appointments."
      />
      <LiveChat mode="admin" />
    </div>
  );
}
