-- M10: live chat tab counts independent of the selected queue status.
-- Exact function definition introspected from connected production Supabase.
-- Only the FIRST of two p_statuses predicates is removed:
--   aggregate counts: all statuses subject to RLS, search/routing/priority;
--   session page: retains its original p_statuses predicate.
-- No table, RLS, policy, grants or existing chat data is modified.
CREATE OR REPLACE FUNCTION public.chat_inbox_page(p_scope text DEFAULT 'user'::text, p_statuses text[] DEFAULT NULL::text[], p_priorities text[] DEFAULT NULL::text[], p_assignee uuid DEFAULT NULL::uuid, p_team uuid DEFAULT NULL::uuid, p_department uuid DEFAULT NULL::uuid, p_has_escalation boolean DEFAULT NULL::boolean, p_query text DEFAULT NULL::text, p_cursor_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
         and true /* Count all statuses; p_statuses still filters queue rows below */
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
$function$;
