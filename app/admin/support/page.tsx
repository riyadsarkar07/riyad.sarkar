"use client";

import { SupportMessenger } from "@/components/portal/support-messenger";
import { PageHeader } from "@/components/portal/page-header";

export default function AdminSupportPage() {
  return (
    <div>
      <PageHeader
        title="Live Support Conversations"
        subtitle="Authenticated real-time inbox. Status and unread counts appear on each ticket. Email tickets and appointments live in their own sections."
      />
      <SupportMessenger mode="admin" />
    </div>
  );
}
