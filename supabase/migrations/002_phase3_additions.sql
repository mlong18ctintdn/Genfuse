-- =====================================================================
-- GENFUSE v2.0 — migration 002 (Phase 3): replies to memories + story game.
-- Run AFTER 001_genfuse_schema.sql.
-- =====================================================================

-- 1. A memory can be a reply to another memory (invites another generation to answer).
alter table public.memories
  add column if not exists parent_memory_id uuid references public.memories (id) on delete set null;

drop policy if exists memories_insert on public.memories;
create policy memories_insert on public.memories
  for insert to authenticated
  with check (
    family_id = public.current_family_id()
    and author_id = auth.uid()
    and (
      parent_memory_id is null
      or exists (
        select 1 from public.memories m
         where m.id = parent_memory_id and m.family_id = public.current_family_id()
      )
    )
  );

-- 2. Turn-based co-storytelling game.
create table if not exists public.story_games (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  -- [{ "author_id": uuid|null, "name": text, "kind": "player"|"narrator", "text": text }]
  sentences   jsonb not null default '[]'::jsonb,
  status      text not null default 'open' check (status in ('open', 'finished')),
  created_at  timestamptz not null default now()
);
create index if not exists story_games_family_idx on public.story_games (family_id, created_at desc);

alter table public.story_games enable row level security;

create policy story_games_select on public.story_games
  for select to authenticated
  using (family_id = public.current_family_id());

-- Clients may create a story; every later change goes through append_story_sentence()
-- on the server, which enforces turn order and the narrator credit.
create policy story_games_insert on public.story_games
  for insert to authenticated
  with check (family_id = public.current_family_id() and created_by = auth.uid());

revoke insert, update, delete on public.story_games from authenticated;
grant  insert (family_id, created_by, title) on public.story_games to authenticated;
revoke all on public.story_games from anon;

-- Atomic append (jsonb || in a single UPDATE, so two players cannot overwrite each other).
create or replace function public.append_story_sentence(
  p_story_id  uuid,
  p_family_id uuid,
  p_sentence  jsonb
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  update public.story_games
     set sentences = sentences || jsonb_build_array(p_sentence)
   where id = p_story_id
     and family_id = p_family_id
     and status = 'open'
     and jsonb_array_length(sentences) < 60
  returning sentences into result;

  if not found then
    return null;
  end if;
  return result;
end;
$$;

revoke execute on function public.append_story_sentence(uuid, uuid, jsonb) from public, anon, authenticated;
grant  execute on function public.append_story_sentence(uuid, uuid, jsonb) to service_role;

-- Live turns for everyone in the family (Realtime respects the select policy).
do $$
begin
  alter publication supabase_realtime add table public.story_games;
exception when duplicate_object then null;
end $$;
