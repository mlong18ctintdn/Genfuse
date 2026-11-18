-- =====================================================================
-- GENFUSE v2.0 — complete Supabase migration
-- Paste into: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to run on a fresh project. (Not idempotent for tables: if you re-run,
-- drop the tables first.)
--
-- Security model
--   * Every table has Row Level Security ON.
--   * Browser/user JWTs can READ family data and write only what they own.
--   * Money- and credit-sensitive writes (credits, subscription, transactions,
--     ai_messages) are impossible from the client: no INSERT/UPDATE policy
--     exists, privileges are revoked, and the only way in is a SECURITY
--     DEFINER function callable by the service_role key (server only).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

create table public.families (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 1 and 80),
  family_code         text not null unique check (family_code ~ '^[A-Z0-9]{6}$'),
  credits_remaining   integer not null default 5 check (credits_remaining >= 0),
  subscription_tier   text not null default 'free' check (subscription_tier in ('free', 'premium')),
  premium_expires_at  timestamptz,
  created_at          timestamptz not null default now()
);
comment on column public.families.subscription_tier is
  'Stored tier. Effective premium = tier=premium AND (expires_at is null OR expires_at > now()). Use public.is_family_premium().';

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  family_id      uuid not null references public.families (id) on delete cascade,
  display_name   text not null check (char_length(display_name) between 1 and 60),
  role           text not null check (role in ('grandparent', 'parent', 'child')),
  ui_mode        text not null default 'standard' check (ui_mode in ('standard', 'senior')),
  preferred_lang text not null default 'vi' check (preferred_lang in ('vi', 'en', 'zh', 'es')),
  avatar_url     text,
  created_at     timestamptz not null default now()
);
create index profiles_family_id_idx on public.profiles (family_id);

create table public.memories (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families (id) on delete cascade,
  author_id       uuid not null references public.profiles (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 200),
  content         text check (char_length(content) <= 10000),
  media_url       text,                 -- storage object path inside bucket "family-media"
  media_type      text not null default 'text' check (media_type in ('image', 'audio', 'text')),
  ai_summary      text,
  ai_emotion_tag  text,                 -- extra: "nostalgic", "proud", ...
  ai_follow_up    text,                 -- extra: question inviting another generation to reply
  memory_date     date,                 -- extra: era the memory is about (may be approximate)
  unlock_date     timestamptz,          -- NULL = normal leaf; future date = Time Capsule
  created_at      timestamptz not null default now()
);
create index memories_family_created_idx on public.memories (family_id, created_at desc);

create table public.ai_messages (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  feature_type  text not null check (feature_type in ('companion', 'translator', 'scam_check')),
  role          text not null check (role in ('user', 'assistant')),
  content       text not null,
  created_at    timestamptz not null default now()
);
create index ai_messages_user_feature_idx on public.ai_messages (user_id, feature_type, created_at desc);

create table public.reminders (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families (id) on delete cascade,
  target_user_id  uuid not null references public.profiles (id) on delete cascade,
  created_by      uuid not null references public.profiles (id) on delete cascade, -- extra
  title           text not null check (char_length(title) between 1 and 200),
  remind_time     timestamptz not null,
  is_completed    boolean not null default false,
  created_at      timestamptz not null default now()
);
create index reminders_family_time_idx on public.reminders (family_id, remind_time);

create table public.transactions (
  id                      uuid primary key default gen_random_uuid(),
  family_id               uuid not null references public.families (id) on delete cascade,
  order_code              bigint not null unique,           -- PayOS orderCode
  amount                  integer not null check (amount > 0), -- VND
  plan_type               text not null check (plan_type in ('monthly', 'yearly')),
  status                  text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  payos_payment_link_id   text,                              -- extra
  created_by              uuid references public.profiles (id) on delete set null, -- extra
  created_at              timestamptz not null default now(),
  paid_at                 timestamptz                        -- extra
);
create index transactions_family_idx on public.transactions (family_id, created_at desc);

-- Brute-force guard for family codes (touched only by join_family()).
create table public.join_attempts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  attempted_at  timestamptz not null default now()
);
create index join_attempts_user_idx on public.join_attempts (user_id, attempted_at desc);


-- ---------------------------------------------------------------------
-- 2. HELPER FUNCTIONS
-- ---------------------------------------------------------------------

-- Family of the signed-in user. SECURITY DEFINER so RLS policies on
-- "profiles" can use it without infinite recursion.
create or replace function public.current_family_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select family_id from public.profiles where id = auth.uid()
$$;

-- Effective premium status (handles expiry lazily, no cron needed).
create or replace function public.is_family_premium(p_family_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select f.subscription_tier = 'premium'
            and (f.premium_expires_at is null or f.premium_expires_at > now())
       from public.families f
      where f.id = p_family_id),
    false)
$$;

-- Unambiguous 6-char code (no I, O, 0, 1). 32 symbols, bytes from a CSPRNG-backed uuid.
create or replace function public.generate_family_code()
returns text
language plpgsql volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  code  text;
  i     int;
begin
  loop
    bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    code := '';
    for i in 0..5 loop
      code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.families where family_code = code);
  end loop;
  return code;
end;
$$;


-- ---------------------------------------------------------------------
-- 3. ONBOARDING RPCs (the only way to create a profile)
-- ---------------------------------------------------------------------

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
  insert into public.families (name, family_code)
  values (trim(p_family_name), code)
  returning id into fid;

  insert into public.profiles (id, family_id, display_name, role, ui_mode, preferred_lang)
  values (uid, fid, trim(p_display_name), p_role, p_ui_mode, p_lang);

  return jsonb_build_object('ok', true, 'family_id', fid, 'family_code', code);
end;
$$;

create or replace function public.join_family(
  p_code         text,
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
  fam public.families%rowtype;
  members int;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if exists (select 1 from public.profiles where id = uid) then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_IN_FAMILY');
  end if;

  -- Max 10 wrong codes per 15 minutes per user.
  if (select count(*) from public.join_attempts
       where user_id = uid and attempted_at > now() - interval '15 minutes') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'TOO_MANY_ATTEMPTS');
  end if;

  select * into fam from public.families where family_code = upper(trim(p_code));
  if not found then
    insert into public.join_attempts (user_id) values (uid);
    return jsonb_build_object('ok', false, 'error', 'INVALID_CODE');
  end if;

  select count(*) into members from public.profiles where family_id = fam.id;
  if members >= 30 then
    return jsonb_build_object('ok', false, 'error', 'FAMILY_FULL');
  end if;

  insert into public.profiles (id, family_id, display_name, role, ui_mode, preferred_lang)
  values (uid, fam.id, trim(p_display_name), p_role, p_ui_mode, p_lang);

  return jsonb_build_object('ok', true, 'family_id', fam.id, 'family_name', fam.name);
end;
$$;


-- ---------------------------------------------------------------------
-- 4. CREDITS & BILLING (service_role only)
-- ---------------------------------------------------------------------

-- Atomic credit spend. One UPDATE ... WHERE credits_remaining > 0 means two
-- concurrent requests can never push the balance below zero.
-- Premium families are never decremented.
create or replace function public.consume_family_credit(p_family_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  if public.is_family_premium(p_family_id) then
    return jsonb_build_object('ok', true, 'premium', true, 'credits_remaining', null);
  end if;

  update public.families
     set credits_remaining = credits_remaining - 1
   where id = p_family_id
     and credits_remaining > 0
  returning credits_remaining into remaining;

  if not found then
    return jsonb_build_object('ok', false, 'premium', false, 'reason', 'NO_CREDITS', 'credits_remaining', 0);
  end if;

  return jsonb_build_object('ok', true, 'premium', false, 'credits_remaining', remaining);
end;
$$;

-- Called by the PayOS webhook. Idempotent: a repeated webhook for the same
-- order finds the transaction no longer 'pending' and does nothing.
-- Renewals stack: new expiry = max(now, current expiry) + plan length.
create or replace function public.activate_premium_from_order(p_order_code bigint, p_amount integer)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  t public.transactions%rowtype;
  new_expiry timestamptz;
begin
  update public.transactions
     set status = 'paid', paid_at = now()
   where order_code = p_order_code
     and status = 'pending'
     and amount = p_amount
  returning * into t;

  if not found then
    return jsonb_build_object('activated', false, 'reason', 'NOT_PENDING_OR_AMOUNT_MISMATCH');
  end if;

  update public.families
     set subscription_tier = 'premium',
         premium_expires_at =
           greatest(coalesce(premium_expires_at, now()), now())
           + case t.plan_type when 'yearly' then interval '1 year' else interval '1 month' end
   where id = t.family_id
  returning premium_expires_at into new_expiry;

  return jsonb_build_object('activated', true, 'family_id', t.family_id, 'premium_expires_at', new_expiry);
end;
$$;


-- ---------------------------------------------------------------------
-- 5. TRIGGERS
-- ---------------------------------------------------------------------

-- A user may edit their profile, but never move themselves to another family.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id or new.family_id <> old.family_id then
    raise exception 'PROFILE_IMMUTABLE_FIELD' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_trg
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- Free tier: 20 memory leaves. Premium: unlimited. Enforced in the database,
-- so no client can bypass it.
create or replace function public.memories_enforce_limit()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  free_limit constant integer := 20;
begin
  if not public.is_family_premium(new.family_id)
     and (select count(*) from public.memories where family_id = new.family_id) >= free_limit then
    raise exception 'FREE_MEMORY_LIMIT_REACHED' using errcode = 'check_violation',
      hint = 'Upgrade to Premium for unlimited memories';
  end if;
  return new;
end;
$$;

create trigger memories_limit_trg
  before insert on public.memories
  for each row execute function public.memories_enforce_limit();


-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.families      enable row level security;
alter table public.profiles      enable row level security;
alter table public.memories      enable row level security;
alter table public.ai_messages   enable row level security;
alter table public.reminders     enable row level security;
alter table public.transactions  enable row level security;
alter table public.join_attempts enable row level security;  -- no policies = no access

-- families: members can read their own family. No client writes. Ever.
create policy families_select on public.families
  for select to authenticated
  using (id = public.current_family_id());

-- profiles: read the whole family, edit only yourself. Creation only via RPC.
create policy profiles_select on public.profiles
  for select to authenticated
  using (family_id = public.current_family_id());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- memories: family reads; Time Capsules stay sealed (visible only to their
-- author) until unlock_date passes.
create policy memories_select on public.memories
  for select to authenticated
  using (
    family_id = public.current_family_id()
    and (unlock_date is null or unlock_date <= now() or author_id = auth.uid())
  );

create policy memories_insert on public.memories
  for insert to authenticated
  with check (family_id = public.current_family_id() and author_id = auth.uid());

create policy memories_update_own on public.memories
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and family_id = public.current_family_id());

create policy memories_delete_own on public.memories
  for delete to authenticated
  using (author_id = auth.uid());

-- ai_messages: PRIVATE per user (a teen's chats are not shown to parents).
-- Inserts happen server-side with the service role; users may clear their history.
create policy ai_messages_select_own on public.ai_messages
  for select to authenticated
  using (user_id = auth.uid());

create policy ai_messages_delete_own on public.ai_messages
  for delete to authenticated
  using (user_id = auth.uid());

-- reminders: whole family can see and tick them off; target must be a family member.
create policy reminders_select on public.reminders
  for select to authenticated
  using (family_id = public.current_family_id());

create policy reminders_insert on public.reminders
  for insert to authenticated
  with check (
    family_id = public.current_family_id()
    and created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
       where p.id = target_user_id and p.family_id = public.current_family_id()
    )
  );

create policy reminders_update on public.reminders
  for update to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

create policy reminders_delete_creator on public.reminders
  for delete to authenticated
  using (created_by = auth.uid());

-- transactions: family can see its billing history; writes are server-only.
create policy transactions_select on public.transactions
  for select to authenticated
  using (family_id = public.current_family_id());


-- ---------------------------------------------------------------------
-- 7. PRIVILEGES (defence in depth on top of RLS)
-- ---------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke insert, update, delete on public.families, public.transactions from authenticated;
revoke insert, update on public.ai_messages from authenticated;
revoke insert, update, delete on public.profiles from authenticated;
grant  update (display_name, ui_mode, preferred_lang, avatar_url) on public.profiles to authenticated;
revoke all on public.join_attempts from authenticated;

-- Functions are executable by PUBLIC by default. Lock them down explicitly.
revoke execute on function public.consume_family_credit(uuid)              from public, anon, authenticated;
revoke execute on function public.activate_premium_from_order(bigint, integer) from public, anon, authenticated;
grant  execute on function public.consume_family_credit(uuid)              to service_role;
grant  execute on function public.activate_premium_from_order(bigint, integer) to service_role;

revoke execute on function public.create_family(text, text, text, text, text) from public, anon;
revoke execute on function public.join_family(text, text, text, text, text)   from public, anon;
grant  execute on function public.create_family(text, text, text, text, text) to authenticated;
grant  execute on function public.join_family(text, text, text, text, text)   to authenticated;

revoke execute on function public.generate_family_code() from public, anon, authenticated;
revoke execute on function public.current_family_id()    from public, anon;
revoke execute on function public.is_family_premium(uuid) from public, anon;
grant  execute on function public.current_family_id()    to authenticated, service_role;
grant  execute on function public.is_family_premium(uuid) to authenticated, service_role;


-- ---------------------------------------------------------------------
-- 8. REALTIME (live "X free uses left" badge)
-- ---------------------------------------------------------------------
-- Realtime applies the families_select policy, so a user only receives
-- updates for their own family.
do $$
begin
  alter publication supabase_realtime add table public.families;
exception when duplicate_object then null;
end $$;


-- ---------------------------------------------------------------------
-- 9. STORAGE: private bucket for family photos & voice notes
-- ---------------------------------------------------------------------
-- Object path convention: <family_id>/<anything>   e.g. 3f2a.../memories/abc.webp
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'family-media', 'family-media', false, 10485760,
  array['image/jpeg','image/png','image/webp','audio/webm','audio/mpeg','audio/mp4','audio/ogg','audio/wav']
)
on conflict (id) do nothing;

create policy family_media_select on storage.objects
  for select to authenticated
  using (bucket_id = 'family-media'
         and (storage.foldername(name))[1] = public.current_family_id()::text);

create policy family_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'family-media'
              and (storage.foldername(name))[1] = public.current_family_id()::text);

create policy family_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'family-media'
         and (storage.foldername(name))[1] = public.current_family_id()::text);
