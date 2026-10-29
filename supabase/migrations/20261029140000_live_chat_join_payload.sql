-- Additive. Ensures join columns exist and join_chat_session returns the
-- assigned admin id. Does not drop tables, sessions, or messages.

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
      'assigned_admin_id', sess.assigned_admin_id,
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
    'assigned_admin_id', sess.assigned_admin_id,
    'reference_id', sess.reference_id,
    'user_id', sess.user_id
  );
end;
$$;

revoke all on function public.join_chat_session(uuid) from public;
revoke all on function public.join_chat_session(uuid) from anon;
grant execute on function public.join_chat_session(uuid) to authenticated;
