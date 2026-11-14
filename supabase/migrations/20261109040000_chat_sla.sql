-- ============================================================
-- M5: Live chat SLA tracking
--
-- Additive only. SLA deadlines are derived from real database
-- timestamps. No timers are invented: due dates come from policies,
-- first response comes from the first staff message, and breach is
-- evaluated against now() at read time (authoritative) and
-- materialized idempotently on next touch.
--
-- Policies are NOT seeded here. SLA targets are a business setting
-- and stay empty until an admin explicitly configures them.
-- ============================================================

-- ------------------------------------------------------------------
-- 1. Policy + pause + breach tables
-- ------------------------------------------------------------------

create table if not exists public.chat_sla_policies (
  id uuid primary key default gen_random_uuid(),
  priority text not null unique
    check (priority in ('low', 'normal', 'high', 'urgent', 'critical')),
  first_response_minutes integer check (first_response_minutes is null or first_response_minutes > 0),
  resolution_minutes integer check (resolution_minutes is null or resolution_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_sla_policies enable row level security;

drop policy if exists chat_sla_policies_staff_select on public.chat_sla_policies;
create policy chat_sla_policies_staff_select on public.chat_sla_policies
  for select to authenticated using (public.is_staff());

drop policy if exists chat_sla_policies_admin_all on public.chat_sla_policies;
create policy chat_sla_policies_admin_all on public.chat_sla_policies
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.chat_sla_pauses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  cycle integer not null default 1,
  reason text not null check (reason in ('waiting_client', 'hold')),
  paused_by uuid references auth.users (id) on delete set null,
  paused_at timestamptz not null default now(),
  resumed_at timestamptz
);

create index if not exists chat_sla_pauses_session_idx
  on public.chat_sla_pauses (session_id, paused_at desc);

create unique index if not exists chat_sla_pauses_one_open_idx
  on public.chat_sla_pauses (session_id)
  where resumed_at is null;

alter table public.chat_sla_pauses enable row level security;

drop policy if exists chat_sla_pauses_staff_select on public.chat_sla_pauses;
create policy chat_sla_pauses_staff_select on public.chat_sla_pauses
  for select to authenticated
  using (public.is_staff() and public.can_read_chat_session(session_id));

create table if not exists public.chat_sla_breaches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  cycle integer not null default 1,
  kind text not null check (kind in ('first_response', 'resolution')),
  due_at timestamptz not null,
  detected_at timestamptz not null default now(),
  unique (session_id, cycle, kind)
);

create index if not exists chat_sla_breaches_session_idx
  on public.chat_sla_breaches (session_id, detected_at desc);

alter table public.chat_sla_breaches enable row level security;

drop policy if exists chat_sla_breaches_staff_select on public.chat_sla_breaches;
create policy chat_sla_breaches_staff_select on public.chat_sla_breaches
  for select to authenticated
  using (public.is_staff() and public.can_read_chat_session(session_id));

-- ------------------------------------------------------------------
-- 2. SLA bookkeeping columns on chat_sessions
-- ------------------------------------------------------------------

alter table public.chat_sessions
  add column if not exists sla_policy_id uuid references public.chat_sla_policies (id) on delete set null,
  add column if not exists sla_cycle integer not null default 1,
  add column if not exists sla_started_at timestamptz,
  add column if not exists sla_paused_since timestamptz,
  add column if not exists sla_paused_ms bigint not null default 0,
  add column if not exists first_response_due_at timestamptz,
  add column if not exists first_response_at timestamptz,
  add column if not exists first_response_breached boolean not null default false,
  add column if not exists resolution_due_at timestamptz,
  add column if not exists resolution_breached boolean not null default false;

-- Initialize SLA start for existing rows without touching their status.
update public.chat_sessions
   set sla_started_at = coalesce(sla_started_at, created_at)
 where sla_started_at is null;

-- ------------------------------------------------------------------
-- 3. Deadline computation
-- ------------------------------------------------------------------

create or replace function public.apply_chat_sla_deadlines(
  p_session_id uuid,
  p_reset_first_response boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
  pol public.chat_sla_policies%rowtype;
  base timestamptz;
begin
  select * into sess from public.chat_sessions where id = p_session_id;
  if not found then
    return;
  end if;

  select * into pol
    from public.chat_sla_policies
   where priority = sess.priority and active
   limit 1;

  if not found then
    update public.chat_sessions
       set sla_policy_id = null,
           first_response_due_at = null,
           resolution_due_at = null
     where id = p_session_id;
    return;
  end if;

  base := coalesce(sess.sla_started_at, sess.created_at);

  update public.chat_sessions
     set sla_policy_id = pol.id,
         first_response_due_at = case
           when pol.first_response_minutes is null then null
           when sess.first_response_at is not null and not p_reset_first_response then first_response_due_at
           else base + make_interval(mins => pol.first_response_minutes)
         end,
         resolution_due_at = case
           when pol.resolution_minutes is null then null
           else base + make_interval(mins => pol.resolution_minutes)
         end
   where id = p_session_id;
end;
$$;

-- Internal helpers only: invoked from SECURITY DEFINER triggers/RPCs. They do
-- no caller authorization themselves, so they must not be callable directly by
-- any authenticated user.
revoke all on function public.apply_chat_sla_deadlines(uuid, boolean) from public;
revoke all on function public.apply_chat_sla_deadlines(uuid, boolean) from anon;
revoke all on function public.apply_chat_sla_deadlines(uuid, boolean) from authenticated;

-- ------------------------------------------------------------------
-- 4. Reconcile (idempotent breach materialization)
-- ------------------------------------------------------------------

create or replace function public.reconcile_chat_sla(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
  paused_ms bigint;
  open_pause_ms bigint;
  effective_now timestamptz;
  fr_deadline timestamptz;
  res_deadline timestamptz;
begin
  select * into sess from public.chat_sessions where id = p_session_id;
  if not found then
    return;
  end if;

  select coalesce(sum(extract(epoch from (coalesce(resumed_at, now()) - paused_at)) * 1000), 0)::bigint
    into paused_ms
    from public.chat_sla_pauses
   where session_id = p_session_id
     and cycle = sess.sla_cycle;

  select coalesce(sum(extract(epoch from (now() - paused_at)) * 1000), 0)::bigint
    into open_pause_ms
    from public.chat_sla_pauses
   where session_id = p_session_id
     and cycle = sess.sla_cycle
     and resumed_at is null;

  -- Deadline is pushed forward by any pause duration; never rewritten in the
  -- stored due columns, which stay the nominal policy deadline.
  fr_deadline := sess.first_response_due_at;
  res_deadline := sess.resolution_due_at;

  if fr_deadline is null and res_deadline is null then
    return;
  end if;

  if sess.first_response_at is null and fr_deadline is not null
     and now() > fr_deadline + make_interval(secs => (paused_ms + open_pause_ms) / 1000.0) then
    insert into public.chat_sla_breaches (session_id, cycle, kind, due_at, detected_at)
    values (p_session_id, sess.sla_cycle, 'first_response', fr_deadline, now())
    on conflict (session_id, cycle, kind) do nothing;

    update public.chat_sessions
       set first_response_breached = true
     where id = p_session_id and first_response_breached = false;
  end if;

  if sess.status not in ('resolved', 'closed') and res_deadline is not null
     and now() > res_deadline + make_interval(secs => (paused_ms + open_pause_ms) / 1000.0) then
    insert into public.chat_sla_breaches (session_id, cycle, kind, due_at, detected_at)
    values (p_session_id, sess.sla_cycle, 'resolution', res_deadline, now())
    on conflict (session_id, cycle, kind) do nothing;

    update public.chat_sessions
       set resolution_breached = true
     where id = p_session_id and resolution_breached = false;
  end if;
end;
$$;

revoke all on function public.reconcile_chat_sla(uuid) from public;
revoke all on function public.reconcile_chat_sla(uuid) from anon;
revoke all on function public.reconcile_chat_sla(uuid) from authenticated;

-- ------------------------------------------------------------------
-- 5. First response stamp (real message timestamp)
-- ------------------------------------------------------------------

create or replace function public.stamp_chat_first_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender_role = 'admin' and new.kind = 'message' then
    update public.chat_sessions
       set first_response_at = coalesce(first_response_at, new.created_at)
     where id = new.session_id
       and first_response_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_first_response on public.chat_messages;
create trigger trg_chat_first_response
after insert on public.chat_messages
for each row execute function public.stamp_chat_first_response();

-- ------------------------------------------------------------------
-- 6. Pause / resume
-- ------------------------------------------------------------------

create or replace function public.pause_chat_sla(p_session_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
begin
  if p_reason not in ('waiting_client', 'hold') then
    raise exception 'invalid pause reason';
  end if;
  if not public.can_write_chat_session(p_session_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into sess from public.chat_sessions where id = p_session_id for update;
  if not found then
    raise exception 'chat session not found';
  end if;
  if sess.status in ('resolved', 'closed') then
    return jsonb_build_object('ok', true, 'paused', false);
  end if;

  insert into public.chat_sla_pauses (session_id, cycle, reason, paused_by, paused_at)
  values (p_session_id, sess.sla_cycle, p_reason, auth.uid(), now())
  on conflict do nothing;

  update public.chat_sessions
     set sla_paused_since = coalesce(sla_paused_since, now())
   where id = p_session_id;

  return jsonb_build_object('ok', true, 'paused', true);
end;
$$;

revoke all on function public.pause_chat_sla(uuid, text) from public;
revoke all on function public.pause_chat_sla(uuid, text) from anon;
grant execute on function public.pause_chat_sla(uuid, text) to authenticated;

create or replace function public.resume_chat_sla(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
  delta_ms bigint;
begin
  select * into sess from public.chat_sessions where id = p_session_id for update;
  if not found then
    raise exception 'chat session not found';
  end if;

  if sess.sla_paused_since is null then
    return jsonb_build_object('ok', true, 'paused', false);
  end if;

  delta_ms := (extract(epoch from (now() - sess.sla_paused_since)) * 1000)::bigint;

  update public.chat_sla_pauses
     set resumed_at = now()
   where session_id = p_session_id
     and resumed_at is null;

  update public.chat_sessions
     set sla_paused_since = null,
         sla_paused_ms = coalesce(sla_paused_ms, 0) + greatest(delta_ms, 0)
   where id = p_session_id;

  return jsonb_build_object('ok', true, 'paused', false);
end;
$$;

revoke all on function public.resume_chat_sla(uuid) from public;
revoke all on function public.resume_chat_sla(uuid) from anon;
revoke all on function public.resume_chat_sla(uuid) from authenticated;

-- ------------------------------------------------------------------
-- 7. Priority change recompute
--    Before first response: both deadlines recompute. After first
--    response: first-response deadline is frozen, only resolution
--    recomputes. Existing breaches are never erased.
-- ------------------------------------------------------------------

create or replace function public.on_chat_priority_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.priority is distinct from old.priority then
    perform public.apply_chat_sla_deadlines(
      new.id,
      new.first_response_at is null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_priority_sla on public.chat_sessions;
create trigger trg_chat_priority_sla
after update of priority on public.chat_sessions
for each row
when (new.priority is distinct from old.priority)
execute function public.on_chat_priority_change();

-- ------------------------------------------------------------------
-- 8. Reopen starts a new SLA cycle
-- ------------------------------------------------------------------

create or replace function public.on_chat_reopen_sla()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('active', 'waiting', 'pending_client')
     and old.status in ('resolved', 'closed') then
    -- Close any pause still open on the previous cycle.
    update public.chat_sla_pauses
       set resumed_at = coalesce(resumed_at, now())
     where session_id = new.id
       and resumed_at is null;

    update public.chat_sessions
       set sla_cycle = coalesce(old.sla_cycle, 1) + 1,
           sla_started_at = now(),
           sla_paused_since = null,
           sla_paused_ms = 0,
           first_response_at = null,
           first_response_due_at = null,
           resolution_due_at = null,
           first_response_breached = false,
           resolution_breached = false
     where id = new.id;

    perform public.apply_chat_sla_deadlines(new.id, true);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_reopen_sla on public.chat_sessions;
create trigger trg_chat_reopen_sla
after update on public.chat_sessions
for each row
when (new.status is distinct from old.status)
execute function public.on_chat_reopen_sla();
