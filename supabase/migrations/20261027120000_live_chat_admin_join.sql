-- Live chat: long numeric case IDs, admin join, one-time welcome.
-- Additive. Does not merge chat, tickets, enquiries, or bookings.

-- ------------------------------------------------------------------
-- 1. Session assignment + welcome bookkeeping
-- ------------------------------------------------------------------

alter table public.chat_sessions
  add column if not exists assigned_admin_id uuid references auth.users (id) on delete set null,
  add column if not exists assigned_admin_name text,
  add column if not exists joined_at timestamptz,
  add column if not exists welcome_sent_at timestamptz;

alter table public.chat_messages
  add column if not exists sender_name text,
  add column if not exists kind text not null default 'message';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chat_messages_kind_check'
      and conrelid = 'public.chat_messages'::regclass
  ) then
    alter table public.chat_messages
      add constraint chat_messages_kind_check
      check (kind in ('message', 'welcome'));
  end if;
end $$;

create unique index if not exists chat_messages_one_welcome_idx
  on public.chat_messages (session_id)
  where kind = 'welcome';

-- ------------------------------------------------------------------
-- 2. Long numeric case reference (16 digits, unique, insert-only)
-- ------------------------------------------------------------------

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
  if not public.is_admin() then
    if new.status is distinct from old.status and new.status is distinct from 'closed' then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_sessions_protect on public.chat_sessions;
create trigger trg_chat_sessions_protect
before update on public.chat_sessions
for each row execute function public.protect_chat_session_update();

-- ------------------------------------------------------------------
-- 3. Force sender identity from the authenticated user
-- ------------------------------------------------------------------

create or replace function public.prepare_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  new.sender_id := auth.uid();
  if public.is_admin() then
    new.sender_role := 'admin';
  else
    new.sender_role := 'user';
  end if;
  if current_setting('app.allow_chat_welcome', true) is distinct from 'on'
     or new.sender_role is distinct from 'admin' then
    new.kind := 'message';
  else
    new.kind := 'welcome';
  end if;
  select coalesce(
           nullif(trim(p.full_name), ''),
           nullif(split_part(coalesce(p.email, ''), '@', 1), ''),
           case when new.sender_role = 'admin' then 'Support Agent' else 'Client' end
         )
    into display_name
    from public.profiles p
   where p.id = new.sender_id;
  new.sender_name := coalesce(
    display_name,
    case when new.sender_role = 'admin' then 'Support Agent' else 'Client' end
  );
  return new;
end;
$$;

drop trigger if exists trg_chat_messages_prepare on public.chat_messages;
create trigger trg_chat_messages_prepare
before insert on public.chat_messages
for each row execute function public.prepare_chat_message();

create or replace function public.protect_chat_message_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.session_id := old.session_id;
  new.sender_id := old.sender_id;
  new.sender_role := old.sender_role;
  new.sender_name := old.sender_name;
  new.message := old.message;
  new.kind := old.kind;
  new.created_at := old.created_at;
  if old.read = true then
    new.read := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_messages_protect on public.chat_messages;
create trigger trg_chat_messages_protect
before update on public.chat_messages
for each row execute function public.protect_chat_message_update();

-- ------------------------------------------------------------------
-- 4. Admin join + one-time welcome (row lock + unique welcome index)
-- ------------------------------------------------------------------

create or replace function public.join_chat_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.chat_sessions%rowtype;
  admin_uid uuid;
  admin_name text;
  welcome_text text;
  did_join boolean := false;
  did_welcome boolean := false;
begin
  admin_uid := auth.uid();
  if admin_uid is null or not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select coalesce(
           nullif(trim(p.full_name), ''),
           nullif(split_part(coalesce(p.email, ''), '@', 1), ''),
           'Support Agent'
         )
    into admin_name
    from public.profiles p
   where p.id = admin_uid;

  if admin_name is null or btrim(admin_name) = '' then
    admin_name := 'Support Agent';
  end if;

  select * into sess
    from public.chat_sessions
   where id = p_session_id
   for update;

  if not found then
    raise exception 'chat session not found';
  end if;

  if sess.status = 'closed' then
    return jsonb_build_object(
      'ok', true,
      'joined', false,
      'welcome', false,
      'status', sess.status,
      'admin_name', sess.assigned_admin_name,
      'reference_id', sess.reference_id,
      'user_id', sess.user_id
    );
  end if;

  perform set_config('app.chat_join', 'on', true);

  if sess.assigned_admin_id is null then
    update public.chat_sessions
       set status = case when status = 'waiting' then 'active' else status end,
           assigned_admin_id = admin_uid,
           assigned_admin_name = admin_name,
           joined_at = coalesce(joined_at, now())
     where id = p_session_id
     returning * into sess;
    did_join := true;
  elsif sess.status = 'waiting' then
    update public.chat_sessions
       set status = 'active'
     where id = p_session_id
     returning * into sess;
  end if;

  if sess.welcome_sent_at is null then
    welcome_text :=
      'Thanks for contacting our team. I''m '
      || coalesce(sess.assigned_admin_name, admin_name)
      || ', and I''ll be helping you today. The reference ID for your issue is '
      || coalesce(sess.reference_id, '')
      || '.';
    begin
      perform set_config('app.allow_chat_welcome', 'on', true);
      insert into public.chat_messages (
        session_id, sender_id, sender_role, sender_name, message, kind
      ) values (
        p_session_id,
        coalesce(sess.assigned_admin_id, admin_uid),
        'admin',
        coalesce(sess.assigned_admin_name, admin_name),
        welcome_text,
        'welcome'
      );
      did_welcome := true;
    exception
      when unique_violation then
        did_welcome := false;
    end;
    update public.chat_sessions
       set welcome_sent_at = coalesce(welcome_sent_at, now())
     where id = p_session_id
     returning * into sess;
  end if;

  return jsonb_build_object(
    'ok', true,
    'joined', did_join,
    'welcome', did_welcome,
    'status', sess.status,
    'admin_name', sess.assigned_admin_name,
    'reference_id', sess.reference_id,
    'user_id', sess.user_id
  );
end;
$$;

revoke all on function public.generate_live_chat_case_id() from public;
revoke all on function public.generate_live_chat_case_id() from anon, authenticated;
revoke all on sequence public.chat_sessions_case_seq from public;
revoke all on sequence public.chat_sessions_case_seq from anon, authenticated;
revoke all on function public.join_chat_session(uuid) from public;
revoke all on function public.join_chat_session(uuid) from anon;
grant execute on function public.join_chat_session(uuid) to authenticated;
