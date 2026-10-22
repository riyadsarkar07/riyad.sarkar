-- ============================================================
-- Public consultation bookings + email support tickets
-- Additive only. Does not alter existing tables, RLS, RPCs,
-- storage, or the live Support Inbox (support_tickets).
--
-- consultation_bookings: public "Book a Consultation" form
-- email_tickets:        public "Project Enquiry" form
-- email_ticket_replies: admin/user replies on email tickets
--
-- Access:
--   - anon INSERT on bookings/tickets (server action still validates)
--   - anon cannot SELECT rows directly
--   - lookup only via SECURITY DEFINER RPCs (email + reference)
--   - authenticated users see their own rows (user_id or jwt email)
--   - admins (is_admin()) have full access
-- ============================================================

create sequence if not exists public.consultation_bookings_ref_seq;
create sequence if not exists public.email_tickets_ref_seq;

create table if not exists public.consultation_bookings (
  id uuid primary key default gen_random_uuid(),
  reference_id text unique,
  submission_id uuid unique,
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  service text not null,
  appointment_date date not null,
  appointment_time text not null,
  timezone text not null default 'Asia/Dhaka',
  case_description text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  tracking_token text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultation_bookings_email_idx
  on public.consultation_bookings (lower(email));
create index if not exists consultation_bookings_user_idx
  on public.consultation_bookings (user_id);
create index if not exists consultation_bookings_status_idx
  on public.consultation_bookings (status);
create index if not exists consultation_bookings_date_idx
  on public.consultation_bookings (appointment_date);

create unique index if not exists consultation_bookings_no_dup_idx
  on public.consultation_bookings (lower(email), appointment_date, appointment_time)
  where status in ('pending', 'confirmed');

create or replace function public.assign_consultation_booking_ref()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.reference_id is null then
    new.reference_id := 'BK-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.consultation_bookings_ref_seq')::text, 4, '0');
  end if;
  if new.tracking_token is null or new.tracking_token = '' then
    new.tracking_token := encode(gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_consultation_bookings_ref on public.consultation_bookings;
create trigger trg_consultation_bookings_ref
before insert on public.consultation_bookings
for each row execute function public.assign_consultation_booking_ref();

drop trigger if exists trg_consultation_bookings_updated on public.consultation_bookings;
create trigger trg_consultation_bookings_updated
before update on public.consultation_bookings
for each row execute function public.set_updated_at();

create table if not exists public.email_tickets (
  id uuid primary key default gen_random_uuid(),
  reference_id text unique,
  submission_id uuid unique,
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  issue_type text not null,
  message text not null,
  budget text,
  timeline text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'awaiting_reply', 'resolved')),
  tracking_token text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_tickets_email_idx on public.email_tickets (lower(email));
create index if not exists email_tickets_user_idx on public.email_tickets (user_id);
create index if not exists email_tickets_status_idx on public.email_tickets (status);

create or replace function public.assign_email_ticket_ref()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.reference_id is null then
    new.reference_id := 'TKT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.email_tickets_ref_seq')::text, 4, '0');
  end if;
  if new.tracking_token is null or new.tracking_token = '' then
    new.tracking_token := encode(gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_email_tickets_ref on public.email_tickets;
create trigger trg_email_tickets_ref
before insert on public.email_tickets
for each row execute function public.assign_email_ticket_ref();

drop trigger if exists trg_email_tickets_updated on public.email_tickets;
create trigger trg_email_tickets_updated
before update on public.email_tickets
for each row execute function public.set_updated_at();

create table if not exists public.email_ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.email_tickets (id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'admin')),
  sender_id uuid references auth.users (id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists email_ticket_replies_ticket_idx
  on public.email_ticket_replies (ticket_id, created_at);

alter table public.consultation_bookings enable row level security;
alter table public.email_tickets enable row level security;
alter table public.email_ticket_replies enable row level security;

drop policy if exists consultation_bookings_insert on public.consultation_bookings;
create policy consultation_bookings_insert on public.consultation_bookings
  for insert to anon, authenticated
  with check (
    (auth.uid() is null and user_id is null)
    or (auth.uid() is not null and (user_id is null or user_id = auth.uid()))
  );

drop policy if exists consultation_bookings_select on public.consultation_bookings;
create policy consultation_bookings_select on public.consultation_bookings
  for select to authenticated
  using (
    public.is_admin()
    or user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists consultation_bookings_admin_update on public.consultation_bookings;
create policy consultation_bookings_admin_update on public.consultation_bookings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists email_tickets_insert on public.email_tickets;
create policy email_tickets_insert on public.email_tickets
  for insert to anon, authenticated
  with check (
    (auth.uid() is null and user_id is null)
    or (auth.uid() is not null and (user_id is null or user_id = auth.uid()))
  );

drop policy if exists email_tickets_select on public.email_tickets;
create policy email_tickets_select on public.email_tickets
  for select to authenticated
  using (
    public.is_admin()
    or user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists email_tickets_admin_update on public.email_tickets;
create policy email_tickets_admin_update on public.email_tickets
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists email_ticket_replies_select on public.email_ticket_replies;
create policy email_ticket_replies_select on public.email_ticket_replies
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.email_tickets t
      where t.id = email_ticket_replies.ticket_id
        and (
          t.user_id = auth.uid()
          or lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

drop policy if exists email_ticket_replies_admin_insert on public.email_ticket_replies;
create policy email_ticket_replies_admin_insert on public.email_ticket_replies
  for insert to authenticated
  with check (sender_role = 'admin' and public.is_admin());

drop policy if exists email_ticket_replies_user_insert on public.email_ticket_replies;
create policy email_ticket_replies_user_insert on public.email_ticket_replies
  for insert to authenticated
  with check (
    sender_role = 'user'
    and exists (
      select 1 from public.email_tickets t
      where t.id = email_ticket_replies.ticket_id
        and (
          t.user_id = auth.uid()
          or lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

grant usage, select on sequence public.consultation_bookings_ref_seq to anon, authenticated;
grant usage, select on sequence public.email_tickets_ref_seq to anon, authenticated;

grant insert on public.consultation_bookings to anon, authenticated;
grant select, update on public.consultation_bookings to authenticated;

grant insert on public.email_tickets to anon, authenticated;
grant select, update on public.email_tickets to authenticated;

grant select, insert on public.email_ticket_replies to authenticated;

create or replace function public.lookup_email_ticket(p_email text, p_reference text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ticket public.email_tickets%rowtype;
  replies jsonb;
begin
  if p_email is null or p_reference is null then
    return null;
  end if;

  select * into ticket
  from public.email_tickets
  where lower(email) = lower(trim(p_email))
    and reference_id = trim(p_reference)
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'sender_role', r.sender_role,
    'message', r.message,
    'created_at', r.created_at
  ) order by r.created_at), '[]'::jsonb)
  into replies
  from public.email_ticket_replies r
  where r.ticket_id = ticket.id;

  return jsonb_build_object(
    'id', ticket.id,
    'reference_id', ticket.reference_id,
    'full_name', ticket.full_name,
    'email', ticket.email,
    'phone', ticket.phone,
    'issue_type', ticket.issue_type,
    'message', ticket.message,
    'budget', ticket.budget,
    'timeline', ticket.timeline,
    'status', ticket.status,
    'created_at', ticket.created_at,
    'updated_at', ticket.updated_at,
    'replies', replies
  );
end;
$$;

create or replace function public.reply_email_ticket(p_email text, p_reference text, p_message text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ticket public.email_tickets%rowtype;
  inserted public.email_ticket_replies%rowtype;
begin
  if p_email is null or p_reference is null or p_message is null or length(trim(p_message)) < 2 then
    return null;
  end if;
  if length(p_message) > 4000 then
    raise exception 'message too long';
  end if;

  select * into ticket
  from public.email_tickets
  where lower(email) = lower(trim(p_email))
    and reference_id = trim(p_reference)
  limit 1;

  if not found then
    return null;
  end if;

  if ticket.status = 'resolved' then
    raise exception 'ticket resolved';
  end if;

  insert into public.email_ticket_replies (ticket_id, sender_role, sender_id, message)
  values (ticket.id, 'user', auth.uid(), trim(p_message))
  returning * into inserted;

  update public.email_tickets
     set status = 'in_progress'
   where id = ticket.id
     and status in ('open', 'awaiting_reply');

  return jsonb_build_object(
    'id', inserted.id,
    'sender_role', inserted.sender_role,
    'message', inserted.message,
    'created_at', inserted.created_at
  );
end;
$$;

create or replace function public.lookup_by_submission(p_table text, p_submission_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if p_submission_id is null then
    return null;
  end if;
  if p_table = 'consultation_bookings' then
    select jsonb_build_object(
      'id', id,
      'reference_id', reference_id,
      'status', status
    ) into result
    from public.consultation_bookings
    where submission_id = p_submission_id;
    return result;
  end if;
  if p_table = 'email_tickets' then
    select jsonb_build_object(
      'id', id,
      'reference_id', reference_id,
      'status', status
    ) into result
    from public.email_tickets
    where submission_id = p_submission_id;
    return result;
  end if;
  return null;
end;
$$;

create or replace function public.submit_consultation_booking(
  p_submission_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_service text,
  p_date date,
  p_time text,
  p_timezone text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.consultation_bookings%rowtype;
  created public.consultation_bookings%rowtype;
begin
  if p_submission_id is null then
    raise exception 'missing submission';
  end if;
  if p_full_name is null or length(trim(p_full_name)) < 2 or length(p_full_name) > 80 then
    raise exception 'invalid name';
  end if;
  if p_email is null or position('@' in p_email) = 0 or length(p_email) > 120 then
    raise exception 'invalid email';
  end if;
  if p_phone is null or length(trim(p_phone)) < 6 or length(p_phone) > 40 then
    raise exception 'invalid phone';
  end if;
  if p_service is null or length(trim(p_service)) < 2 or length(p_service) > 120 then
    raise exception 'invalid service';
  end if;
  if p_date is null or p_date < current_date then
    raise exception 'invalid date';
  end if;
  if p_time is null or length(trim(p_time)) < 1 or length(p_time) > 32 then
    raise exception 'invalid time';
  end if;
  if p_description is null or length(trim(p_description)) < 10 or length(p_description) > 4000 then
    raise exception 'invalid description';
  end if;

  select * into existing
  from public.consultation_bookings
  where submission_id = p_submission_id;
  if found then
    return jsonb_build_object(
      'id', existing.id,
      'reference_id', existing.reference_id,
      'status', existing.status,
      'duplicate', true
    );
  end if;

  insert into public.consultation_bookings (
    submission_id, user_id, full_name, email, phone, service,
    appointment_date, appointment_time, timezone, case_description
  ) values (
    p_submission_id,
    auth.uid(),
    trim(p_full_name),
    lower(trim(p_email)),
    trim(p_phone),
    trim(p_service),
    p_date,
    trim(p_time),
    coalesce(nullif(trim(p_timezone), ''), 'Asia/Dhaka'),
    trim(p_description)
  )
  returning * into created;

  return jsonb_build_object(
    'id', created.id,
    'reference_id', created.reference_id,
    'status', created.status,
    'duplicate', false
  );
end;
$$;

create or replace function public.submit_email_ticket(
  p_submission_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_issue_type text,
  p_message text,
  p_budget text,
  p_timeline text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.email_tickets%rowtype;
  created public.email_tickets%rowtype;
begin
  if p_submission_id is null then
    raise exception 'missing submission';
  end if;
  if p_full_name is null or length(trim(p_full_name)) < 2 or length(p_full_name) > 80 then
    raise exception 'invalid name';
  end if;
  if p_email is null or position('@' in p_email) = 0 or length(p_email) > 120 then
    raise exception 'invalid email';
  end if;
  if p_phone is not null and length(trim(p_phone)) > 0 and (length(trim(p_phone)) < 6 or length(p_phone) > 40) then
    raise exception 'invalid phone';
  end if;
  if p_issue_type is null or length(trim(p_issue_type)) < 2 or length(p_issue_type) > 80 then
    raise exception 'invalid issue type';
  end if;
  if p_message is null or length(trim(p_message)) < 20 or length(p_message) > 4000 then
    raise exception 'invalid message';
  end if;

  select * into existing
  from public.email_tickets
  where submission_id = p_submission_id;
  if found then
    return jsonb_build_object(
      'id', existing.id,
      'reference_id', existing.reference_id,
      'status', existing.status,
      'duplicate', true
    );
  end if;

  insert into public.email_tickets (
    submission_id, user_id, full_name, email, phone, issue_type, message, budget, timeline
  ) values (
    p_submission_id,
    auth.uid(),
    trim(p_full_name),
    lower(trim(p_email)),
    nullif(trim(coalesce(p_phone, '')), ''),
    trim(p_issue_type),
    trim(p_message),
    nullif(trim(coalesce(p_budget, '')), ''),
    nullif(trim(coalesce(p_timeline, '')), '')
  )
  returning * into created;

  return jsonb_build_object(
    'id', created.id,
    'reference_id', created.reference_id,
    'status', created.status,
    'duplicate', false
  );
end;
$$;

grant execute on function public.lookup_email_ticket(text, text) to anon, authenticated;
grant execute on function public.reply_email_ticket(text, text, text) to anon, authenticated;
grant execute on function public.lookup_by_submission(text, uuid) to anon, authenticated;
grant execute on function public.submit_consultation_booking(uuid, text, text, text, text, date, text, text, text) to anon, authenticated;
grant execute on function public.submit_email_ticket(uuid, text, text, text, text, text, text, text) to anon, authenticated;
