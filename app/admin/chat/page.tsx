import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LiveChat } from "@/components/portal/live-chat";
import { PageHeader } from "@/components/portal/page-header";

async function resolveStaffRole(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin) return "admin";
  const { data } = await supabase.rpc("staff_role");
  return (data as string | null) ?? null;
}

export default async function AdminChatPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const staffRole = await resolveStaffRole();
  if (!staffRole) redirect("/dashboard");

  const params = await searchParams;
  const session = params.session ?? null;

  return (
    <div>
      <PageHeader
        title="Support Agent Workspace"
        subtitle="Manage live client sessions — join waiting chats, set priority, record internal notes, and track previous cases. Separate from Support Inbox, project enquiries, and appointments."
      />
      <Suspense>
        <LiveChat mode="admin" initialSessionId={session} staffRole={staffRole} />
      </Suspense>
    </div>
  );
}
