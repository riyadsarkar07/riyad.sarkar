import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AdminDashboardShell } from "@/components/portal/admin-shell";

/**
 * Server-side gate for the /admin area.
 *
 * Full admins keep access to every page. Support staff (agent / senior_agent /
 * supervisor) may only reach the Live Chat workspace; middleware blocks every
 * other /admin path for them, and the nav is filtered to match.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");

  let staffRole: string | null = null;
  if (!isAdmin) {
    const { data } = await supabase.rpc("staff_role");
    staffRole = (data as string | null) ?? null;
    if (!staffRole) redirect("/dashboard");
  }

  return (
    <AdminDashboardShell staffRole={isAdmin ? "admin" : staffRole}>
      {children}
    </AdminDashboardShell>
  );
}
