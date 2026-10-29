-- Fix live chat case creation.
-- Additive. Does not drop tables, sessions, or messages.
--
-- Root cause: generate_live_chat_case_id() called gen_random_bytes() with
-- search_path = public. On Supabase, pgcrypto lives in the extensions schema,
-- so INSERT into chat_sessions failed and clients could not open new chats.

create sequence if not exists public.chat_sessions_case_seq;

create or replace function public.generate_live_chat_case_id()
returns text
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  candidate text;
  n int := 0;
  mix numeric;
begin
  loop
    n := n + 1;
    mix :=
      1000000000000000::numeric
      + mod(
          (extract(epoch from clock_timestamp()) * 1000000)::numeric
          + nextval('public.chat_sessions_case_seq')::numeric * 1009,
          9000000000000000::numeric
        );
    candidate := trunc(mix)::text;
    if length(candidate) < 16 then
      candidate := lpad(candidate, 16, '0');
    elsif length(candidate) > 16 then
      candidate := right(candidate, 16);
    end if;
    exit when candidate ~ '^[0-9]{16}$'
      and not exists (
        select 1 from public.chat_sessions s where s.reference_id = candidate
      );
    if n >= 32 then
      raise exception 'could not allocate a unique live chat reference id';
    end if;
  end loop;
  return candidate;
end;
$$;

create or replace function public.assign_chat_session_ref()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.is_admin() then
    new.user_id := auth.uid();
  end if;
  new.status := 'waiting';
  new.assigned_admin_id := null;
  new.assigned_admin_name := null;
  new.joined_at := null;
  new.welcome_sent_at := null;
  new.reference_id := public.generate_live_chat_case_id();
  return new;
end;
$$;

revoke all on function public.generate_live_chat_case_id() from public;
revoke all on function public.generate_live_chat_case_id() from anon, authenticated;
revoke all on sequence public.chat_sessions_case_seq from public;
revoke all on sequence public.chat_sessions_case_seq from anon, authenticated;
