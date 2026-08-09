import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserDashboardShell } from "@/components/portal/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <UserDashboardShell>{children}</UserDashboardShell>;
}
