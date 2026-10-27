-- ============================================================
-- Live Chat (separate from Support Inbox) + ENQ prefix
-- Additive. Does not merge chat, tickets, enquiries, or bookings.
--
-- chat_sessions / chat_messages: realtime agent chat
-- email_tickets new rows: ENQ-YYYY-NNNN (existing TKT- ids kept)
-- assign_*_ref functions: SECURITY DEFINER so concurrent inserts
-- cannot mint duplicate or missing readable ids.
-- ============================================================

-- ------------------------------------------------------------------
-- 1. Always-safe readable IDs (sequence + unique column)
-- ------------------------------------------------------------------

create or replace function public.assign_appointment_ref()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.reference_id := 'RS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.appointments_ref_seq')::text, 4, '0');
  return new;
end;
$$;

create or replace function public.assign_support_ref()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.reference_id := 'SUP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.support_ref_seq')::text, 4, '0');
  return new;
end;
$$;

create or replace function public.assign_consultation_booking_ref()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.reference_id := 'BK-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.consultation_bookings_ref_seq')::text, 4, '0');
  if new.tracking_token is null or new.tracking_token = '' then
    new.tracking_token := encode(gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$;

create or replace function public.assign_email_ticket_ref()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.reference_id := 'ENQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.email_tickets_ref_seq')::text, 4, '0');
  if new.tracking_token is null or new.tracking_token = '' then
    new.tracking_token := encode(gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$;

grant usage, select on sequence public.appointments_ref_seq to authenticated;
grant usage, select on sequence public.support_ref_seq to authenticated;

-- ------------------------------------------------------------------
-- 2. Live chat sessions + messages
-- ------------------------------------------------------------------

create sequence if not exists public.chat_sessions_ref_seq;

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  reference_id text unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting', 'active', 'closed')),
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_user_idx on public.chat_sessions (user_id);
create index if not exists chat_sessions_status_idx on public.chat_sessions (status);
create index if not exists chat_sessions_updated_idx on public.chat_sessions (updated_at desc);

create unique index if not exists chat_sessions_one_open_idx
  on public.chat_sessions (user_id)
  where status in ('waiting', 'active');

create or replace function public.assign_chat_session_ref()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.reference_id := 'CHAT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.chat_sessions_ref_seq')::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_chat_sessions_ref on public.chat_sessions;
create trigger trg_chat_sessions_ref
before insert on public.chat_sessions
for each row execute function public.assign_chat_session_ref();

drop trigger if exists trg_chat_sessions_updated on public.chat_sessions;
create trigger trg_chat_sessions_updated
before update on public.chat_sessions
for each row execute function public.set_updated_at();

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete set null,
  sender_role text not null check (sender_role in ('user', 'admin')),
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_idx on public.chat_messages (session_id, created_at);

create or replace function public.touch_chat_session_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_sessions
     set last_message_at = new.created_at,
         last_message_preview = left(new.message, 140),
         status = case
           when status = 'closed' then status
           when new.sender_role = 'admin' and status = 'waiting' then 'active'
           else status
         end
   where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists trg_chat_messages_touch on public.chat_messages;
create trigger trg_chat_messages_touch
after insert on public.chat_messages
for each row execute function public.touch_chat_session_on_message();

-- ------------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------------

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists chat_sessions_select on public.chat_sessions;
create policy chat_sessions_select on public.chat_sessions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists chat_sessions_insert on public.chat_sessions;
create policy chat_sessions_insert on public.chat_sessions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists chat_sessions_user_update on public.chat_sessions;
create policy chat_sessions_user_update on public.chat_sessions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status in ('waiting', 'active', 'closed'));

drop policy if exists chat_sessions_admin_all on public.chat_sessions;
create policy chat_sessions_admin_all on public.chat_sessions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists chat_messages_user_insert on public.chat_messages;
create policy chat_messages_user_insert on public.chat_messages
  for insert to authenticated
  with check (
    sender_role = 'user'
    and exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id
        and s.user_id = auth.uid()
        and s.status in ('waiting', 'active')
    )
  );

drop policy if exists chat_messages_admin_insert on public.chat_messages;
create policy chat_messages_admin_insert on public.chat_messages
  for insert to authenticated
  with check (sender_role = 'admin' and public.is_admin());

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
  using (public.is_admin())
  with check (public.is_admin());

grant usage, select on sequence public.chat_sessions_ref_seq to authenticated;
grant select, insert, update on public.chat_sessions to authenticated;
grant select, insert, update on public.chat_messages to authenticated;

-- ------------------------------------------------------------------
-- 4. Admin online helper (last_activity_at — never faked)
-- ------------------------------------------------------------------

create or replace function public.admin_online_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.profiles p
  where (
    p.role = 'admin'
    or exists (
      select 1 from public.admin_emails e
      where lower(e.email) = lower(coalesce(p.email, ''))
    )
  )
  and p.last_activity_at is not null
  and p.last_activity_at > now() - interval '2 minutes';
$$;

grant execute on function public.admin_online_count() to authenticated, anon;

-- ------------------------------------------------------------------
-- 5. Realtime
-- ------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_sessions;
  exception when duplicate_object then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception when duplicate_object then
    null;
  end;
end $$;
