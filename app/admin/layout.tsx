import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboardShell } from "@/components/portal/admin-shell";

/**
 * Server-side admin gate — verifies the signed-in user is an authorized admin
 * via the SECURITY DEFINER is_admin() check. UI hiding alone is not enough.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    redirect("/dashboard");
  }

  return <AdminDashboardShell>{children}</AdminDashboardShell>;
}
