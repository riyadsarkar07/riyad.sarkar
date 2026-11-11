-- ============================================================
-- M4: Live chat escalation workflow
--
-- Additive only. Escalation is fully independent of the case
-- status: creating, accepting, rejecting or returning an
-- escalation never changes chat_sessions.status, priority or the
-- active assignment.
-- ============================================================

create table if not exists public.chat_escalations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  requested_by uuid references auth.users (id) on delete set null,
  target_type text not null check (target_type in ('staff', 'role', 'team', 'department')),
  target_staff_id uuid references public.profiles (id) on delete set null,
  target_role text,
  target_team_id uuid references public.support_teams (id) on delete set null,
  target_department_id uuid references public.support_departments (id) on delete set null,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'returned', 'cancelled', 'resolved')),
  decided_by uuid references auth.users (id) on delete set null,
  decision_reason text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  closed_at timestamptz
);

create index if not exists chat_escalations_session_idx
  on public.chat_escalations (session_id, created_at desc);

create index if not exists chat_escalations_status_idx
  on public.chat_escalations (status, created_at desc);

-- Only one active escalation per case at a time.
create unique index if not exists chat_escalations_one_active_idx
  on public.chat_escalations (session_id)
  where status in ('pending', 'accepted');

alter table public.chat_escalations enable row level security;

drop policy if exists chat_escalations_staff_select on public.chat_escalations;
create policy chat_escalations_staff_select on public.chat_escalations
  for select to authenticated
  using (public.is_staff() and public.can_read_chat_session(session_id));

-- No insert/update/delete policy: all writes go through RPCs below.

-- ------------------------------------------------------------------
-- 1. Create an escalation
-- ------------------------------------------------------------------

create or replace function public.create_chat_escalation(
  p_session_id uuid,
  p_target_type text,
  p_target_staff_id uuid default null,
  p_target_role text default null,
  p_target_team_id uuid default null,
  p_target_department_id uuid default null,
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
  my_rank integer := public.staff_rank(public.staff_role());
  escalation_id uuid;
begin
  if uid is null or public.staff_role() is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'a reason is required';
  end if;

  if p_target_type not in ('staff', 'role', 'team', 'department') then
    raise exception 'invalid escalation target type';
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

  if not public.can_read_chat_session(p_session_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_target_type = 'staff' then
    if p_target_staff_id is null then
      raise exception 'target staff is required';
    end if;
    if not exists (
      select 1 from public.profiles p
      where p.id = p_target_staff_id and p.staff_role is not null
    ) then
      raise exception 'target is not staff';
    end if;
    if p_target_staff_id = uid then
      raise exception 'cannot escalate to yourself';
    end if;
    if public.staff_rank(public.staff_role()) >= public.staff_rank(
      (select staff_role from public.profiles where id = p_target_staff_id)
    ) and my_rank < 3 then
      raise exception 'escalation target must have a higher role' using errcode = '42501';
    end if;
  elsif p_target_type = 'role' then
    if coalesce(p_target_role, '') not in ('agent', 'senior_agent', 'supervisor', 'admin') then
      raise exception 'invalid target role';
    end if;
    if public.staff_rank(p_target_role) <= my_rank then
      raise exception 'escalation target must be a higher role' using errcode = '42501';
    end if;
  elsif p_target_type = 'team' then
    if p_target_team_id is null or not exists (
      select 1 from public.support_teams t where t.id = p_target_team_id and t.active
    ) then
      raise exception 'invalid target team';
    end if;
  elsif p_target_type = 'department' then
    if p_target_department_id is null or not exists (
      select 1 from public.support_departments d where d.id = p_target_department_id and d.active
    ) then
      raise exception 'invalid target department';
    end if;
  end if;

  insert into public.chat_escalations (
    session_id, requested_by, target_type, target_staff_id, target_role,
    target_team_id, target_department_id, reason, status
  ) values (
    p_session_id, uid, p_target_type, p_target_staff_id, p_target_role,
    p_target_team_id, p_target_department_id, btrim(p_reason), 'pending'
  )
  returning id into escalation_id;

  perform public.record_chat_case_event(
    p_session_id,
    'escalation_created',
    null,
    p_target_type,
    jsonb_build_object(
      'escalation_id', escalation_id,
      'reason', btrim(p_reason),
      'target_staff_id', p_target_staff_id,
      'target_role', p_target_role,
      'target_team_id', p_target_team_id,
      'target_department_id', p_target_department_id
    )
  );

  return jsonb_build_object('ok', true, 'escalation_id', escalation_id);
exception
  when unique_violation then
    raise exception 'an escalation is already active for this case' using errcode = '23505';
end;
$$;

revoke all on function public.create_chat_escalation(uuid, text, uuid, text, uuid, uuid, text) from public;
revoke all on function public.create_chat_escalation(uuid, text, uuid, text, uuid, uuid, text) from anon;
grant execute on function public.create_chat_escalation(uuid, text, uuid, text, uuid, uuid, text) to authenticated;

-- ------------------------------------------------------------------
-- 2. Respond to an escalation
-- ------------------------------------------------------------------

create or replace function public.respond_chat_escalation(
  p_escalation_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.chat_escalations%rowtype;
  uid uuid := auth.uid();
  my_rank integer := public.staff_rank(public.staff_role());
  is_target boolean;
begin
  if uid is null or public.staff_role() is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_action not in ('accept', 'reject', 'return', 'cancel') then
    raise exception 'invalid escalation action';
  end if;

  select * into e
    from public.chat_escalations
   where id = p_escalation_id
   for update;

  if not found then
    raise exception 'escalation not found';
  end if;

  if e.status <> 'pending' then
    raise exception 'escalation is no longer pending' using errcode = '22000';
  end if;

  is_target :=
    (e.target_type = 'staff' and e.target_staff_id = uid)
    or (e.target_type = 'role' and e.target_role = public.staff_role())
    or (e.target_type = 'team' and public.is_team_member(e.target_team_id))
    or (e.target_type = 'department' and exists (
      select 1
        from public.support_team_members m
        join public.support_teams t on t.id = m.team_id
       where m.staff_id = uid
         and m.active
         and t.department_id = e.target_department_id
    ));

  if p_action = 'accept' then
    if not is_target and my_rank < 3 then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    update public.chat_escalations
       set status = 'accepted',
           decided_by = uid,
           decision_reason = p_reason,
           responded_at = now()
     where id = p_escalation_id;
  elsif p_action = 'reject' then
    if not is_target then
      raise exception 'only the target may reject an escalation' using errcode = '42501';
    end if;
    if p_reason is null or length(btrim(p_reason)) < 3 then
      raise exception 'a rejection reason is required';
    end if;
    update public.chat_escalations
       set status = 'rejected',
           decided_by = uid,
           decision_reason = btrim(p_reason),
           responded_at = now(),
           closed_at = now()
     where id = p_escalation_id;
  elsif p_action = 'return' then
    if my_rank < 3 then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    if p_reason is null or length(btrim(p_reason)) < 3 then
      raise exception 'a return reason is required';
    end if;
    update public.chat_escalations
       set status = 'returned',
           decided_by = uid,
           decision_reason = btrim(p_reason),
           responded_at = now(),
           closed_at = now()
     where id = p_escalation_id;
  else
    if e.requested_by <> uid and my_rank < 3 then
      raise exception 'not authorized' using errcode = '42501';
    end if;
    update public.chat_escalations
       set status = 'cancelled',
           decided_by = uid,
           decision_reason = p_reason,
           responded_at = now(),
           closed_at = now()
     where id = p_escalation_id;
  end if;

  perform public.record_chat_case_event(
    e.session_id,
    'escalation_' || p_action,
    'pending',
    p_action,
    jsonb_build_object('escalation_id', p_escalation_id, 'reason', p_reason)
  );

  -- Escalation never mutates case status, priority or assignment.
  return jsonb_build_object('ok', true, 'status', p_action);
end;
$$;

revoke all on function public.respond_chat_escalation(uuid, text, text) from public;
revoke all on function public.respond_chat_escalation(uuid, text, text) from anon;
grant execute on function public.respond_chat_escalation(uuid, text, text) to authenticated;

-- ------------------------------------------------------------------
-- 3. Auto-resolve escalations when a case is resolved or closed
-- ------------------------------------------------------------------

create or replace function public.settle_chat_escalations_on_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('resolved', 'closed')
     and old.status is distinct from new.status then
    update public.chat_escalations
       set status = 'resolved',
           closed_at = now(),
           decided_by = coalesce(decided_by, auth.uid()),
           decision_reason = coalesce(decision_reason, 'case closed')
     where session_id = new.id
       and status in ('pending', 'accepted');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_escalations_settle on public.chat_sessions;
create trigger trg_chat_escalations_settle
after update on public.chat_sessions
for each row
when (new.status is distinct from old.status)
execute function public.settle_chat_escalations_on_close();

-- ------------------------------------------------------------------
-- 4. Realtime: deliberately NOT published.
--    Escalations contain reasons and staff targets and must never
--    reach a customer's Realtime subscription. Staff UI polls/loads
--    via the secure RPC instead.
-- ------------------------------------------------------------------
