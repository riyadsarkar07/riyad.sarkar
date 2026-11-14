"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Shield, Users } from "lucide-react";
import {
  changeSupportStaffRoleAction,
  changeSupportTeamMembershipAction,
  createSupportDepartmentAction,
  createSupportTeamAction,
  loadSupportSetupAction,
  type StaffProfile,
  type SupportDepartment,
  type SupportRole,
  type SupportTeam,
  type SupportTeamMember,
} from "@/app/support-team-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/portal/page-header";

const roleLabel: Record<SupportRole, string> = {
  agent: "Agent",
  senior_agent: "Senior Agent",
  supervisor: "Supervisor",
  admin: "Admin",
};

export default function SupportTeamPage() {
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [departments, setDepartments] = useState<SupportDepartment[]>([]);
  const [teams, setTeams] = useState<SupportTeam[]>([]);
  const [members, setMembers] = useState<SupportTeamMember[]>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({});
  const [departmentName, setDepartmentName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [memberTeamId, setMemberTeamId] = useState("");
  const [memberStaffId, setMemberStaffId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await loadSupportSetupAction();
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Could not load support staff.");
      return;
    }
    setError(null);
    setProfiles(result.profiles ?? []);
    setDepartments(result.departments ?? []);
    setTeams(result.teams ?? []);
    setMembers(result.members ?? []);
    setDraftRoles({});
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const perform = async (action: () => Promise<{ ok: boolean; error?: string }>, message: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "The change was not saved.");
        return;
      }
      setNotice(message);
      await refresh();
    } catch {
      setError("The action failed. Refresh before retrying.");
    } finally {
      setBusy(false);
    }
  };

  const staff = profiles.filter((p) => p.staff_role !== null);
  const currentMemberships = members.filter((m) => m.active);
  const field = "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground";
  const panel = "rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/chat" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Live Chat
        </Link>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void refresh()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <PageHeader
        title="Support team management"
        subtitle="Set real staff roles, departments and team memberships. Every change is saved in Supabase. No demo agents are created."
      />

      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" /> {notice}
      </p>}
      {loading ? (
        <div className="flex min-h-52 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading support team setup" />
        </div>
      ) : (
        <>
          <section className={panel}>
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-500" />
              <h2 className="font-display text-lg font-bold">Staff roles</h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Only existing registered users can become staff. A full administrator cannot be demoted from this screen.
              Role changes are logged by the database.
            </p>
            {profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No registered profiles were found.</p>
            ) : (
              <div className="space-y-2">
                {profiles.map((person) => {
                  const draft = draftRoles[person.id] ?? person.staff_role ?? "none";
                  const changed = draft !== (person.staff_role ?? "none");
                  return (
                    <div key={person.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 px-3 py-3">
                      <div className="min-w-44 flex-1">
                        <p className="truncate text-sm font-semibold">{person.full_name || person.email || "Registered user"}</p>
                        <p className="truncate text-xs text-muted-foreground">{person.email || person.id}</p>
                        <p className="text-xs text-muted-foreground">{person.agent_status || "offline"}</p>
                      </div>
                      <select
                        aria-label={`Staff role for ${person.full_name || person.email || person.id}`}
                        value={draft}
                        className={`${field} w-full max-w-48`}
                        onChange={(e) => setDraftRoles((prev) => ({ ...prev, [person.id]: e.target.value }))}
                        disabled={person.role === "admin" || busy}
                      >
                        <option value="none">Client (no staff access)</option>
                        {Object.entries(roleLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <Button
                        size="sm"
                        disabled={!changed || busy || person.role === "admin"}
                        onClick={() => void perform(
                          () => changeSupportStaffRoleAction(person.id, draft === "none" ? null : draft as SupportRole),
                          "Staff role saved and verified.",
                        )}
                      >
                        Save role
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className={panel}>
              <h2 className="mb-1 font-display text-lg font-bold">Departments</h2>
              <p className="mb-4 text-xs text-muted-foreground">Create the department that receives routed or escalated cases.</p>
              <form className="flex gap-2" onSubmit={(event) => {
                event.preventDefault();
                void perform(async () => {
                  const result = await createSupportDepartmentAction(departmentName);
                  if (result.ok) setDepartmentName("");
                  return result;
                }, "Department created.");
              }}>
                <Input placeholder="e.g. Account Recovery" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} required maxLength={80}/>
                <Button type="submit" disabled={busy || !departmentName.trim()}>Add</Button>
              </form>
              <div className="mt-4 space-y-2">
                {departments.length === 0 && <p className="text-xs text-muted-foreground">No departments configured.</p>}
                {departments.map((department) => (
                  <div key={department.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                    <span>{department.name}</span>
                    <span className="text-xs text-muted-foreground">{department.active ? "Active" : "Inactive"}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={panel}>
              <h2 className="mb-1 font-display text-lg font-bold">Support teams</h2>
              <p className="mb-4 text-xs text-muted-foreground">Each team belongs to a real department.</p>
              <form className="space-y-2" onSubmit={(event) => {
                event.preventDefault();
                void perform(async () => {
                  const result = await createSupportTeamAction(teamName, departmentId);
                  if (result.ok) setTeamName("");
                  return result;
                }, "Support team created.");
              }}>
                <Input placeholder="e.g. Senior Recovery Team" value={teamName} onChange={(e) => setTeamName(e.target.value)} required maxLength={80}/>
                <select className={field} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required aria-label="Team department">
                  <option value="">Choose department…</option>
                  {departments.filter((d) => d.active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <Button type="submit" disabled={busy || !departmentId || !teamName.trim()}>Create team</Button>
              </form>
              <div className="mt-4 space-y-2">
                {teams.length === 0 && <p className="text-xs text-muted-foreground">No teams configured.</p>}
                {teams.map((team) => (
                  <div key={team.id} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                    {team.name}
                    <p className="text-xs text-muted-foreground">{departments.find((d) => d.id === team.department_id)?.name ?? "Department unavailable"}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className={panel}>
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-500" />
              <h2 className="font-display text-lg font-bold">Team membership</h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">Add authorized staff to an existing team. Removing access keeps historical assignment records.</p>
            <form className="grid gap-2 md:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => {
              event.preventDefault();
              void perform(() => changeSupportTeamMembershipAction(memberTeamId, memberStaffId, true), "Team membership saved.");
            }}>
              <select className={field} value={memberTeamId} onChange={(e) => setMemberTeamId(e.target.value)} required aria-label="Select team">
                <option value="">Choose team…</option>
                {teams.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select className={field} value={memberStaffId} onChange={(e) => setMemberStaffId(e.target.value)} required aria-label="Select staff member">
                <option value="">Choose staff member…</option>
                {staff.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email || p.id} · {p.staff_role}</option>)}
              </select>
              <Button type="submit" disabled={busy || !memberTeamId || !memberStaffId}>Add member</Button>
            </form>
            <div className="mt-4 space-y-2">
              {currentMemberships.length === 0 && <p className="text-xs text-muted-foreground">No active team members.</p>}
              {currentMemberships.map((membership) => (
                <div key={`${membership.team_id}-${membership.staff_id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2">
                  <div className="text-sm">
                    <span className="font-semibold">{profiles.find((p) => p.id === membership.staff_id)?.full_name || profiles.find((p) => p.id === membership.staff_id)?.email || "Staff member"}</span>
                    <span className="text-muted-foreground"> · {teams.find((t) => t.id === membership.team_id)?.name || "Team"}</span>
                  </div>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => void perform(
                    () => changeSupportTeamMembershipAction(membership.team_id, membership.staff_id, false),
                    "Team membership deactivated.",
                  )}>Remove access</Button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
