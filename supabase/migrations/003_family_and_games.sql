-- =====================================================================
-- GENFUSE 003: Family room (invite code, switch family), Realtime
-- authorization, chore wheel, Ô Ăn Quan rooms.
-- Additive: families / profiles.family_id already exist from 001.
-- Safe to run once after 001 and 002.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. FAMILIES: invite_code alias + created_by
-- ---------------------------------------------------------------------
-- 001 named the 6-char code "family_code". Renaming would break the app
-- and old deployments, so "invite_code" is a stored generated alias.
alter table public.families
  add column if not exists invite_code text generated always as (family_code) stored;

alter table public.families
  add column if not exists created_by uuid references auth.users (id) on delete set null;

-- Backfill: the earliest member of each family is its creator.
update public.families f
   set created_by = (select p.id from public.profiles p
                      where p.family_id = f.id
                      order by p.created_at asc limit 1)
 where f.created_by is null;

alter table public.profiles
  add column if not exists family_changed_at timestamptz;

-- create_family now records the creator.
create or replace function public.create_family(
  p_family_name  text,
  p_display_name text,
  p_role         text,
  p_ui_mode      text default 'standard',
  p_lang         text default 'vi'
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  fid uuid;
  code text;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if exists (select 1 from public.profiles where id = uid) then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_IN_FAMILY');
  end if;

  code := public.generate_family_code();
  insert into public.families (name, family_code, created_by)
  values (trim(p_family_name), code, uid)
  returning id into fid;

  insert into public.profiles (id, family_id, display_name, role, ui_mode, preferred_lang)
  values (uid, fid, trim(p_display_name), p_role, p_ui_mode, p_lang);

  return jsonb_build_object('ok', true, 'family_id', fid, 'family_code', code);
end;
$$;

-- profiles_guard: still blocks direct changes, but lets the two switch RPCs through.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id then
    raise exception 'PROFILE_IMMUTABLE_FIELD' using errcode = 'check_violation';
  end if;
  if new.family_id <> old.family_id
     and coalesce(current_setting('genfuse.allow_family_change', true), '') <> 'on' then
    raise exception 'PROFILE_IMMUTABLE_FIELD' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. SWITCH / CREATE FAMILY FOR AN EXISTING MEMBER
-- ---------------------------------------------------------------------
-- The old family and its memories stay where they are (recoverable by code).
create or replace function public._move_member(p_uid uuid, p_new_family uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform set_config('genfuse.allow_family_change', 'on', true);
  -- Reminders addressed to this person belong to the old family's context.
  delete from public.reminders where target_user_id = p_uid;
  update public.profiles
     set family_id = p_new_family, family_changed_at = now()
   where id = p_uid;
  perform set_config('genfuse.allow_family_change', 'off', true);
end;
$$;
revoke all on function public._move_member(uuid, uuid) from public, anon, authenticated;

create or replace function public.switch_to_family(p_code text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  me  public.profiles%rowtype;
  fam public.families%rowtype;
  members int;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  select * into me from public.profiles where id = uid;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'NO_FAMILY');
  end if;

  if me.family_changed_at is not null and me.family_changed_at > now() - interval '24 hours' then
    return jsonb_build_object('ok', false, 'error', 'FAMILY_CHANGE_TOO_SOON');
  end if;

  if (select count(*) from public.join_attempts
       where user_id = uid and attempted_at > now() - interval '15 minutes') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'TOO_MANY_ATTEMPTS');
  end if;

  select * into fam from public.families where family_code = upper(trim(p_code));
  if not found then
    insert into public.join_attempts (user_id) values (uid);
    return jsonb_build_object('ok', false, 'error', 'INVALID_CODE');
  end if;
  if fam.id = me.family_id then
    return jsonb_build_object('ok', false, 'error', 'SAME_FAMILY');
  end if;

  select count(*) into members from public.profiles where family_id = fam.id;
  if members >= 30 then
    return jsonb_build_object('ok', false, 'error', 'FAMILY_FULL');
  end if;

  perform public._move_member(uid, fam.id);
  return jsonb_build_object('ok', true, 'family_id', fam.id, 'family_name', fam.name);
end;
$$;

create or replace function public.create_family_for_member(p_name text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  me  public.profiles%rowtype;
  fid uuid;
  code text;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  select * into me from public.profiles where id = uid;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'NO_FAMILY');
  end if;
  if me.family_changed_at is not null and me.family_changed_at > now() - interval '24 hours' then
    return jsonb_build_object('ok', false, 'error', 'FAMILY_CHANGE_TOO_SOON');
  end if;
  if length(trim(coalesce(p_name, ''))) < 1 or length(trim(p_name)) > 60 then
    return jsonb_build_object('ok', false, 'error', 'BAD_REQUEST');
  end if;

  code := public.generate_family_code();
  insert into public.families (name, family_code, created_by)
  values (trim(p_name), code, uid)
  returning id into fid;

  perform public._move_member(uid, fid);
  return jsonb_build_object('ok', true, 'family_id', fid, 'family_code', code);
end;
$$;

revoke all on function public.switch_to_family(text) from public, anon;
revoke all on function public.create_family_for_member(text) from public, anon;
grant execute on function public.switch_to_family(text) to authenticated;
grant execute on function public.create_family_for_member(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. REALTIME AUTHORIZATION (private channels "family:{family_id}")
-- ---------------------------------------------------------------------
-- Clients join with config.private = true. Only members of that family may
-- read or write Broadcast/Presence on its topic.
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'alter table realtime.messages enable row level security';

    execute 'drop policy if exists "family members receive" on realtime.messages';
    execute $p$
      create policy "family members receive" on realtime.messages
        for select to authenticated
        using (
          realtime.topic() = 'family:' || public.current_family_id()::text
          and extension in ('broadcast', 'presence')
        )
    $p$;

    execute 'drop policy if exists "family members send" on realtime.messages';
    execute $p$
      create policy "family members send" on realtime.messages
        for insert to authenticated
        with check (
          realtime.topic() = 'family:' || public.current_family_id()::text
          and extension in ('broadcast', 'presence')
        )
    $p$;
  else
    raise notice 'realtime.messages not found: enable Realtime, then re-run section 3.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. CHORE WHEEL
-- ---------------------------------------------------------------------
create table if not exists public.chore_items (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 1 and 80),
  is_exempt   boolean not null default false,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index if not exists chore_items_family_title_uq
  on public.chore_items (family_id, lower(title));

create or replace function public.chore_items_limit()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if (select count(*) from public.chore_items where family_id = new.family_id) >= 20 then
    raise exception 'ROOM_LIMIT' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists chore_items_limit_trg on public.chore_items;
create trigger chore_items_limit_trg before insert on public.chore_items
  for each row execute function public.chore_items_limit();

alter table public.chore_items enable row level security;
drop policy if exists chore_items_select on public.chore_items;
create policy chore_items_select on public.chore_items
  for select to authenticated using (family_id = public.current_family_id());
drop policy if exists chore_items_insert on public.chore_items;
create policy chore_items_insert on public.chore_items
  for insert to authenticated
  with check (family_id = public.current_family_id() and created_by = auth.uid() and is_exempt = false);
drop policy if exists chore_items_delete on public.chore_items;
create policy chore_items_delete on public.chore_items
  for delete to authenticated using (family_id = public.current_family_id());

revoke all on public.chore_items from anon, authenticated;
grant select, delete on public.chore_items to authenticated;
grant insert (family_id, title, created_by) on public.chore_items to authenticated;

create table if not exists public.chore_spins (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families (id) on delete cascade,
  spun_by        uuid references auth.users (id) on delete set null,
  chore_title    text not null,
  is_exempt      boolean not null default false,
  assigned_to    uuid references auth.users (id) on delete set null,
  assigned_name  text not null,
  created_at     timestamptz not null default now()
);
create index if not exists chore_spins_family_idx on public.chore_spins (family_id, created_at desc);

alter table public.chore_spins enable row level security;
drop policy if exists chore_spins_select on public.chore_spins;
create policy chore_spins_select on public.chore_spins
  for select to authenticated using (family_id = public.current_family_id());
revoke all on public.chore_spins from anon, authenticated;
grant select on public.chore_spins to authenticated;

-- ---------------------------------------------------------------------
-- 5. Ô ĂN QUAN ROOMS (writes only through server actions / service_role)
-- ---------------------------------------------------------------------
create table if not exists public.oaq_games (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  host_id     uuid not null references auth.users (id) on delete cascade,
  guest_id    uuid references auth.users (id) on delete set null,
  state       jsonb not null,
  turn        smallint not null default 0 check (turn in (0, 1)),
  move_count  integer not null default 0,
  status      text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  winner      smallint check (winner in (0, 1)),
  result      jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists oaq_games_family_idx on public.oaq_games (family_id, created_at desc);

alter table public.oaq_games enable row level security;
drop policy if exists oaq_games_select on public.oaq_games;
create policy oaq_games_select on public.oaq_games
  for select to authenticated using (family_id = public.current_family_id());
revoke all on public.oaq_games from anon, authenticated;
grant select on public.oaq_games to authenticated;

-- Realtime row changes (lobby + resync). Tolerate re-runs.
do $$
begin
  begin alter publication supabase_realtime add table public.chore_items; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.oaq_games;   exception when duplicate_object then null; end;
end $$;
