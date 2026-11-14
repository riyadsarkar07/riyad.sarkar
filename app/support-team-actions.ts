"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type SupportRole = "agent" | "senior_agent" | "supervisor" | "admin";
export type StaffProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  staff_role: SupportRole | null;
  agent_status: string | null;
};
export type SupportDepartment = { id: string; name: string; slug: string; active: boolean };
export type SupportTeam = { id: string; department_id: string; name: string; active: boolean };
export type SupportTeamMember = { team_id: string; staff_id: string; team_role: string; active: boolean };

type SetupResult = {
  ok: boolean;
  error?: string;
  profiles?: StaffProfile[];
  departments?: SupportDepartment[];
  teams?: SupportTeam[];
  members?: SupportTeamMember[];
};

type WriteResult = { ok: boolean; error?: string };

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  if (!isSupabaseConfigured()) return { supabase: null, user: null, error: "Supabase is not configured" };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) return { supabase: null, user: null, error: "Not signed in" };
  const { data: admin, error } = await supabase.rpc("is_admin");
  if (error || admin !== true) return { supabase: null, user: null, error: "Only administrators can manage support staff." };
  return { supabase, user, error: null };
}

export async function loadSupportSetupAction(): Promise<SetupResult> {
  const { supabase, error } = await requireAdmin();
  if (!supabase) return { ok: false, error: error ?? "Not authorized" };
  const [profiles, departments, teams, members] = await Promise.all([
    supabase.from("profiles").select("id,email,full_name,role,staff_role,agent_status").order("created_at", { ascending: false }).limit(250),
    supabase.from("support_departments").select("id,name,slug,active").order("name"),
    supabase.from("support_teams").select("id,name,department_id,active").order("name"),
    supabase.from("support_team_members").select("team_id,staff_id,team_role,active"),
  ]);
  const firstError = profiles.error ?? departments.error ?? teams.error ?? members.error;
  if (firstError) return { ok: false, error: firstError.message };
  return {
    ok: true,
    profiles: (profiles.data ?? []) as StaffProfile[],
    departments: (departments.data ?? []) as SupportDepartment[],
    teams: (teams.data ?? []) as SupportTeam[],
    members: (members.data ?? []) as SupportTeamMember[],
  };
}

export async function changeSupportStaffRoleAction(
  profileId: string,
  role: SupportRole | null,
): Promise<WriteResult> {
  const { supabase, user, error } = await requireAdmin();
  if (!supabase || !user) return { ok: false, error: error ?? "Not authorized" };
  if (!uuidRe.test(profileId)) return { ok: false, error: "Invalid user ID." };
  if (role !== null && !(["agent", "senior_agent", "supervisor", "admin"] as const).includes(role)) {
    return { ok: false, error: "Invalid staff role." };
  }

  const { data: target, error: readError } = await supabase.from("profiles")
    .select("id,role,staff_role").eq("id", profileId).maybeSingle();
  if (readError || !target) return { ok: false, error: readError?.message ?? "User not found." };
  if ((target.role === "admin" || target.id === user.id) && role !== "admin") {
    return { ok: false, error: "A full administrator cannot be demoted from this support setup page." };
  }
  const { data: updated, error: writeError } = await supabase.from("profiles")
    .update({ staff_role: role }).eq("id", profileId)
    .select("id,staff_role").maybeSingle();
  if (writeError || !updated || updated.staff_role !== role) {
    return { ok: false, error: writeError?.message ?? "Staff role was not saved. Refresh and retry." };
  }
  revalidatePath("/admin/support-team");
  revalidatePath("/admin/chat");
  return { ok: true };
}

export async function createSupportDepartmentAction(nameInput: string): Promise<WriteResult> {
  const { supabase, error } = await requireAdmin();
  if (!supabase) return { ok: false, error: error ?? "Not authorized" };
  const name = nameInput.trim();
  const slug = name.toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (name.length < 2 || name.length > 80 || !slug) {
    return { ok: false, error: "Enter a 2–80 character department name using English letters or numbers." };
  }
  const { data, error: insertError } = await supabase.from("support_departments")
    .insert({ name, slug }).select("id").maybeSingle();
  if (insertError || !data) {
    return { ok: false, error: insertError?.code === "23505" ? "This department already exists." : insertError?.message ?? "Department was not saved." };
  }
  revalidatePath("/admin/support-team");
  return { ok: true };
}

export async function createSupportTeamAction(
  nameInput: string,
  departmentId: string,
): Promise<WriteResult> {
  const { supabase, error } = await requireAdmin();
  if (!supabase) return { ok: false, error: error ?? "Not authorized" };
  const name = nameInput.trim();
  if (name.length < 2 || name.length > 80 || !uuidRe.test(departmentId)) {
    return { ok: false, error: "Enter a team name and select a valid department." };
  }
  const { data: department } = await supabase.from("support_departments")
    .select("id").eq("id", departmentId).eq("active", true).maybeSingle();
  if (!department) return { ok: false, error: "Selected department is unavailable." };
  const { data, error: insertError } = await supabase.from("support_teams")
    .insert({ name, department_id: departmentId }).select("id").maybeSingle();
  if (insertError || !data) {
    return { ok: false, error: insertError?.code === "23505" ? "Team already exists in this department." : insertError?.message ?? "Team was not saved." };
  }
  revalidatePath("/admin/support-team");
  revalidatePath("/admin/chat");
  return { ok: true };
}

export async function changeSupportTeamMembershipAction(
  teamId: string,
  staffId: string,
  active: boolean,
): Promise<WriteResult> {
  const { supabase, error } = await requireAdmin();
  if (!supabase) return { ok: false, error: error ?? "Not authorized" };
  if (!uuidRe.test(teamId) || !uuidRe.test(staffId)) return { ok: false, error: "Invalid team or user ID." };

  const [{ data: team }, { data: person }] = await Promise.all([
    supabase.from("support_teams").select("id").eq("id", teamId).eq("active", true).maybeSingle(),
    supabase.from("profiles").select("id,staff_role").eq("id", staffId).maybeSingle(),
  ]);
  if (!team || !person?.staff_role) {
    return { ok: false, error: "The team or staff member is not available. Set the user's staff role first." };
  }

  // Preserve membership history; do not delete rows to remove access.
  const { data: saved, error: writeError } = await supabase.from("support_team_members")
    .upsert({ team_id: teamId, staff_id: staffId, active }, { onConflict: "team_id,staff_id" })
    .select("team_id,staff_id,active").maybeSingle();
  if (writeError || !saved || saved.active !== active) {
    return { ok: false, error: writeError?.message ?? "Team membership could not be verified." };
  }
  revalidatePath("/admin/support-team");
  revalidatePath("/admin/chat");
  return { ok: true };
}
