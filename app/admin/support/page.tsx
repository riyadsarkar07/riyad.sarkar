"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SupportMessenger } from "@/components/portal/support-messenger";
import { PageHeader } from "@/components/portal/page-header";

function AdminSupportInbox() {
  const searchParams = useSearchParams();
  const ticket = searchParams.get("ticket");

  return (
    <div>
      <PageHeader
        title="Support Inbox"
        subtitle="Client support cases with Case IDs, replies, unread counts, and status. Live chat, project enquiries, and appointments stay separate."
      />
      <SupportMessenger mode="admin" initialTicketId={ticket} />
    </div>
  );
}

export default function AdminSupportPage() {
  return (
    <Suspense>
      <AdminSupportInbox />
    </Suspense>
  );
}
