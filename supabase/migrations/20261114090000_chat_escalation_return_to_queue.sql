-- M9: atomically return a pending or accepted escalation to the waiting queue.
-- This is a NEW additive migration, NOT a replay of M1-M8.
-- Deploy only after verifying existing function signatures, role grants,
-- production change window and staging regression tests.
-- Does not delete sessions, messages, users, assignments or audit history.

create or replace function public.return_chat_escalation_to_queue(
  p_escalation_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_escalation public.chat_escalations%rowtype;
  v_session public.chat_sessions%rowtype;
  v_result jsonb;
  v_actor uuid := auth.uid();
begin
  if v_actor is null or public.staff_rank(public.staff_role()) < 3 then
    raise exception 'only supervisors and admins may return escalations'
      using errcode = '42501';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'a return reason is required' using errcode = '22000';
  end if;

  -- Lock case first, then escalation, consistently with lifecycle closures.
  select e.session_id into v_session_id
    from public.chat_escalations e where e.id = p_escalation_id;
  if v_session_id is null then
    raise exception 'escalation not found' using errcode = '22000';
  end if;
  select * into v_session
    from public.chat_sessions s where s.id = v_session_id for update;
  if not found or v_session.status in ('resolved', 'closed') then
    raise exception 'case is already resolved or closed' using errcode = '22000';
  end if;
  select * into v_escalation
    from public.chat_escalations e where e.id = p_escalation_id for update;
  if not found or v_escalation.session_id <> v_session_id
     or v_escalation.status not in ('pending', 'accepted') then
    raise exception 'escalation is not eligible for return' using errcode = '22000';
  end if;

  -- Existing authorized RPC clears owner, finishes active assignment and
  -- records an append-only case event. All writes share one transaction.
  v_result := public.return_chat_session_to_queue(
    v_session_id, btrim(p_reason)
  );
  if coalesce(v_result->>'ok', 'false') <> 'true' then
    raise exception 'return-to-queue RPC did not confirm success';
  end if;

  -- The older return RPC leaves pending_client unchanged; unassigned cases
  -- must be in the waiting queue regardless of their previous open state.
  update public.chat_sessions
     set status = 'waiting'
   where id = v_session_id and status = 'pending_client';

  update public.chat_escalations
     set status = 'returned',
         decided_by = v_actor,
         decision_reason = btrim(p_reason),
         responded_at = now(),
         closed_at = now()
   where id = p_escalation_id;

  perform public.record_chat_case_event(
    v_session_id, 'escalation_return',
    v_escalation.status, 'returned',
    jsonb_build_object('escalation_id', p_escalation_id,
                       'reason', btrim(p_reason))
  );

  select * into v_session
    from public.chat_sessions where id = v_session_id;
  if v_session.status <> 'waiting'
     or v_session.assigned_admin_id is not null then
    raise exception 'waiting queue status could not be verified';
  end if;

  return jsonb_build_object(
    'ok', true, 'status', 'return',
    'case_status', v_session.status,
    'session_id', v_session.id,
    'escalation_status', 'returned'
  );
end;
$$;

revoke all on function public.return_chat_escalation_to_queue(uuid, text)
  from public, anon;
grant execute on function public.return_chat_escalation_to_queue(uuid, text)
  to authenticated;
