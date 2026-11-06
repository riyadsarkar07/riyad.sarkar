-- Live chat agent workspace: priority, resolve bookkeeping, admin-only notes
-- and escalation records.
--
-- Additive only. Does not drop tables, sessions, or messages. Does not merge
-- live chat with support tickets, enquiries, or appointments.
--
-- Apply this through the existing Supabase workflow. Pushing the file to
-- GitHub does not run it against the project.

-- ------------------------------------------------------------------
-- 1. Session priority + resolution bookkeeping
-- ------------------------------------------------------------------

alter table public.chat_sessions
  add column if not exists priority text not null default 'normal',
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references auth.users (id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chat_sessions_priority_check'
      and conrelid = 'public.chat_sessions'::regclass
  ) then
    alter table public.chat_sessions
      add constraint chat_sessions_priority_check
      check (priority in ('low', 'normal', 'high', 'urgent'));
  end if;
end $$;

create index if not exists chat_sessions_priority_idx
  on public.chat_sessions (priority);

-- ------------------------------------------------------------------
-- 2. Admin-only notes and escalation records
--    Kept in a separate table so clients can never read internal notes,
--    even through Realtime payloads on chat_sessions.
-- ------------------------------------------------------------------

create table if not exists public.chat_agent_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_name text,
  kind text not null default 'note'
    check (kind in ('note', 'escalation')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_agent_events_session_idx
  on public.chat_agent_events (session_id, created_at);

alter table public.chat_agent_events enable row level security;

drop policy if exists chat_agent_events_admin_select on public.chat_agent_events;
create policy chat_agent_events_admin_select on public.chat_agent_events
  for select to authenticated
  using (public.is_admin());

drop policy if exists chat_agent_events_admin_insert on public.chat_agent_events;
create policy chat_agent_events_admin_insert on public.chat_agent_events
  for insert to authenticated
  with check (public.is_admin() and author_id = auth.uid());

grant select, insert on public.chat_agent_events to authenticated;

-- ------------------------------------------------------------------
-- 3. Guard session updates: keep immutable fields, lock agent-only
--    fields for non-admins, and maintain resolved bookkeeping.
-- ------------------------------------------------------------------

create or replace function public.protect_chat_session_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.reference_id := old.reference_id;
  new.user_id := old.user_id;

  if current_setting('app.chat_join', true) is distinct from 'on' then
    new.assigned_admin_id := old.assigned_admin_id;
    new.assigned_admin_name := old.assigned_admin_name;
    new.joined_at := old.joined_at;
    new.welcome_sent_at := old.welcome_sent_at;
  else
    if old.assigned_admin_id is not null then
      new.assigned_admin_id := old.assigned_admin_id;
      new.assigned_admin_name := old.assigned_admin_name;
      new.joined_at := old.joined_at;
    end if;
    if old.welcome_sent_at is not null then
      new.welcome_sent_at := old.welcome_sent_at;
    end if;
  end if;

  -- Resolution timestamps follow the status. Reopening clears them.
  -- Only admins are recorded as the resolver; client-initiated closes leave
  -- resolved_by null so the agent view never credits a client as staff.
  if new.status = 'closed' then
    if old.status = 'closed' and old.resolved_at is not null then
      new.resolved_at := old.resolved_at;
      new.resolved_by := old.resolved_by;
    else
      new.resolved_at := coalesce(old.resolved_at, now());
      new.resolved_by := case when public.is_admin() then coalesce(old.resolved_by, auth.uid()) else old.resolved_by end;
    end if;
  else
    new.resolved_at := null;
    new.resolved_by := null;
  end if;

  if not public.is_admin() then
    new.priority := old.priority;
    if new.status is distinct from old.status and new.status is distinct from 'closed' then
      new.status := old.status;
    end if;
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------------
-- 4. Realtime for the admin notes feed (admin RLS applies)
-- ------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_agent_events;
  exception when duplicate_object then
    null;
  end;
end $$;
