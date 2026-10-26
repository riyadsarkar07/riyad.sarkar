"use client";

import { SupportMessenger } from "@/components/portal/support-messenger";
import { PageHeader } from "@/components/portal/page-header";

export default function AdminSupportPage() {
  return (
    <div>
      <PageHeader
        title="Support Inbox"
        subtitle="Client tickets with live replies, reference IDs, unread counts, and status. Project enquiries and appointments live in their own sections."
      />
      <SupportMessenger mode="admin" />
    </div>
  );
}
