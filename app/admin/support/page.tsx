"use client";

import { SupportMessenger } from "@/components/portal/support-messenger";
import { PageHeader } from "@/components/portal/page-header";

export default function AdminSupportPage() {
  return (
    <div>
      <PageHeader
        title="Support Inbox"
        subtitle="Client support cases with Case IDs, replies, unread counts, and status. Live chat, project enquiries, and appointments stay separate."
      />
      <SupportMessenger mode="admin" />
    </div>
  );
}
