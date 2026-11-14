-- ============================================================
-- M3: Live chat assignment, transfer and department routing
--
-- Additive only. Introduces teams/departments, an append-only
-- assignment history table and all ownership RPCs. The existing
-- chat_sessions.assigned_admin_id columns are retained as a
-- denormalized projection of the active assignment.
--
-- Every write to chat_session_assignments happens inside a
-- SECURITY DEFINER RPC. No authenticated role gets direct
-- INSERT/UPDATE/DELETE on that table.
-- ============================================================

-- ------------------------------------------------------------------
-- 1. Departments and teams
-- ------------------------------------------------------------------

create table if not exists public.support_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.support_teams (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.support_departments (id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (department_id, name)
);

create table if not exists public.support_team_members (
  team_id uuid not null references public.support_teams (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete cascade,
  team_role text not null default 'member' check (team_role in ('member', 'lead')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (team_id, staff_id)
);

create index if not exists support_team_members_staff_idx
  on public.support_team_members (staff_id) where active;

alter table public.chat_sessions
  add column if not exists department_id uuid references public.support_departments (id) on delete set null,
  add column if not exists team_id uuid references public.support_teams (id) on delete set null;

create index if not exists chat_sessions_department_idx
  on public.chat_sessions (department_id) where department_id is not null;

create index if not exists chat_sessions_team_idx
  on public.chat_sessions (team_id) where team_id is not null;

alter table public.support_departments enable row level security;
alter table public.support_teams enable row level security;
alter table public.support_team_members enable row level security;

drop policy if exists support_departments_staff_select on public.support_departments;
create policy support_departments_staff_select on public.support_departments
  for select to authenticated using (public.is_staff());

drop policy if exists support_departments_admin_all on public.support_departments;
create policy support_departments_admin_all on public.support_departments
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists support_teams_staff_select on public.support_teams;
create policy support_teams_staff_select on public.support_teams
  for select to authenticated using (public.is_staff());

drop policy if exists support_teams_admin_all on public.support_teams;
create policy support_teams_admin_all on public.support_teams
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists support_team_members_staff_select on public.support_team_members;
create policy support_team_members_staff_select on public.support_team_members
  for select to authenticated using (public.is_staff());

drop policy if exists support_team_members_admin_all on public.support_team_members;
create policy support_team_members_admin_all on public.support_team_members
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------
-- 2. Assignment history (append-only source of truth)
-- ------------------------------------------------------------------

create table if not exists public.chat_session_assignments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  assignee_id uuid references public.profiles (id) on delete set null,
  team_id uuid references public.support_teams (id) on delete set null,
  department_id uuid references public.support_departments (id) on delete set null,
  assigned_by uuid references auth.users (id) on delete set null,
  from_assignee_id uuid references public.profiles (id) on delete set null,
  status text not null default 'accepted'
    check (status in ('offered', 'accepted', 'rejected', 'returned', 'cancelled', 'completed')),
  reason text,
  decision_reason text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  ended_at timestamptz,
  end_reason text
);

create index if not exists chat_session_assignments_session_idx
  on public.chat_session_assignments (session_id, created_at desc);

create index if not exists chat_session_assignments_assignee_idx
  on public.chat_session_assignments (assignee_id, status);

-- At most one active accepted owner per session.
create unique index if not exists chat_session_assignments_one_active_idx
  on public.chat_session_assignments (session_id)
  where status = 'accepted' and ended_at is null;

-- At most one outstanding offer per session.
create unique index if not exists chat_session_assignments_one_offer_idx
  on public.chat_session_assignments (session_id)
  where status = 'offered';

alter table public.chat_session_assignments enable row level security;

drop policy if exists chat_session_assignments_staff_select on public.chat_session_assignments;
create policy chat_session_assignments_staff_select on public.chat_session_assignments
  for select to authenticated
  using (public.is_staff());

-- No insert/update/delete policy: all writes go through RPCs below.

-- Backfill: one accepted row for every session that already has an assignee.
insert into public.chat_session_assignments (
  session_id, assignee_id, assigned_by, status, created_at, ended_at, end_reason
)
select s.id,
       s.assigned_admin_id,
       s.assigned_admin_id,
       'accepted',
       coalesce(s.joined_at, s.updated_at, s.created_at),
       null,
       null
  from public.chat_sessions s
 where s.assigned_admin_id is not null
   and not exists (
     select 1 from public.chat_session_assignments a
     where a.session_id = s.id
       and a.status = 'accepted'
       and a.ended_at is null
   );

-- ------------------------------------------------------------------
-- 3. Access helpers
-- ------------------------------------------------------------------

create or replace function public.is_active_assignee(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_session_assignments a
    where a.session_id = p_session_id
      and a.assignee_id = auth.uid()
      and a.status = 'accepted'
      and a.ended_at is null
  );
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_team_id is not null and exists (
    select 1 from public.support_team_members m
    where m.team_id = p_team_id
      and m.staff_id = auth.uid()
      and m.active
  );
$$;

create or replace function public.can_read_chat_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.chat_sessions s
     where s.id = p_session_id
       and (
         -- The customer always sees their own case.
         s.user_id = auth.uid()
         -- Senior agents and above see every case.
         or public.staff_rank(public.staff_role()) >= 2
         -- The active owner of the case.
         or public.is_active_assignee(s.id)
         -- The denormalized owner projection (covers brief windows before the
         -- assignment row is visible).
         or s.assigned_admin_id = auth.uid()
         -- Any agent may see the shared unassigned waiting queue so they can
         -- claim a case. Assigned/active cases stay restricted to their owner.
         or (s.status = 'waiting' and s.assigned_admin_id is null and public.staff_role() is not null)
         -- Team queue for cases routed to a team but not yet claimed.
         or (
           s.team_id is not null
           and s.assigned_admin_id is null
           and public.is_team_member(s.team_id)
         )
         -- An agent keeps read access to cases they previously handled, so the
         -- "previous cases" panel and resolved history stay usable.
         or exists (
           select 1 from public.chat_session_assignments a
            where a.session_id = s.id
              and a.assignee_id = auth.uid()
         )
       )
  );
$$;

create or replace function public.can_write_chat_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.staff_rank(public.staff_role()) >= 3
    or public.is_active_assignee(p_session_id);
$$;

revoke all on function public.is_active_assignee(uuid) from public;
revoke all on function public.is_active_assignee(uuid) from anon;
grant execute on function public.is_active_assignee(uuid) to authenticated;

revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.is_team_member(uuid) from anon;
grant execute on function public.is_team_member(uuid) to authenticated;

revoke all on function public.can_read_chat_session(uuid) from public;
revoke all on function public.can_read_chat_session(uuid) from anon;
grant execute on function public.can_read_chat_session(uuid) to authenticated;

revoke all on function public.can_write_chat_session(uuid) from public;
revoke all on function public.can_write_chat_session(uuid) from anon;
grant execute on function public.can_write_chat_session(uuid) to authenticated;

-- ------------------------------------------------------------------
-- 4. Internal helpers used by the ownership RPCs
-- ------------------------------------------------------------------

create or replace function public.end_active_assignment(
  p_session_id uuid,
  p_end_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_session_assignments
     set status = case when p_end_reason = 'completed' then 'completed' else 'returned' end,
         ended_at = now(),
         end_reason = p_end_reason
   where session_id = p_session_id
     and status = 'accepted'
     and ended_at is null;
end;
$$;

-- Internal helper only: called exclusively from SECURITY DEFINER RPCs.
-- Never grant to authenticated/anon, otherwise any signed-in user could end
-- another agent's active assignment directly.
revoke all on function public.end_active_assignment(uuid, text) from public;
revoke all on function public.end_active_assignment(uuid, text) from anon;
revoke all on function public.end_active_assignment(uuid, text) from authenticated;

create or replace function public.staff_display_name(p_staff_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
           nullif(trim(p.full_name), ''),
           nullif(split_part(coalesce(p.email, ''), '@', 1), ''),
           'Support Agent'
         )
    from public.profiles p
   where p.id = p_staff_id;
$$;

revoke all on function public.staff_display_name(uuid) from public;
revoke all on function public.staff_display_name(uuid) from anon;
grant execute on function public.staff_display_name(uuid) to authenticated;

-- ------------------------------------------------------------------
-- 5. Claim (self-assign)
-- ------------------------------------------------------------------

create or replace function public.claim_chat_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
  uid uuid := auth.uid();
  current_owner uuid;
  actor_name text;
begin
  if uid is null or public.staff_role() is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into sess
    from public.chat_sessions
   where id = p_session_id
   for update;

  if not found then
    raise exception 'chat session not found';
  end if;

  if sess.status in ('resolved', 'closed') then
    raise exception 'case is not active' using errcode = '22000';
  end if;

  if public.is_active_assignee(p_session_id) then
    return jsonb_build_object('ok', true, 'session_id', sess.id, 'status', sess.status, 'assigned_admin_id', uid);
  end if;

  select a.assignee_id into current_owner
    from public.chat_session_assignments a
   where a.session_id = p_session_id
     and a.status = 'accepted'
     and a.ended_at is null;

  if current_owner is not null then
    raise exception 'case already assigned' using errcode = '23505';
  end if;

  actor_name := public.staff_display_name(uid);

  insert into public.chat_session_assignments (
    session_id, assignee_id, team_id, department_id, assigned_by, status, created_at
  ) values (
    p_session_id, uid, sess.team_id, sess.department_id, uid, 'accepted', now()
  );

  perform set_config('app.chat_join', 'on', true);

  update public.chat_sessions
     set assigned_admin_id = uid,
         assigned_admin_name = actor_name,
         joined_at = coalesce(joined_at, now()),
         status = case when status = 'waiting' then 'active' else status end
   where id = p_session_id
   returning * into sess;

  perform public.record_chat_case_event(
    p_session_id,
    'claimed',
    null,
    uid::text,
    jsonb_build_object('assigned_admin_name', actor_name)
  );

  return jsonb_build_object(
    'ok', true,
    'session_id', sess.id,
    'status', sess.status,
    'assigned_admin_id', sess.assigned_admin_id,
    'assigned_admin_name', sess.assigned_admin_name,
    'joined_at', sess.joined_at
  );
end;
$$;

revoke all on function public.claim_chat_session(uuid) from public;
revoke all on function public.claim_chat_session(uuid) from anon;
grant execute on function public.claim_chat_session(uuid) to authenticated;

-- ------------------------------------------------------------------
-- 6. Direct assignment / transfer (supervisor + admin)
-- ------------------------------------------------------------------

create or replace function public.assign_chat_session(
  p_session_id uuid,
  p_assignee_id uuid,
  p_team_id uuid default null,
  p_department_id uuid default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
  uid uuid := auth.uid();
  previous_owner uuid;
  target_name text;
begin
  if public.staff_rank(public.staff_role()) < 3 then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into sess
    from public.chat_sessions
   where id = p_session_id
   for update;

  if not found then
    raise exception 'chat session not found';
  end if;

  if sess.status in ('resolved', 'closed') then
    raise exception 'case is not active' using errcode = '22000';
  end if;

  if p_assignee_id is not null and not exists (
    select 1 from public.profiles p
    where p.id = p_assignee_id
      and p.staff_role is not null
  ) then
    raise exception 'assignee is not staff';
  end if;

  select a.assignee_id into previous_owner
    from public.chat_session_assignments a
   where a.session_id = p_session_id
     and a.status = 'accepted'
     and a.ended_at is null;

  perform public.end_active_assignment(p_session_id, 'transferred');

  target_name := case when p_assignee_id is null then null else public.staff_display_name(p_assignee_id) end;

  insert into public.chat_session_assignments (
    session_id, assignee_id, team_id, department_id, assigned_by,
    from_assignee_id, status, reason, created_at
  ) values (
    p_session_id, p_assignee_id, p_team_id, p_department_id, uid,
    previous_owner, 'accepted', p_reason, now()
  );

  perform set_config('app.chat_join', 'on', true);

  update public.chat_sessions
     set assigned_admin_id = p_assignee_id,
         assigned_admin_name = target_name,
         team_id = coalesce(p_team_id, sess.team_id),
         department_id = coalesce(p_department_id, sess.department_id),
         joined_at = case when p_assignee_id is null then null else coalesce(joined_at, now()) end,
         status = case
           when p_assignee_id is not null and status = 'waiting' then 'active'
           when p_assignee_id is null and status = 'active' then 'waiting'
           else status
         end
   where id = p_session_id
   returning * into sess;

  perform public.record_chat_case_event(
    p_session_id,
    case when previous_owner is null then 'assigned' else 'transfer' end,
    previous_owner::text,
    p_assignee_id::text,
    jsonb_build_object('reason', p_reason, 'team_id', p_team_id, 'department_id', p_department_id)
  );

  return jsonb_build_object(
    'ok', true,
    'session_id', sess.id,
    'status', sess.status,
    'assigned_admin_id', sess.assigned_admin_id,
    'assigned_admin_name', sess.assigned_admin_name
  );
end;
$$;

revoke all on function public.assign_chat_session(uuid, uuid, uuid, uuid, text) from public;
revoke all on function public.assign_chat_session(uuid, uuid, uuid, uuid, text) from anon;
grant execute on function public.assign_chat_session(uuid, uuid, uuid, uuid, text) to authenticated;

-- ------------------------------------------------------------------
-- 7. Offer to another agent (senior +)
-- ------------------------------------------------------------------

create or replace function public.offer_chat_session(
  p_session_id uuid,
  p_target_staff_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
  uid uuid := auth.uid();
  offer_id uuid;
begin
  if public.staff_rank(public.staff_role()) < 2 then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into sess
    from public.chat_sessions
   where id = p_session_id
   for update;

  if not found then
    raise exception 'chat session not found';
  end if;

  if sess.status in ('resolved', 'closed') then
    raise exception 'case is not active' using errcode = '22000';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_target_staff_id
      and p.staff_role is not null
  ) then
    raise exception 'target is not staff';
  end if;

  insert into public.chat_session_assignments (
    session_id, assignee_id, team_id, department_id, assigned_by, status, reason, created_at
  ) values (
    p_session_id, p_target_staff_id, sess.team_id, sess.department_id, uid, 'offered', p_reason, now()
  )
  returning id into offer_id;

  perform public.record_chat_case_event(
    p_session_id,
    'offered',
    uid::text,
    p_target_staff_id::text,
    jsonb_build_object('reason', p_reason, 'assignment_id', offer_id)
  );

  return jsonb_build_object('ok', true, 'assignment_id', offer_id);
exception
  when unique_violation then
    raise exception 'an offer is already pending for this case' using errcode = '23505';
end;
$$;

revoke all on function public.offer_chat_session(uuid, uuid, text) from public;
revoke all on function public.offer_chat_session(uuid, uuid, text) from anon;
grant execute on function public.offer_chat_session(uuid, uuid, text) to authenticated;

-- ------------------------------------------------------------------
-- 8. Respond to an assignment offer
-- ------------------------------------------------------------------

create or replace function public.respond_chat_assignment(
  p_assignment_id uuid,
  p_accept boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.chat_session_assignments%rowtype;
  sess public.chat_sessions%rowtype;
  uid uuid := auth.uid();
  previous_owner uuid;
  actor_name text;
begin
  select * into a
    from public.chat_session_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'assignment not found';
  end if;

  if a.status <> 'offered' then
    raise exception 'offer is no longer pending' using errcode = '22000';
  end if;

  if a.assignee_id <> uid then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into sess
    from public.chat_sessions
   where id = a.session_id
   for update;

  if sess.status in ('resolved', 'closed') then
    raise exception 'case is not active' using errcode = '22000';
  end if;

  if not p_accept then
    update public.chat_session_assignments
       set status = 'rejected',
           responded_at = now(),
           decision_reason = p_reason
     where id = p_assignment_id;

    perform public.record_chat_case_event(
      a.session_id, 'offer_rejected', uid::text, null,
      jsonb_build_object('reason', p_reason)
    );
    return jsonb_build_object('ok', true, 'accepted', false);
  end if;

  select assignee_id into previous_owner
    from public.chat_session_assignments
   where session_id = a.session_id
     and status = 'accepted'
     and ended_at is null;

  perform public.end_active_assignment(a.session_id, 'transferred');

  update public.chat_session_assignments
     set status = 'accepted',
         responded_at = now(),
         from_assignee_id = previous_owner
   where id = p_assignment_id;

  actor_name := public.staff_display_name(uid);

  perform set_config('app.chat_join', 'on', true);

  update public.chat_sessions
     set assigned_admin_id = uid,
         assigned_admin_name = actor_name,
         joined_at = coalesce(joined_at, now()),
         status = case when status = 'waiting' then 'active' else status end
   where id = a.session_id
   returning * into sess;

  perform public.record_chat_case_event(
    a.session_id, 'offer_accepted', previous_owner::text, uid::text,
    jsonb_build_object('assigned_admin_name', actor_name)
  );

  return jsonb_build_object(
    'ok', true,
    'accepted', true,
    'session_id', sess.id,
    'assigned_admin_id', sess.assigned_admin_id,
    'assigned_admin_name', sess.assigned_admin_name
  );
end;
$$;

revoke all on function public.respond_chat_assignment(uuid, boolean, text) from public;
revoke all on function public.respond_chat_assignment(uuid, boolean, text) from anon;
grant execute on function public.respond_chat_assignment(uuid, boolean, text) to authenticated;

-- ------------------------------------------------------------------
-- 9. Return to queue
-- ------------------------------------------------------------------

create or replace function public.return_chat_session_to_queue(
  p_session_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
  uid uuid := auth.uid();
  previous_owner uuid;
begin
  select * into sess
    from public.chat_sessions
   where id = p_session_id
   for update;

  if not found then
    raise exception 'chat session not found';
  end if;

  if sess.status in ('resolved', 'closed') then
    raise exception 'case is not active' using errcode = '22000';
  end if;

  if not public.is_active_assignee(p_session_id)
     and public.staff_rank(public.staff_role()) < 3 then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select assignee_id into previous_owner
    from public.chat_session_assignments
   where session_id = p_session_id
     and status = 'accepted'
     and ended_at is null;

  perform public.end_active_assignment(p_session_id, 'returned_to_queue');

  perform set_config('app.chat_join', 'on', true);

  update public.chat_sessions
     set assigned_admin_id = null,
         assigned_admin_name = null,
         joined_at = null,
         status = case when status = 'active' then 'waiting' else status end
   where id = p_session_id
   returning * into sess;

  perform public.record_chat_case_event(
    p_session_id, 'returned_to_queue', previous_owner::text, null,
    jsonb_build_object('reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'status', sess.status);
end;
$$;

revoke all on function public.return_chat_session_to_queue(uuid, text) from public;
revoke all on function public.return_chat_session_to_queue(uuid, text) from anon;
grant execute on function public.return_chat_session_to_queue(uuid, text) to authenticated;

-- ------------------------------------------------------------------
-- 10. Cancel a pending offer
-- ------------------------------------------------------------------

create or replace function public.cancel_chat_assignment_offer(
  p_assignment_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.chat_session_assignments%rowtype;
begin
  select * into a
    from public.chat_session_assignments
   where id = p_assignment_id
   for update;

  if not found then
    raise exception 'assignment not found';
  end if;

  if a.status <> 'offered' then
    raise exception 'offer is no longer pending' using errcode = '22000';
  end if;

  if a.assigned_by <> auth.uid()
     and public.staff_rank(public.staff_role()) < 3 then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.chat_session_assignments
     set status = 'cancelled',
         responded_at = now(),
         decision_reason = p_reason
   where id = p_assignment_id;

  perform public.record_chat_case_event(
    a.session_id, 'offer_cancelled', auth.uid()::text, null,
    jsonb_build_object('reason', p_reason)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cancel_chat_assignment_offer(uuid, text) from public;
revoke all on function public.cancel_chat_assignment_offer(uuid, text) from anon;
grant execute on function public.cancel_chat_assignment_offer(uuid, text) to authenticated;
