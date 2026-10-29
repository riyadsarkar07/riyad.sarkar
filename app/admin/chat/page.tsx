"use client";

import { LiveChat } from "@/components/portal/live-chat";
import { PageHeader } from "@/components/portal/page-header";

export default function AdminChatPage() {
  return (
    <div>
      <PageHeader
        title="Admin Live Chat"
        subtitle="All client sessions. Join a waiting chat to take it as support. Separate from Support Inbox, project enquiries, and appointments."
      />
      <LiveChat mode="admin" />
    </div>
  );
}
