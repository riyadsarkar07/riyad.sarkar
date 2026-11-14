-- ============================================================
-- M2: Live chat case lifecycle
--
-- Additive only. Widens chat_sessions.status and priority checks,
-- adds resolved/closed/reopen bookkeeping and the append-only case
-- audit table. Does not delete sessions, messages or reference ids.
-- ============================================================

-- ------------------------------------------------------------------
-- 0. Ensure M0 prerequisites exist (idempotent)
--    Production may not have applied 20261029160000 yet. These clauses
--    mirror it exactly so this chain is safe to run on its own and does
--    nothing if M0 already ran.
-- ------------------------------------------------------------------

alter table public.chat_sessions
  add column if not exists priority text not null default 'normal',
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references auth.users (id) on delete set null;

create table if not exists public.chat_agent_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_name text,
  kind text not null default 'note' check (kind in ('note', 'escalation')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_agent_events_session_idx
  on public.chat_agent_events (session_id, created_at);

alter table public.chat_agent_events enable row level security;

-- ------------------------------------------------------------------
-- 1. Lifecycle columns
-- ------------------------------------------------------------------

alter table public.chat_sessions
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references auth.users (id) on delete set null,
  add column if not exists closed_via text,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopen_count integer not null default 0,
  add column if not exists version integer not null default 0,
  add column if not exists resolution_summary text;

-- ------------------------------------------------------------------
-- 2. Widen status / priority checks
--    Existing checks were created inline (auto-named) or explicitly,
--    so drop every check constraint that covers the column, then add
--    a single named replacement.
-- ------------------------------------------------------------------

do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'chat_sessions'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%status%'
       and pg_get_constraintdef(con.oid) ilike '%waiting%'
  loop
    execute format('alter table public.chat_sessions drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.chat_sessions
  add constraint chat_sessions_status_check
  check (status in ('waiting', 'active', 'pending_client', 'resolved', 'closed'));

do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'chat_sessions'
       and con.contype = 'c'
       -- Include the existing named priority constraint from M0.
       -- Otherwise M2 raises duplicate_object when adding the widened
       -- constraint and the escalation workspace cannot be deployed.
       and pg_get_constraintdef(con.oid) ilike '%priority%'
       and pg_get_constraintdef(con.oid) ilike '%urgent%'
  loop
    execute format('alter table public.chat_sessions drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.chat_sessions
  add constraint chat_sessions_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent', 'critical'));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chat_sessions_closed_via_check'
      and conrelid = 'public.chat_sessions'::regclass
  ) then
    alter table public.chat_sessions
      add constraint chat_sessions_closed_via_check
      check (closed_via is null or closed_via in ('supervisor', 'admin', 'system_retention'));
  end if;
end $$;

-- ------------------------------------------------------------------
-- 3. Reopen / close timestamp invariants
--    (kept separate from the existing resolved bookkeeping trigger)
-- ------------------------------------------------------------------

create or replace function public.chat_session_lifecycle_stamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at := coalesce(new.resolved_at, now());
  elsif new.status is distinct from 'resolved' and old.status = 'resolved' then
    new.resolved_at := null;
    new.resolved_by := null;
  end if;

  if new.status = 'closed' and old.status is distinct from 'closed' then
    new.closed_at := coalesce(new.closed_at, now());
  elsif new.status is distinct from 'closed' and old.status = 'closed' then
    new.closed_at := null;
    new.closed_by := null;
    new.closed_via := null;
  end if;

  if old.status in ('resolved', 'closed') and new.status in ('active', 'waiting', 'pending_client') then
    new.reopened_at := coalesce(new.reopened_at, now());
    new.reopen_count := coalesce(old.reopen_count, 0) + 1;
  end if;

  new.version := coalesce(old.version, 0) + 1;
  return new;
end;
$$;

drop trigger if exists trg_chat_session_lifecycle on public.chat_sessions;
create trigger trg_chat_session_lifecycle
before update on public.chat_sessions
for each row
when (
  new.status is distinct from old.status
  or new.priority is distinct from old.priority
  or new.assigned_admin_id is distinct from old.assigned_admin_id
)
execute function public.chat_session_lifecycle_stamps();

-- ------------------------------------------------------------------
-- 4. Append-only case audit
-- ------------------------------------------------------------------

create table if not exists public.chat_case_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  actor_name text,
  actor_role text,
  event_type text not null,
  from_value text,
  to_value text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_case_events_session_idx
  on public.chat_case_events (session_id, created_at desc);

create index if not exists chat_case_events_type_idx
  on public.chat_case_events (event_type, created_at desc);

alter table public.chat_case_events enable row level security;

-- No policies for anon/clients. Staff read is granted in M7 alongside the
-- case-access helper functions; inserts happen inside SECURITY DEFINER RPCs.

-- ------------------------------------------------------------------
-- 5. Internal audit helper (SECURITY DEFINER, used by RPCs)
-- ------------------------------------------------------------------

create or replace function public.record_chat_case_event(
  p_session_id uuid,
  p_event_type text,
  p_from text default null,
  p_to text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_name text;
begin
  select coalesce(
           nullif(trim(p.full_name), ''),
           nullif(split_part(coalesce(p.email, ''), '@', 1), ''),
           'System'
         )
    into actor_name
    from public.profiles p
   where p.id = actor;

  insert into public.chat_case_events (
    session_id, actor_id, actor_name, actor_role, event_type, from_value, to_value, metadata
  ) values (
    p_session_id, actor, coalesce(actor_name, 'System'), public.staff_role(),
    p_event_type, p_from, p_to, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.record_chat_case_event(uuid, text, text, text, jsonb) from public;
revoke all on function public.record_chat_case_event(uuid, text, text, text, jsonb) from anon;
