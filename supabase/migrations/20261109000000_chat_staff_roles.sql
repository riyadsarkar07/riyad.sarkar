-- ============================================================
-- M1: Live chat staff roles + profile privilege hardening
--
-- Additive only. Does not drop tables, sessions, messages or
-- reference ids. Does not modify Support Inbox, Project Enquiries,
-- Appointments, storage or settings.
--
-- Adds a granular staff dimension (agent / senior_agent /
-- supervisor / admin) alongside the existing profiles.role so that
-- every existing is_admin() call site keeps working unchanged.
-- ============================================================

-- ------------------------------------------------------------------
-- 1. Staff columns on profiles
-- ------------------------------------------------------------------

alter table public.profiles
  add column if not exists staff_role text,
  add column if not exists agent_status text not null default 'offline',
  add column if not exists agent_status_updated_at timestamptz,
  add column if not exists max_concurrent_cases integer not null default 5;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_staff_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_staff_role_check
      check (staff_role is null or staff_role in ('agent', 'senior_agent', 'supervisor', 'admin'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_agent_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_agent_status_check
      check (agent_status in ('available', 'busy', 'away', 'offline'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_max_concurrent_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_max_concurrent_check
      check (max_concurrent_cases >= 0);
  end if;
end $$;

create index if not exists profiles_staff_role_idx
  on public.profiles (staff_role)
  where staff_role is not null;

-- ------------------------------------------------------------------
-- 2. Backfill: every existing admin becomes staff_role = 'admin'
--    Runs before the guard triggers are installed so it cannot be
--    blocked by them.
-- ------------------------------------------------------------------

update public.profiles p
   set staff_role = 'admin'
 where p.staff_role is null
   and (
     p.role = 'admin'
     or exists (
       select 1 from public.admin_emails e
       where lower(e.email) = lower(coalesce(p.email, ''))
     )
   );

update public.profiles
   set agent_status = 'offline'
 where agent_status is null;

-- ------------------------------------------------------------------
-- 3. Staff role change audit (append-only)
-- ------------------------------------------------------------------

create table if not exists public.staff_role_changes (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  from_role text,
  to_role text,
  changed_by uuid references auth.users (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists staff_role_changes_staff_idx
  on public.staff_role_changes (staff_id, created_at desc);

alter table public.staff_role_changes enable row level security;

drop policy if exists staff_role_changes_admin_select on public.staff_role_changes;
create policy staff_role_changes_admin_select on public.staff_role_changes
  for select to authenticated
  using (public.is_admin());

-- No insert/update/delete policy for authenticated: rows are written by the
-- SECURITY DEFINER profile guard trigger only.

-- ------------------------------------------------------------------
-- 4. Staff helpers (SECURITY DEFINER, fixed search_path)
-- ------------------------------------------------------------------

create or replace function public.staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.staff_role from public.profiles p where p.id = auth.uid()),
    case when public.is_admin() then 'admin' else null end
  );
$$;

create or replace function public.staff_rank(p_role text)
returns integer
language sql
immutable
as $$
  select case p_role
    when 'agent' then 1
    when 'senior_agent' then 2
    when 'supervisor' then 3
    when 'admin' then 4
    else 0
  end;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.staff_role() is not null;
$$;

revoke all on function public.staff_role() from public;
revoke all on function public.staff_role() from anon;
grant execute on function public.staff_role() to authenticated;

revoke all on function public.staff_rank(text) from public;
grant execute on function public.staff_rank(text) to authenticated, anon;

revoke all on function public.is_staff() from public;
revoke all on function public.is_staff() from anon;
grant execute on function public.is_staff() to authenticated;

-- ------------------------------------------------------------------
-- 5. Profile privilege guard
--
-- A normal user must never be able to change role, staff_role or
-- max_concurrent_cases. They may only change their own agent_status.
-- Every staff-role change is written to staff_role_changes.
-- ------------------------------------------------------------------

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     or new.staff_role is distinct from old.staff_role
     or new.max_concurrent_cases is distinct from old.max_concurrent_cases then
    if not public.is_admin() then
      raise exception 'not authorized to change staff privileges'
        using errcode = '42501';
    end if;

    if new.staff_role is distinct from old.staff_role then
      insert into public.staff_role_changes (staff_id, from_role, to_role, changed_by, reason)
      values (old.id, old.staff_role, new.staff_role, auth.uid(), 'profile update');
    end if;
  end if;

  if new.agent_status is distinct from old.agent_status then
    if auth.uid() is distinct from old.id and not public.is_admin() then
      raise exception 'not authorized to change another agent status'
        using errcode = '42501';
    end if;
    new.agent_status_updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_update on public.profiles;
create trigger trg_profiles_protect_update
before update on public.profiles
for each row execute function public.protect_profile_privileges();

create or replace function public.protect_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowlisted boolean;
begin
  -- handle_new_user() runs in the auth context where auth.uid() may be null,
  -- so the allowlist must be evaluated from the row's own email, not from
  -- is_admin(). This keeps the auto-admin path working while blocking
  -- self-registration as staff by anyone else.
  select exists (
           select 1 from public.admin_emails e
            where lower(e.email) = lower(coalesce(new.email, ''))
         )
    into allowlisted;

  if public.is_admin() then
    return new;
  end if;

  if allowlisted then
    new.role := 'admin';
    new.staff_role := 'admin';
    new.max_concurrent_cases := coalesce(new.max_concurrent_cases, 5);
    new.agent_status := coalesce(new.agent_status, 'offline');
    return new;
  end if;

  new.role := 'user';
  new.staff_role := null;
  new.max_concurrent_cases := 5;
  new.agent_status := 'offline';
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_insert on public.profiles;
create trigger trg_profiles_protect_insert
before insert on public.profiles
for each row execute function public.protect_profile_insert();

-- ------------------------------------------------------------------
-- 6. Secure self-service presence update
--
-- Agents may only change their own presence through this RPC. The
-- trigger above permits it because auth.uid() = id.
-- ------------------------------------------------------------------

create or replace function public.set_my_agent_status(p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_status not in ('available', 'busy', 'away', 'offline') then
    raise exception 'invalid agent status';
  end if;
  if public.staff_role() is null then
    raise exception 'not staff' using errcode = '42501';
  end if;

  update public.profiles
     set agent_status = p_status
   where id = uid;

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

revoke all on function public.set_my_agent_status(text) from public;
revoke all on function public.set_my_agent_status(text) from anon;
grant execute on function public.set_my_agent_status(text) to authenticated;
