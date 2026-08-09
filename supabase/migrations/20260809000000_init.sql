-- ============================================================
-- Riyad Sarkar — Client Portal / Admin Database
-- Run this entire file in the Supabase SQL Editor once.
-- ============================================================

-- ------------------------------------------------------------------
-- 0. Helpers
-- ------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------
-- 1. Admin emails (allowlist). The seeded address is the first admin.
-- ------------------------------------------------------------------

create table if not exists public.admin_emails (
  email text primary key
);

insert into public.admin_emails (email)
values ('riyadsarkar1243@gmail.com')
on conflict (email) do nothing;

-- ------------------------------------------------------------------
-- 2. Profiles (linked 1:1 to Supabase Auth users)
-- ------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  timezone text not null default 'Asia/Dhaka',
  role text not null default 'user' check (role in ('user', 'admin')),
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

-- ------------------------------------------------------------------
-- 3. Appointments
-- ------------------------------------------------------------------

create sequence if not exists public.appointments_ref_seq;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  reference_id text unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  service text not null,
  appointment_date date not null,
  appointment_time text not null,
  timezone text not null default 'Asia/Dhaka',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  problem_description text not null,
  additional_details text,
  preferred_contact text not null default 'email' check (preferred_contact in ('email', 'whatsapp', 'phone')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'reschedule_requested')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_user_idx on public.appointments (user_id);
create index if not exists appointments_status_idx on public.appointments (status);
create index if not exists appointments_date_idx on public.appointments (appointment_date);
create index if not exists appointments_service_idx on public.appointments (service);

-- Prevent duplicate submissions for the same user/slot while active.
create unique index if not exists appointments_no_dup_idx
  on public.appointments (user_id, appointment_date, appointment_time)
  where status in ('pending', 'confirmed', 'in_progress', 'reschedule_requested');

create or replace function public.assign_appointment_ref()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.reference_id is null then
    new.reference_id := 'RS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.appointments_ref_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_appointments_ref on public.appointments;
create trigger trg_appointments_ref
before insert on public.appointments
for each row execute function public.assign_appointment_ref();

drop trigger if exists trg_appointments_updated on public.appointments;
create trigger trg_appointments_updated
before update on public.appointments
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- 4. Appointment files (Supabase Storage metadata)
-- ------------------------------------------------------------------

create table if not exists public.appointment_files (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size integer not null,
  created_at timestamptz not null default now()
);

create index if not exists appointment_files_appt_idx on public.appointment_files (appointment_id);
create index if not exists appointment_files_user_idx on public.appointment_files (user_id);

-- ------------------------------------------------------------------
-- 5. Support tickets
-- ------------------------------------------------------------------

create sequence if not exists public.support_ref_seq;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  reference_id text unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  subject text not null,
  category text not null default 'general'
    check (category in ('account_recovery', 'appointment', 'payment', 'technical_issue', 'security', 'general', 'other')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'pending', 'in_progress', 'closed')),
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_idx on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_appt_idx on public.support_tickets (appointment_id);

create or replace function public.assign_support_ref()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.reference_id is null then
    new.reference_id := 'SUP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.support_ref_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_support_ref on public.support_tickets;
create trigger trg_support_ref
before insert on public.support_tickets
for each row execute function public.assign_support_ref();

drop trigger if exists trg_support_updated on public.support_tickets;
create trigger trg_support_updated
before update on public.support_tickets
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- 6. Support messages (realtime chat)
-- ------------------------------------------------------------------

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete set null,
  sender_role text not null check (sender_role in ('user', 'admin')),
  message text not null,
  attachment_file_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- ------------------------------------------------------------------
-- 7. Support files (attachments registry)
-- ------------------------------------------------------------------

create table if not exists public.support_files (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size integer not null,
  created_at timestamptz not null default now()
);

alter table public.support_messages
  drop constraint if exists support_messages_attachment_fk;

create index if not exists support_files_ticket_idx on public.support_files (ticket_id);

-- Link message attachments after support_files exists
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'support_messages_attachment_fk') then
    alter table public.support_messages
      add constraint support_messages_attachment_fk
      foreign key (attachment_file_id) references public.support_files (id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------------
-- 8. Notifications (in-app) + Settings
-- ------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, read);

create table if not exists public.settings (
  key text primary key,
  value text
);

insert into public.settings (key, value) values ('notify_admin_email', 'true') on conflict (key) do nothing;

-- ------------------------------------------------------------------
-- 9. RLS enablement
-- ------------------------------------------------------------------

alter table public.admin_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_files enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_files enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;

-- ------------------------------------------------------------------
-- 10. is_admin() helper (SECURITY DEFINER)
-- ------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails e
    where lower(e.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Grant execute to authenticated + anon (so RLS policies can use it)
grant execute on function public.is_admin() to authenticated, anon;

-- ------------------------------------------------------------------
-- 11. Auto-create profile on signup (+ auto-admin when email allowlisted)
-- ------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    case when exists (select 1 from public.admin_emails e where lower(e.email) = lower(coalesce(new.email, '')))
         then 'admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Touch last_activity for a signed-in user (called from the client).
create or replace function public.touch_last_activity()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set last_activity_at = now()
   where id = auth.uid();
$$;

grant execute on function public.touch_last_activity() to authenticated;

-- Create an in-app notification. SECURITY DEFINER so the server (acting as a
-- user) can notify admins; callers may only notify themselves unless admin.
create or replace function public.create_notification(p_user_id uuid, p_title text, p_body text default null, p_type text default 'info')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    if not public.is_admin() then
      raise exception 'not authorized';
    end if;
  else
    if p_user_id <> auth.uid() and not public.is_admin() then
      raise exception 'not authorized';
    end if;
  end if;
  insert into public.notifications (user_id, title, body, type)
  values (p_user_id, p_title, p_body, p_type);
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text) to authenticated;

-- ------------------------------------------------------------------
-- 12. RLS policies
-- ------------------------------------------------------------------

-- Admin emails ------------------------------------------------------
drop policy if exists admin_emails_admin_select on public.admin_emails;
create policy admin_emails_admin_select on public.admin_emails
  for select to authenticated using (public.is_admin());

-- Profiles ----------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
  );

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Appointments ------------------------------------------------------
drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists appointments_user_update on public.appointments;
create policy appointments_user_update on public.appointments
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and status in ('reschedule_requested', 'cancelled')
  );

drop policy if exists appointments_admin_all on public.appointments;
create policy appointments_admin_all on public.appointments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Appointment files -------------------------------------------------
drop policy if exists appointment_files_select on public.appointment_files;
create policy appointment_files_select on public.appointment_files
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists appointment_files_insert on public.appointment_files;
create policy appointment_files_insert on public.appointment_files
  for insert to authenticated
  with check (user_id = auth.uid());

-- Support tickets ---------------------------------------------------
drop policy if exists support_tickets_select on public.support_tickets;
create policy support_tickets_select on public.support_tickets
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists support_tickets_insert on public.support_tickets;
create policy support_tickets_insert on public.support_tickets
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists support_tickets_user_close on public.support_tickets;
create policy support_tickets_user_close on public.support_tickets
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status = 'closed');

drop policy if exists support_tickets_admin_all on public.support_tickets;
create policy support_tickets_admin_all on public.support_tickets
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Support messages --------------------------------------------------
drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id and t.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists support_messages_user_insert on public.support_messages;
create policy support_messages_user_insert on public.support_messages
  for insert to authenticated
  with check (
    sender_role = 'user'
    and exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id and t.user_id = auth.uid()
    )
  );

drop policy if exists support_messages_admin_insert on public.support_messages;
create policy support_messages_admin_insert on public.support_messages
  for insert to authenticated
  with check (sender_role = 'admin' and public.is_admin());

drop policy if exists support_messages_user_update_read on public.support_messages;
create policy support_messages_user_update_read on public.support_messages
  for update to authenticated
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id and t.user_id = auth.uid()
    )
  )
  with check (read = true);

drop policy if exists support_messages_admin_update on public.support_messages;
create policy support_messages_admin_update on public.support_messages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Support files -----------------------------------------------------
drop policy if exists support_files_select on public.support_files;
create policy support_files_select on public.support_files
  for select to authenticated
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = support_files.ticket_id and t.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists support_files_user_insert on public.support_files;
create policy support_files_user_insert on public.support_files
  for insert to authenticated
  with check (
    exists (
      select 1 from public.support_tickets t
      where t.id = support_files.ticket_id and t.user_id = auth.uid()
    )
  );

drop policy if exists support_files_admin_insert on public.support_files;
create policy support_files_admin_insert on public.support_files
  for insert to authenticated
  with check (public.is_admin());

-- Notifications -----------------------------------------------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_user_update on public.notifications;
create policy notifications_user_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_admin_all on public.notifications;
create policy notifications_admin_all on public.notifications
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Settings ----------------------------------------------------------
drop policy if exists settings_admin_all on public.settings;
create policy settings_admin_all on public.settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------------
-- 13. Realtime
-- ------------------------------------------------------------------

alter publication supabase_realtime add table public.support_messages;
alter publication supabase_realtime add table public.support_tickets;
alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.notifications;

-- ------------------------------------------------------------------
-- 14. Storage buckets + policies
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('appointment-files', 'appointment-files', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('support-files', 'support-files', false)
on conflict (id) do nothing;

-- Appointment files: owner reads/writes own, admins read all --------
drop policy if exists appt_files_upload on storage.objects;
create policy appt_files_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'appointment-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists appt_files_owner_read on storage.objects;
create policy appt_files_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'appointment-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists appt_files_admin_read on storage.objects;
create policy appt_files_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'appointment-files' and public.is_admin());

-- Support files: owner reads/writes own, admins read all ------------
drop policy if exists sup_files_upload on storage.objects;
create policy sup_files_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'support-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists sup_files_owner_read on storage.objects;
create policy sup_files_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists sup_files_admin_read on storage.objects;
create policy sup_files_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'support-files' and public.is_admin());
