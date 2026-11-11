-- ============================================================
-- M7: Live chat staff RLS + lifecycle guards
--
-- Additive, security-tightening only. Clients lose the ability to
-- write chat_sessions directly (status changes now require an
-- authorized RPC). Staff gain read/write scoped by the case-access
-- helpers. Internal notes, audit and escalations remain closed to
-- clients.
-- ============================================================

-- ------------------------------------------------------------------
-- 1. chat_sessions row policies
-- ------------------------------------------------------------------

-- Clients may read only their own sessions (unchanged). Staff may read
-- sessions they can access per the permission matrix.
drop policy if exists chat_sessions_select on public.chat_sessions;
create policy chat_sessions_select on public.chat_sessions
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (public.is_staff() and public.can_read_chat_session(id))
  );

-- Clients may still create their own session row (waiter flow).
drop policy if exists chat_sessions_insert on public.chat_sessions;
create policy chat_sessions_insert on public.chat_sessions
  for insert to authenticated
  with check (user_id = auth.uid());

-- Remove the legacy client UPDATE policy: status/assignment changes must
-- go through SECURITY DEFINER RPCs. Clients get no direct UPDATE.
drop policy if exists chat_sessions_user_update on public.chat_sessions;

-- Staff direct UPDATE is limited to cases they may write. Lifecycle fields
-- are still validated by the trigger below.
drop policy if exists chat_sessions_staff_update on public.chat_sessions;
create policy chat_sessions_staff_update on public.chat_sessions
  for update to authenticated
  using (public.is_staff() and public.can_write_chat_session(id))
  with check (public.is_staff() and public.can_write_chat_session(id));

drop policy if exists chat_sessions_admin_all on public.chat_sessions;
create policy chat_sessions_admin_all on public.chat_sessions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------------
-- 2. chat_messages row policies
-- ------------------------------------------------------------------

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
    or public.is_admin()
    or (public.is_staff() and public.can_read_chat_session(session_id))
  );

-- Clients may insert into their own active or resolved case (replying to a
-- resolved case is a legitimate reopen trigger).
drop policy if exists chat_messages_user_insert on public.chat_messages;
create policy chat_messages_user_insert on public.chat_messages
  for insert to authenticated
  with check (
    sender_role = 'user'
    and exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id
        and s.user_id = auth.uid()
        and s.status in ('waiting', 'active', 'pending_client', 'resolved')
    )
  );

-- Staff may insert only where they may write (assigned agent or supervisor+).
drop policy if exists chat_messages_admin_insert on public.chat_messages;
create policy chat_messages_admin_insert on public.chat_messages
  for insert to authenticated
  with check (
    sender_role = 'admin'
    and public.is_staff()
    and public.can_write_chat_session(session_id)
  );

drop policy if exists chat_messages_user_update_read on public.chat_messages;
create policy chat_messages_user_update_read on public.chat_messages
  for update to authenticated
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  )
  with check (read = true);

drop policy if exists chat_messages_admin_update on public.chat_messages;
create policy chat_messages_admin_update on public.chat_messages
  for update to authenticated
  using (public.is_staff() and public.can_read_chat_session(session_id))
  with check (public.is_staff() and public.can_read_chat_session(session_id));

-- ------------------------------------------------------------------
-- 3. Message preparation + reply authorization
--    Staff includes agents now (previously only is_admin()).
-- ------------------------------------------------------------------

create or replace function public.prepare_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  sess public.chat_sessions%rowtype;
begin
  new.sender_id := auth.uid();
  if public.is_staff() then
    new.sender_role := 'admin';
  else
    new.sender_role := 'user';
  end if;

  select * into sess from public.chat_sessions where id = new.session_id;
  if not found then
    raise exception 'chat session not found';
  end if;

  if new.sender_role = 'admin' then
    if sess.status in ('resolved', 'closed') then
      raise exception 'case is not active' using errcode = '22000';
    end if;
    if not public.can_write_chat_session(new.session_id) then
      raise exception 'not authorized to reply to this case' using errcode = '42501';
    end if;
  else
    if sess.user_id <> auth.uid() then
      raise exception 'not authorized' using errcode = '42501';
    end if;
  end if;

  if current_setting('app.allow_chat_welcome', true) is distinct from 'on'
     or new.sender_role is distinct from 'admin' then
    new.kind := 'message';
  else
    new.kind := 'welcome';
  end if;

  select coalesce(
           nullif(trim(p.full_name), ''),
           nullif(split_part(coalesce(p.email, ''), '@', 1), ''),
           case when new.sender_role = 'admin' then 'Support Agent' else 'Client' end
         )
    into display_name
    from public.profiles p
   where p.id = new.sender_id;
  new.sender_name := coalesce(
    display_name,
    case when new.sender_role = 'admin' then 'Support Agent' else 'Client' end
  );
  return new;
end;
$$;

drop trigger if exists trg_chat_messages_prepare on public.chat_messages;
create trigger trg_chat_messages_prepare
before insert on public.chat_messages
for each row execute function public.prepare_chat_message();

-- ------------------------------------------------------------------
-- 4. Session update guard
--    Immutable identity, client no-op, and invalid transitions blocked.
--    SECURITY DEFINER RPCs set app.chat_join to update ownership fields.
-- ------------------------------------------------------------------

create or replace function public.protect_chat_session_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  -- SECURITY INVOKER is deliberate: current_user reflects the real caller.
  -- A direct PostgREST write runs as `authenticated`/`anon`, whereas every
  -- privileged path (SECURITY DEFINER RPCs and triggers) runs as the owner.
  privileged_context boolean := current_user not in ('authenticated', 'anon');
begin
  new.reference_id := old.reference_id;
  new.user_id := old.user_id;

  if not privileged_context then
    new.assigned_admin_id := old.assigned_admin_id;
    new.assigned_admin_name := old.assigned_admin_name;
    new.joined_at := old.joined_at;
  end if;

  if not privileged_context then
    -- Direct table writes (clients and staff alike) must never change
    -- lifecycle, routing or priority fields. Those go through the RPCs.
    new.status := old.status;
    new.priority := old.priority;
    new.resolved_at := old.resolved_at;
    new.resolved_by := old.resolved_by;
    new.closed_at := old.closed_at;
    new.closed_by := old.closed_by;
    new.closed_via := old.closed_via;
    new.reopened_at := old.reopened_at;
    new.reopen_count := old.reopen_count;
    new.department_id := old.department_id;
    new.team_id := old.team_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_chat_sessions_protect on public.chat_sessions;
create trigger trg_chat_sessions_protect
before update on public.chat_sessions
for each row execute function public.protect_chat_session_update();

-- ------------------------------------------------------------------
-- 5. Resolve / close / reopen RPCs (authorized roles only)
-- ------------------------------------------------------------------

create or replace function public.resolve_chat_session(
  p_session_id uuid,
  p_summary text default null
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
begin
  select * into sess from public.chat_sessions where id = p_session_id for update;
  if not found then
    raise exception 'chat session not found';
  end if;
  if sess.status in ('resolved', 'closed') then
    raise exception 'case is already resolved' using errcode = '22000';
  end if;
  if not (public.is_active_assignee(p_session_id) or my_rank >= 3) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.chat_sessions
     set status = 'resolved',
         resolution_summary = nullif(btrim(coalesce(p_summary, '')), ''),
         resolved_at = now(),
         resolved_by = uid
   where id = p_session_id
   returning * into sess;

  perform public.end_active_assignment(p_session_id, 'completed');
  perform public.resume_chat_sla(p_session_id);

  perform public.record_chat_case_event(
    p_session_id, 'resolved', null, 'resolved',
    jsonb_build_object('summary', p_summary)
  );

  return jsonb_build_object('ok', true, 'status', sess.status, 'resolved_at', sess.resolved_at);
end;
$$;

revoke all on function public.resolve_chat_session(uuid, text) from public;
revoke all on function public.resolve_chat_session(uuid, text) from anon;
grant execute on function public.resolve_chat_session(uuid, text) to authenticated;

create or replace function public.close_chat_session(
  p_session_id uuid,
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
  my_role text := public.staff_role();
begin
  if public.staff_rank(my_role) < 3 then
    raise exception 'only supervisors and admins may close cases' using errcode = '42501';
  end if;

  select * into sess from public.chat_sessions where id = p_session_id for update;
  if not found then
    raise exception 'chat session not found';
  end if;
  if sess.status = 'closed' then
    return jsonb_build_object('ok', true, 'status', sess.status);
  end if;

  update public.chat_sessions
     set status = 'closed',
         closed_at = now(),
         closed_by = uid,
         closed_via = case when my_role = 'admin' then 'admin' else 'supervisor' end
   where id = p_session_id
   returning * into sess;

  perform public.end_active_assignment(p_session_id, 'closed');
  perform public.resume_chat_sla(p_session_id);

  perform public.record_chat_case_event(
    p_session_id, 'closed', null, 'closed',
    jsonb_build_object('reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'status', sess.status, 'closed_at', sess.closed_at);
end;
$$;

revoke all on function public.close_chat_session(uuid, text) from public;
revoke all on function public.close_chat_session(uuid, text) from anon;
grant execute on function public.close_chat_session(uuid, text) to authenticated;

create or replace function public.reopen_chat_session(
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
  my_rank integer := public.staff_rank(public.staff_role());
  other_open integer;
begin
  if public.staff_role() is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'a reopen reason is required';
  end if;

  select * into sess from public.chat_sessions where id = p_session_id for update;
  if not found then
    raise exception 'chat session not found';
  end if;
  if sess.status not in ('resolved', 'closed') then
    raise exception 'case is not resolved or closed' using errcode = '22000';
  end if;

  -- Senior+ may reopen resolved; only supervisor+ may reopen closed.
  if sess.status = 'closed' and my_rank < 3 then
    raise exception 'only supervisors and admins may reopen a closed case' using errcode = '42501';
  end if;
  if sess.status = 'resolved' and my_rank < 2 then
    raise exception 'not authorized to reopen' using errcode = '42501';
  end if;

  -- A reopen must not create a second active case for the same client.
  select count(*) into other_open
    from public.chat_sessions
   where user_id = sess.user_id
     and id <> sess.id
     and status in ('waiting', 'active', 'pending_client');
  if other_open > 0 then
    raise exception 'client already has another active case' using errcode = '23505';
  end if;

  perform set_config('app.chat_join', 'on', true);

  update public.chat_sessions
     set status = 'active',
         resolved_at = null,
         resolved_by = null,
         closed_at = null,
         closed_by = null,
         closed_via = null
   where id = p_session_id
   returning * into sess;

  perform public.record_chat_case_event(
    p_session_id, 'reopened', null, 'active',
    jsonb_build_object('reason', btrim(p_reason))
  );

  return jsonb_build_object('ok', true, 'status', sess.status, 'reopen_count', sess.reopen_count);
end;
$$;

revoke all on function public.reopen_chat_session(uuid, text) from public;
revoke all on function public.reopen_chat_session(uuid, text) from anon;
grant execute on function public.reopen_chat_session(uuid, text) to authenticated;

-- ------------------------------------------------------------------
-- 6. Priority RPC (critical requires supervisor+)
-- ------------------------------------------------------------------

create or replace function public.set_chat_priority(
  p_session_id uuid,
  p_priority text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
begin
  if p_priority not in ('low', 'normal', 'high', 'urgent', 'critical') then
    raise exception 'invalid priority';
  end if;
  if not public.can_write_chat_session(p_session_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_priority = 'critical' and public.staff_rank(public.staff_role()) < 3 then
    raise exception 'only supervisors and admins may set critical priority' using errcode = '42501';
  end if;

  select * into sess from public.chat_sessions where id = p_session_id for update;
  if not found then
    raise exception 'chat session not found';
  end if;
  if sess.status in ('resolved', 'closed') then
    raise exception 'case is not active' using errcode = '22000';
  end if;
  if sess.priority = p_priority then
    return jsonb_build_object('ok', true, 'priority', p_priority);
  end if;

  update public.chat_sessions set priority = p_priority where id = p_session_id;

  perform public.record_chat_case_event(
    p_session_id, 'priority_changed', sess.priority, p_priority, '{}'::jsonb
  );

  return jsonb_build_object('ok', true, 'priority', p_priority);
end;
$$;

revoke all on function public.set_chat_priority(uuid, text) from public;
revoke all on function public.set_chat_priority(uuid, text) from anon;
grant execute on function public.set_chat_priority(uuid, text) to authenticated;

-- ------------------------------------------------------------------
-- 7. Pending-client RPC (pause) and resume-on-client-reply
-- ------------------------------------------------------------------

create or replace function public.mark_chat_pending_client(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
begin
  if not public.can_write_chat_session(p_session_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into sess from public.chat_sessions where id = p_session_id for update;
  if not found then
    raise exception 'chat session not found';
  end if;
  if sess.status not in ('active', 'pending_client') then
    raise exception 'case must be active' using errcode = '22000';
  end if;

  update public.chat_sessions set status = 'pending_client' where id = p_session_id;
  perform public.pause_chat_sla(p_session_id, 'waiting_client');
  perform public.record_chat_case_event(p_session_id, 'pending_client', sess.status, 'pending_client', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'status', 'pending_client');
end;
$$;

revoke all on function public.mark_chat_pending_client(uuid) from public;
revoke all on function public.mark_chat_pending_client(uuid) from anon;
grant execute on function public.mark_chat_pending_client(uuid) to authenticated;

-- ------------------------------------------------------------------
-- 8. Client reply reopens pending_client / resolved cases
--    Extends the touch trigger so status stays consistent with a real
--    customer message, and resumes SLA on activity. Reopen is bounded:
--    only within the reopen window and never if another active case
--    exists (which would violate the one-active-case index).
-- ------------------------------------------------------------------

create or replace function public.touch_chat_session_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
  other_open integer;
  can_reopen boolean := false;
begin
  select * into sess from public.chat_sessions where id = new.session_id;

  if new.sender_role = 'user' and sess.status = 'resolved' then
    select count(*) into other_open
      from public.chat_sessions
     where user_id = sess.user_id
       and id <> sess.id
       and status in ('waiting', 'active', 'pending_client');
    can_reopen := other_open = 0
      and sess.resolved_at is not null
      and sess.resolved_at > now() - interval '72 hours';
  end if;

  update public.chat_sessions
     set last_message_at = new.created_at,
         last_message_preview = left(new.message, 140),
         status = case
           when status = 'closed' then status
           when new.sender_role = 'admin' and status = 'waiting' then 'active'
           when new.sender_role = 'user' and status = 'pending_client' then 'active'
           when new.sender_role = 'user' and status = 'resolved' and can_reopen then 'active'
           else status
         end
   where id = new.session_id;

  if new.sender_role = 'user' then
    perform public.resume_chat_sla(new.session_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_messages_touch on public.chat_messages;
create trigger trg_chat_messages_touch
after insert on public.chat_messages
for each row execute function public.touch_chat_session_on_message();

-- ------------------------------------------------------------------
-- 8b. Client leaves / ends their own case
--
--     A customer may end their own case, but that maps to `resolved`
--     (a subject-level resolution), never to `closed`. Only supervisors
--     and admins may close/archive. resolved_by stays null so the case
--     never credits a customer as staff.
-- ------------------------------------------------------------------

create or replace function public.client_end_chat_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
begin
  select * into sess from public.chat_sessions where id = p_session_id for update;
  if not found then
    raise exception 'chat session not found';
  end if;
  if sess.user_id <> auth.uid() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if sess.status in ('resolved', 'closed') then
    return jsonb_build_object('ok', true, 'status', sess.status);
  end if;

  update public.chat_sessions
     set status = 'resolved',
         resolved_at = now(),
         resolved_by = null
   where id = p_session_id
   returning * into sess;

  perform public.end_active_assignment(p_session_id, 'completed');
  perform public.resume_chat_sla(p_session_id);

  perform public.record_chat_case_event(
    p_session_id, 'client_ended', null, 'resolved', '{}'::jsonb
  );

  return jsonb_build_object('ok', true, 'status', sess.status);
end;
$$;

revoke all on function public.client_end_chat_session(uuid) from public;
revoke all on function public.client_end_chat_session(uuid) from anon;
grant execute on function public.client_end_chat_session(uuid) to authenticated;

-- ------------------------------------------------------------------
-- 8c. Staff join = claim + one-time welcome (replaces legacy admin join)
--
--     Wraps claim semantics so the existing server action keeps working,
--     while also creating the assignment row that authorizes replies.
-- ------------------------------------------------------------------

create or replace function public.join_chat_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
  uid uuid := auth.uid();
  owner uuid;
  admin_name text;
  welcome_text text;
  did_join boolean := false;
  did_welcome boolean := false;
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
    return jsonb_build_object(
      'ok', true, 'joined', false, 'welcome', false,
      'status', sess.status,
      'admin_name', sess.assigned_admin_name,
      'assigned_admin_id', sess.assigned_admin_id,
      'reference_id', sess.reference_id,
      'user_id', sess.user_id
    );
  end if;

  select a.assignee_id into owner
    from public.chat_session_assignments a
   where a.session_id = p_session_id
     and a.status = 'accepted'
     and a.ended_at is null;

  if owner is not null and owner <> uid then
    raise exception 'case is already assigned' using errcode = '23505';
  end if;

  admin_name := public.staff_display_name(uid);

  if owner is null then
    insert into public.chat_session_assignments (
      session_id, assignee_id, team_id, department_id, assigned_by, status, created_at
    ) values (
      p_session_id, uid, sess.team_id, sess.department_id, uid, 'accepted', now()
    );
    did_join := true;
  end if;

  perform set_config('app.chat_join', 'on', true);

  update public.chat_sessions
     set assigned_admin_id = uid,
         assigned_admin_name = admin_name,
         joined_at = coalesce(joined_at, now()),
         status = case when status = 'waiting' then 'active' else status end
   where id = p_session_id
   returning * into sess;

  if sess.welcome_sent_at is null then
    welcome_text :=
      'Thanks for contacting our team. I''m '
      || coalesce(sess.assigned_admin_name, admin_name)
      || ', and I''ll be helping you today. The reference ID for your issue is '
      || coalesce(sess.reference_id, '')
      || '.';
    begin
      perform set_config('app.allow_chat_welcome', 'on', true);
      insert into public.chat_messages (
        session_id, sender_id, sender_role, sender_name, message, kind
      ) values (
        p_session_id,
        coalesce(sess.assigned_admin_id, uid),
        'admin',
        coalesce(sess.assigned_admin_name, admin_name),
        welcome_text,
        'welcome'
      );
      did_welcome := true;
    exception
      when unique_violation then
        did_welcome := false;
    end;
    update public.chat_sessions
       set welcome_sent_at = coalesce(welcome_sent_at, now())
     where id = p_session_id
     returning * into sess;
  end if;

  if did_join then
    perform public.record_chat_case_event(
      p_session_id, 'claimed', null, uid::text,
      jsonb_build_object('assigned_admin_name', admin_name)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'joined', did_join,
    'welcome', did_welcome,
    'status', sess.status,
    'admin_name', sess.assigned_admin_name,
    'assigned_admin_id', sess.assigned_admin_id,
    'reference_id', sess.reference_id,
    'user_id', sess.user_id
  );
end;
$$;

revoke all on function public.join_chat_session(uuid) from public;
revoke all on function public.join_chat_session(uuid) from anon;
grant execute on function public.join_chat_session(uuid) to authenticated;

-- ------------------------------------------------------------------
-- 9. Audit + escalation read access for staff (client never)
-- ------------------------------------------------------------------

drop policy if exists chat_agent_events_admin_select on public.chat_agent_events;
create policy chat_agent_events_staff_select on public.chat_agent_events
  for select to authenticated
  using (public.is_staff() and public.can_read_chat_session(session_id));

drop policy if exists chat_agent_events_admin_insert on public.chat_agent_events;
create policy chat_agent_events_staff_insert on public.chat_agent_events
  for insert to authenticated
  with check (
    public.is_staff()
    and author_id = auth.uid()
    and public.can_read_chat_session(session_id)
  );

drop policy if exists chat_case_events_staff_select on public.chat_case_events;
create policy chat_case_events_staff_select on public.chat_case_events
  for select to authenticated
  using (public.is_staff() and public.can_read_chat_session(session_id));

-- ------------------------------------------------------------------
-- 10. Privilege hygiene for new tables
-- ------------------------------------------------------------------

revoke all on public.chat_agent_events from anon;
revoke all on public.chat_case_events from anon;
revoke all on public.chat_escalations from anon;
revoke all on public.chat_session_assignments from anon;
revoke all on public.chat_sla_policies from anon;
revoke all on public.chat_sla_pauses from anon;
revoke all on public.chat_sla_breaches from anon;
revoke all on public.staff_role_changes from anon;
revoke all on public.support_departments from anon;
revoke all on public.support_teams from anon;
revoke all on public.support_team_members from anon;

grant select on public.chat_agent_events to authenticated;
grant select, insert on public.chat_agent_events to authenticated;
grant select on public.chat_case_events to authenticated;
grant select on public.chat_escalations to authenticated;
grant select on public.chat_session_assignments to authenticated;
grant select on public.chat_sla_policies to authenticated;
grant select on public.chat_sla_pauses to authenticated;
grant select on public.chat_sla_breaches to authenticated;
grant select on public.staff_role_changes to authenticated;
grant select on public.support_departments to authenticated;
grant select on public.support_teams to authenticated;
grant select on public.support_team_members to authenticated;
