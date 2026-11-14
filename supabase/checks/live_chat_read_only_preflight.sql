-- Live Support: read-only database preflight (no schema or data mutation).
-- Run manually in the intended project's SQL Editor after confirming the
-- project URL. This is a diagnostic, NOT a migration and NOT an E2E test.
-- SQL-Editor-applied files may not appear in supabase_migrations.schema_migrations.
-- Do not re-run migrations just because a ledger entry is absent.

-- 1) Which required SQL functions actually exist? (Older UI uses different APIs.)
select expected.function_name,
       to_regprocedure(expected.signature) is not null as present
from (values
  ('join_chat_session', 'public.join_chat_session(uuid)'),
  ('close_chat_session', 'public.close_chat_session(uuid,text)'),
  ('client_end_chat_session', 'public.client_end_chat_session(uuid)'),
  ('resolve_chat_session', 'public.resolve_chat_session(uuid,text)'),
  ('reopen_chat_session', 'public.reopen_chat_session(uuid,text)'),
  ('chat_inbox_page', 'public.chat_inbox_page(text,text[],text[],uuid,uuid,uuid,boolean,text,timestamptz,uuid,integer)'),
  ('chat_messages_page', 'public.chat_messages_page(uuid,timestamptz,uuid,integer)'),
  ('chat_case_timeline', 'public.chat_case_timeline(uuid,integer)')
) as expected(function_name, signature)
order by expected.function_name;

-- 2) Current session counts by database status (no personal identifiers).
select status, count(*) as cases
from public.chat_sessions
group by status
order by status;

-- 3) Active-case uniqueness preflight. Expected: zero rows.
select count(*) as customers_with_multiple_open_cases
from (
  select user_id
  from public.chat_sessions
  where status in ('waiting','active','pending_client')
  group by user_id
  having count(*) > 1
) duplicates;

-- 4) Database constraints/indexes expected for independent, unique cases.
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'chat_sessions'
  and indexname in (
    'chat_sessions_one_open_idx', 'chat_sessions_one_active_idx',
    'chat_sessions_reference_id_key'
  )
order by indexname;

select conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.conrelid = 'public.chat_sessions'::regclass
  and c.contype in ('c', 'u', 'p')
order by conname;

-- 5) Verify RLS is enabled on each real chat table.
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where oid in (
  'public.chat_sessions'::regclass,
  'public.chat_messages'::regclass
)
order by relname;

-- 6) Verify the Realtime publication membership without showing any messages.
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
  and tablename like 'chat_%'
order by tablename;

-- 7) Check existing case references are unique; expected zero rows.
select count(*) as duplicate_case_references
from (
  select reference_id
  from public.chat_sessions
  where reference_id is not null
  group by reference_id
  having count(*) > 1
) duplicates;

-- 8) Check for messages with a missing parent; expected zero rows.
-- A foreign key should prevent these, but this diagnoses corrupted imports.
select count(*) as orphan_chat_messages
from public.chat_messages m
left join public.chat_sessions s on s.id = m.session_id
where s.id is null;

-- 9) Check recorded migrations if the CLI migration ledger is present.
-- SQL Editor execution often does NOT write this ledger. Its absence does
-- not imply the schema changes are missing.
select to_regclass('supabase_migrations.schema_migrations') as migration_ledger;
-- Only if the ledger above exists:
-- select version from supabase_migrations.schema_migrations order by version;

-- 10) Manually compare a known customer Case A and Case B by real UUID:
-- select id, reference_id, status, created_at, updated_at
-- from public.chat_sessions where id in ('CASE_A_UUID', 'CASE_B_UUID');
-- select session_id, count(*) from public.chat_messages
-- where session_id in ('CASE_A_UUID','CASE_B_UUID') group by session_id;
--
-- IMPORTANT: This read-only file cannot prove Case A-E functionality.
-- Use authenticated test users, the staging deployment and the final
-- deployed commit to execute independent multi-browser end-to-end checks.
