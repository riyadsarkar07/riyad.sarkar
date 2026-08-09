"use client";

import { SupportMessenger } from "@/components/portal/support-messenger";
import { PageHeader } from "@/components/portal/page-header";

export default function AdminSupportPage() {
  return (
    <div>
      <PageHeader
        title="Support Inbox"
        subtitle="Every client conversation in one place — replies update instantly."
      />
      <SupportMessenger mode="admin" />
    </div>
  );
}
