-- =====================================================================
-- GENFUSE 004: free game uses (10 per family), next to the 5 free AI uses.
-- The AI counter keeps its original column (credits_remaining, default 5);
-- free_ai_uses is a generated read-only alias so both names work in queries.
-- Counters live on public.families (one pool per family, shared by members).
-- =====================================================================

alter table public.families
  add column if not exists free_game_uses integer not null default 10
  check (free_game_uses >= 0);

alter table public.families
  add column if not exists free_ai_uses integer generated always as (credits_remaining) stored;

-- Same pattern as consume_family_credit: one atomic UPDATE, premium is never charged,
-- executable by service_role only (clients cannot spend or refill their own uses).
create or replace function public.consume_family_game_use(p_family_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  if public.is_family_premium(p_family_id) then
    return jsonb_build_object('ok', true, 'premium', true, 'free_game_uses', null);
  end if;

  update public.families
     set free_game_uses = free_game_uses - 1
   where id = p_family_id
     and free_game_uses > 0
  returning free_game_uses into remaining;

  if not found then
    return jsonb_build_object('ok', false, 'premium', false, 'reason', 'NO_GAME_USES', 'free_game_uses', 0);
  end if;

  return jsonb_build_object('ok', true, 'premium', false, 'free_game_uses', remaining);
end;
$$;

revoke execute on function public.consume_family_game_use(uuid) from public, anon, authenticated;
grant  execute on function public.consume_family_game_use(uuid) to service_role;

-- Clients must not be able to edit the counters: confirm no UPDATE privilege on families.
revoke update on public.families from anon, authenticated;
