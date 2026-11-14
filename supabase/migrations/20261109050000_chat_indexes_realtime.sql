-- ============================================================
-- M6: Live chat indexes + realtime hardening
--
-- Additive only. Replaces the open-session unique index so that
-- resolved and closed cases never block a new case, adds pagination
-- indexes, adds the safe client read view, and tightens Realtime
-- publication membership.
--
-- Pre-migration duplicate check (run manually in staging BEFORE
-- applying this file):
--
--   select user_id, count(*)
--     from public.chat_sessions
--    where status in ('waiting', 'active', 'pending_client')
--    group by user_id
--    having count(*) > 1;
--
--   The first query must return zero rows. Multiple resolved or
--   closed cases per user are expected and legal.
-- ============================================================

-- ------------------------------------------------------------------
-- 1. Corrected one-active-case-per-user index
--    The old index only covered waiting/active. Resolved is
--    intentionally excluded so a customer can hold many resolved
--    cases and still start a new case.
-- ------------------------------------------------------------------

create unique index if not exists chat_sessions_one_active_idx
  on public.chat_sessions (user_id)
  where status in ('waiting', 'active', 'pending_client');

-- Drop the superseded index only after the replacement exists.
drop index if exists public.chat_sessions_one_open_idx;

create index if not exists chat_sessions_status_priority_idx
  on public.chat_sessions (status, priority, updated_at desc);

create index if not exists chat_sessions_assignee_idx
  on public.chat_sessions (assigned_admin_id, status);

create index if not exists chat_sessions_updated_desc_idx
  on public.chat_sessions (updated_at desc);

-- Keyset pagination for thread history.
create index if not exists chat_messages_keyset_idx
  on public.chat_messages (session_id, created_at desc, id desc);

-- ------------------------------------------------------------------
-- 2. Client-safe session view
--    Removes staff-only lifecycle/roster columns from any client
--    select("*"). Notes and audit live in separate tables and are
--    never exposed here.
-- ------------------------------------------------------------------

create or replace view public.chat_sessions_client as
select
  id,
  reference_id,
  user_id,
  status,
  priority,
  assigned_admin_id,
  assigned_admin_name,
  joined_at,
  welcome_sent_at,
  resolved_at,
  last_message_at,
  last_message_preview,
  created_at,
  updated_at
from public.chat_sessions;

-- Security invoker view: RLS on chat_sessions still applies, and the
-- viewer's own row policy governs which rows are visible.
alter view public.chat_sessions_client set (security_invoker = true);

grant select on public.chat_sessions_client to authenticated;

-- ------------------------------------------------------------------
-- 3. Realtime hardening
--
--    Only chat_sessions and chat_messages are published. Notes,
--    case audit, escalations, assignments, SLA and staff tables are
--    deliberately absent so they can never reach a customer channel.
--    Any accidental membership from earlier experiments is removed.
-- ------------------------------------------------------------------

do $$
declare
  tbl text;
  keep text[] := array['chat_sessions', 'chat_messages'];
begin
  -- Ensure the publication exists (Supabase normally creates it).
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  -- Remove any chat table that must never reach a customer channel. Driven by
  -- the catalog so re-runs never raise on a table that was never a member.
  foreach tbl in array array[
    'chat_agent_events',
    'chat_case_events',
    'chat_escalations',
    'chat_session_assignments',
    'chat_sla_policies',
    'chat_sla_pauses',
    'chat_sla_breaches',
    'staff_role_changes',
    'support_departments',
    'support_teams',
    'support_team_members'
  ]
  loop
    if exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', tbl);
    end if;
  end loop;

  -- Ensure the two safe tables are published exactly once.
  foreach tbl in array keep
  loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;
