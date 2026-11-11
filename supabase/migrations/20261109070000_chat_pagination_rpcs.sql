-- ============================================================
-- M8: Live chat pagination + workspace RPCs
--
-- Additive only. Keyset pagination replaces the unpaginated
-- select("*") reads. Functions are SECURITY INVOKER so the caller's
-- RLS policies still apply. Client payloads never include staff-only
-- audit, notes or escalation internals.
-- ============================================================

-- ------------------------------------------------------------------
-- 1. Inbox page (keyset, filtered, counted)
-- ------------------------------------------------------------------

create or replace function public.chat_inbox_page(
  p_scope text default 'user',
  p_statuses text[] default null,
  p_priorities text[] default null,
  p_assignee uuid default null,
  p_team uuid default null,
  p_department uuid default null,
  p_has_escalation boolean default null,
  p_query text default null,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 30
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  lim integer := least(greatest(coalesce(p_limit, 30), 1), 100);
  staff_scope boolean := p_scope = 'admin';
  result_rows jsonb;
  result_counts jsonb;
  result_cursor jsonb;
begin
  if staff_scope and not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Counts reflect the whole filtered set, not just the current page.
  select jsonb_build_object(
           'waiting', count(*) filter (where v.status = 'waiting'),
           'active', count(*) filter (where v.status = 'active'),
           'pending_client', count(*) filter (where v.status = 'pending_client'),
           'resolved', count(*) filter (where v.status = 'resolved'),
           'closed', count(*) filter (where v.status = 'closed'),
           'all', count(*)
         )
    into result_counts
    from (
      select s.*
        from public.chat_sessions s
       where (not staff_scope or public.can_read_chat_session(s.id))
         and (p_statuses is null or s.status = any (p_statuses))
         and (p_priorities is null or s.priority = any (p_priorities))
         and (p_assignee is null or s.assigned_admin_id = p_assignee)
         and (p_team is null or s.team_id = p_team)
         and (p_department is null or s.department_id = p_department)
         and (
           p_has_escalation is null
           or (p_has_escalation and exists (
             select 1 from public.chat_escalations e
              where e.session_id = s.id and e.status in ('pending', 'accepted')
           ))
           or (not p_has_escalation and not exists (
             select 1 from public.chat_escalations e
              where e.session_id = s.id and e.status in ('pending', 'accepted')
           ))
         )
         and (
           p_query is null or p_query = ''
           or s.reference_id ilike '%' || p_query || '%'
           or coalesce(s.last_message_preview, '') ilike '%' || p_query || '%'
           or coalesce(s.assigned_admin_name, '') ilike '%' || p_query || '%'
         )
    ) v;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', p.id,
               'reference_id', p.reference_id,
               'user_id', p.user_id,
               'status', p.status,
               'priority', p.priority,
               'assigned_admin_id', p.assigned_admin_id,
               'assigned_admin_name', p.assigned_admin_name,
               'team_id', p.team_id,
               'department_id', p.department_id,
               'joined_at', p.joined_at,
               'welcome_sent_at', p.welcome_sent_at,
               'resolved_at', p.resolved_at,
               'closed_at', p.closed_at,
               'reopened_at', p.reopened_at,
               'reopen_count', p.reopen_count,
               'last_message_at', p.last_message_at,
               'last_message_preview', p.last_message_preview,
               'created_at', p.created_at,
               'updated_at', p.updated_at,
               'version', p.version,
               'first_response_due_at', case when staff_scope then p.first_response_due_at end,
               'resolution_due_at', case when staff_scope then p.resolution_due_at end,
               'first_response_at', case when staff_scope then p.first_response_at end,
               'first_response_breached', case when staff_scope then p.first_response_breached end,
               'resolution_breached', case when staff_scope then p.resolution_breached end,
               'sla_paused_since', case when staff_scope then p.sla_paused_since end,
               'active_escalations', case when staff_scope then (
                 select count(*) from public.chat_escalations e
                  where e.session_id = p.id and e.status in ('pending', 'accepted')
               ) end
             )
             order by p.updated_at desc, p.id desc
           ),
           '[]'::jsonb
         )
    into result_rows
    from (
      select s.*
        from public.chat_sessions s
       where (not staff_scope or public.can_read_chat_session(s.id))
         and (p_statuses is null or s.status = any (p_statuses))
         and (p_priorities is null or s.priority = any (p_priorities))
         and (p_assignee is null or s.assigned_admin_id = p_assignee)
         and (p_team is null or s.team_id = p_team)
         and (p_department is null or s.department_id = p_department)
         and (
           p_has_escalation is null
           or (p_has_escalation and exists (
             select 1 from public.chat_escalations e
              where e.session_id = s.id and e.status in ('pending', 'accepted')
           ))
           or (not p_has_escalation and not exists (
             select 1 from public.chat_escalations e
              where e.session_id = s.id and e.status in ('pending', 'accepted')
           ))
         )
         and (
           p_query is null or p_query = ''
           or s.reference_id ilike '%' || p_query || '%'
           or coalesce(s.last_message_preview, '') ilike '%' || p_query || '%'
           or coalesce(s.assigned_admin_name, '') ilike '%' || p_query || '%'
         )
         and (
           p_cursor_updated_at is null
           or (s.updated_at, s.id) < (p_cursor_updated_at, p_cursor_id)
         )
       order by s.updated_at desc, s.id desc
       limit lim + 1
    ) p;

  -- Return the cursor of the last row actually returned so the client can
  -- page strictly after it.
  select case
           when jsonb_array_length(result_rows) > lim then
             jsonb_build_object(
               'updated_at', result_rows -> (lim - 1) -> 'updated_at',
               'id', result_rows -> (lim - 1) -> 'id',
               'has_more', true
             )
           else
             jsonb_build_object('updated_at', null, 'id', null, 'has_more', false)
         end
    into result_cursor;

  if jsonb_array_length(result_rows) > lim then
    result_rows := (
      select coalesce(jsonb_agg(elem), '[]'::jsonb)
        from (
          select elem
            from jsonb_array_elements(result_rows) with ordinality as t(elem, ord)
           where ord <= lim
        ) trimmed
    );
  end if;

  return jsonb_build_object(
    'sessions', result_rows,
    'counts', result_counts,
    'next_cursor', result_cursor,
    'server_now', now()
  );
end;
$$;

revoke all on function public.chat_inbox_page(text, text[], text[], uuid, uuid, uuid, boolean, text, timestamptz, uuid, integer) from public;
revoke all on function public.chat_inbox_page(text, text[], text[], uuid, uuid, uuid, boolean, text, timestamptz, uuid, integer) from anon;
grant execute on function public.chat_inbox_page(text, text[], text[], uuid, uuid, uuid, boolean, text, timestamptz, uuid, integer) to authenticated;

-- ------------------------------------------------------------------
-- 2. Thread page (keyset, newest-first walk)
-- ------------------------------------------------------------------

create or replace function public.chat_messages_page(
  p_session_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  result_rows jsonb;
  has_more boolean := false;
  picked_count integer := 0;
begin
  -- Take the newest (lim + 1) messages so we can tell whether older history
  -- exists, keep the newest lim, then present them oldest-first for the UI.
  select count(*) into picked_count
    from (
      select 1
        from public.chat_messages m2
       where m2.session_id = p_session_id
         and (
           p_before_created_at is null
           or (m2.created_at, m2.id) < (p_before_created_at, p_before_id)
         )
       order by m2.created_at desc, m2.id desc
       limit lim + 1
    ) probe;

  has_more := picked_count > lim;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', m.id,
               'session_id', m.session_id,
               'sender_id', m.sender_id,
               'sender_role', m.sender_role,
               'sender_name', m.sender_name,
               'kind', m.kind,
               'message', m.message,
               'read', m.read,
               'created_at', m.created_at
             )
             order by m.created_at asc, m.id asc
           ),
           '[]'::jsonb
         )
    into result_rows
    from (
      select *
        from public.chat_messages m2
       where m2.session_id = p_session_id
         and (
           p_before_created_at is null
           or (m2.created_at, m2.id) < (p_before_created_at, p_before_id)
         )
       order by m2.created_at desc, m2.id desc
       limit lim
    ) m;

  return jsonb_build_object(
    'messages', result_rows,
    'has_more', has_more,
    'server_now', now()
  );
end;
$$;

revoke all on function public.chat_messages_page(uuid, timestamptz, uuid, integer) from public;
revoke all on function public.chat_messages_page(uuid, timestamptz, uuid, integer) from anon;
grant execute on function public.chat_messages_page(uuid, timestamptz, uuid, integer) to authenticated;

-- ------------------------------------------------------------------
-- 3. Staff case timeline (events + escalations, staff only)
-- ------------------------------------------------------------------

create or replace function public.chat_case_timeline(
  p_session_id uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  lim integer := least(greatest(coalesce(p_limit, 100), 1), 300);
  events jsonb;
  escalations jsonb;
  assignments jsonb;
begin
  if not public.is_staff() or not public.can_read_chat_session(p_session_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', e.id,
             'event_type', e.event_type,
             'actor_name', e.actor_name,
             'actor_role', e.actor_role,
             'from_value', e.from_value,
             'to_value', e.to_value,
             'metadata', e.metadata,
             'created_at', e.created_at
           ) order by e.created_at desc
         ), '[]'::jsonb)
    into events
    from (
      select * from public.chat_case_events ce
       where ce.session_id = p_session_id
       order by ce.created_at desc
       limit lim
    ) e;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', x.id,
             'target_type', x.target_type,
             'target_staff_id', x.target_staff_id,
             'target_role', x.target_role,
             'target_team_id', x.target_team_id,
             'target_department_id', x.target_department_id,
             'reason', x.reason,
             'status', x.status,
             'decision_reason', x.decision_reason,
             'created_at', x.created_at,
             'responded_at', x.responded_at
           ) order by x.created_at desc
         ), '[]'::jsonb)
    into escalations
    from (
      select * from public.chat_escalations esc
       where esc.session_id = p_session_id
       order by esc.created_at desc
       limit lim
    ) x;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', a.id,
             'assignee_id', a.assignee_id,
             'assignee_name', public.staff_display_name(a.assignee_id),
             'from_assignee_id', a.from_assignee_id,
             'status', a.status,
             'reason', a.reason,
             'decision_reason', a.decision_reason,
             'created_at', a.created_at,
             'ended_at', a.ended_at,
             'end_reason', a.end_reason
           ) order by a.created_at desc
         ), '[]'::jsonb)
    into assignments
    from (
      select * from public.chat_session_assignments sa
       where sa.session_id = p_session_id
       order by sa.created_at desc
       limit lim
    ) a;

  return jsonb_build_object(
    'events', events,
    'escalations', escalations,
    'assignments', assignments,
    'server_now', now()
  );
end;
$$;

revoke all on function public.chat_case_timeline(uuid, integer) from public;
revoke all on function public.chat_case_timeline(uuid, integer) from anon;
grant execute on function public.chat_case_timeline(uuid, integer) to authenticated;

-- ------------------------------------------------------------------
-- 4. Staff directory (supervisor+, for assignment pickers)
-- ------------------------------------------------------------------

create or replace function public.chat_staff_directory()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if public.staff_rank(public.staff_role()) < 2 then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', p.id,
             'name', coalesce(
               nullif(trim(p.full_name), ''),
               nullif(split_part(coalesce(p.email, ''), '@', 1), ''),
               'Support Agent'
             ),
             'staff_role', p.staff_role,
             'agent_status', p.agent_status,
             'active_cases', (
               select count(*) from public.chat_sessions s
                where s.assigned_admin_id = p.id
                  and s.status in ('waiting', 'active', 'pending_client')
             )
           ) order by public.staff_rank(p.staff_role) desc, p.full_name
         ), '[]'::jsonb)
    into result
    from public.profiles p
   where p.staff_role is not null;

  return jsonb_build_object('staff', result, 'server_now', now());
end;
$$;

revoke all on function public.chat_staff_directory() from public;
revoke all on function public.chat_staff_directory() from anon;
grant execute on function public.chat_staff_directory() to authenticated;

-- ------------------------------------------------------------------
-- 5. Department/team directory (staff, for routing pickers)
-- ------------------------------------------------------------------

create or replace function public.chat_routing_directory()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
           'departments', coalesce((
             select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'slug', d.slug) order by d.name)
               from public.support_departments d
              where d.active
           ), '[]'::jsonb),
           'teams', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'id', t.id, 'name', t.name, 'department_id', t.department_id
                    ) order by t.name)
               from public.support_teams t
              where t.active
           ), '[]'::jsonb)
         )
    into result;

  return result;
end;
$$;

revoke all on function public.chat_routing_directory() from public;
revoke all on function public.chat_routing_directory() from anon;
grant execute on function public.chat_routing_directory() to authenticated;

-- ------------------------------------------------------------------
-- 6. Customer contact lookup for staff (bypasses profiles RLS safely)
--
--    profiles RLS only exposes the caller's own row to non-admins, so a
--    non-admin agent cannot join customer names directly. This function is
--    SECURITY DEFINER but limited: it only resolves ids for chats the caller
--    may read, and only returns contact fields for those customers.
-- ------------------------------------------------------------------

create or replace function public.chat_customer_directory(p_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_staff() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', p.id,
             'name', coalesce(
               nullif(trim(p.full_name), ''),
               nullif(p.email, ''),
               'Client'
             ),
             'email', p.email,
             'phone', p.phone
           )
         ), '[]'::jsonb)
    into result
    from public.profiles p
   where p.id = any (p_ids)
     and exists (
       select 1 from public.chat_sessions s
        where s.user_id = p.id
          and public.can_read_chat_session(s.id)
     );

  return jsonb_build_object('customers', result);
end;
$$;

revoke all on function public.chat_customer_directory(uuid[]) from public;
revoke all on function public.chat_customer_directory(uuid[]) from anon;
grant execute on function public.chat_customer_directory(uuid[]) to authenticated;
