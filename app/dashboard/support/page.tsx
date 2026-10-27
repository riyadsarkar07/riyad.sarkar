"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SupportMessenger } from "@/components/portal/support-messenger";
import { PageHeader } from "@/components/portal/page-header";

function SupportInbox() {
  const searchParams = useSearchParams();
  const ticket = searchParams.get("ticket");
  const appointment = searchParams.get("appointment");

  return (
    <div>
      <PageHeader
        title="Support Inbox"
        subtitle="Persistent support cases with a unique Case ID, history, replies, and status. Live chat and project enquiries stay in their own workflows."
      />
      <SupportMessenger
        mode="user"
        initialTicketId={ticket}
        initialAppointmentId={appointment}
      />
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense>
      <SupportInbox />
    </Suspense>
  );
}
