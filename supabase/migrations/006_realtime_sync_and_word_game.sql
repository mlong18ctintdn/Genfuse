-- =====================================================================
-- GENFUSE 006: Realtime row sync for the chore wheel and Ô Ăn Quan,
-- and the "Đố chữ gia đình" word game. Run after 005.
-- =====================================================================

-- Chore wheel: the full spin (segments, landing angle, turns, winner) is stored on the
-- history row, so every phone can replay the same animation from a postgres_changes INSERT.
alter table public.chore_spins add column if not exists payload jsonb;

-- Ô Ăn Quan: the last move (square + direction) lets the other phone animate it from the UPDATE.
alter table public.oaq_games add column if not exists last_move jsonb;

-- ---------------------------------------------------------------------
-- Đố chữ gia đình
-- ---------------------------------------------------------------------
create table if not exists public.word_games (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  host_id     uuid references auth.users (id) on delete set null,
  category    text not null check (category in ('idiom', 'genz', 'family')),
  lang        text not null check (lang in ('vi', 'en', 'zh', 'es')),
  clue        text not null,
  cells       jsonb not null,                 -- e.g. ["b","_","n","h"," ","_"]; "_" = hidden letter
  guesses     jsonb not null default '[]',    -- [{id,by,name,text,ok,at}]
  hints       jsonb not null default '[]',    -- [{by,name,text,at}] AI hints
  reveals     integer not null default 0,
  status      text not null default 'playing' check (status in ('playing', 'solved', 'gave_up')),
  solution    text,                           -- only filled when the game ends
  solved_by   uuid references auth.users (id) on delete set null,
  move_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists word_games_family_idx on public.word_games (family_id, created_at desc);

-- The answer lives in its own table: Realtime would send every column of word_games to all
-- family phones, so the secret must never be a column there. No policy = no client access.
create table if not exists public.word_secrets (
  game_id  uuid primary key references public.word_games (id) on delete cascade,
  answer   text not null
);
alter table public.word_secrets enable row level security;
revoke all on public.word_secrets from anon, authenticated;

alter table public.word_games enable row level security;
drop policy if exists word_games_select on public.word_games;
create policy word_games_select on public.word_games
  for select to authenticated using (family_id = public.current_family_id());
revoke all on public.word_games from anon, authenticated;
grant select on public.word_games to authenticated;

-- ---------------------------------------------------------------------
-- Realtime publication (tolerates re-runs)
-- ---------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.chore_spins; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.chore_items; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.oaq_games;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.word_games;  exception when duplicate_object then null; end;
end $$;
