-- =====================================================================
-- GENFUSE 005: in-app rating and feedback.
-- Signed-in users can INSERT feedback as themselves; nobody can read it
-- from the app (read it in the Supabase dashboard / with the service role).
-- category keys: ui (giao diện), games (trò chơi), ai (AI), other (góp ý khác)
-- =====================================================================
create table if not exists public.app_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  family_id   uuid references public.families (id) on delete set null,
  rating      integer not null check (rating between 1 and 5),
  category    text not null check (category in ('ui', 'games', 'ai', 'other')),
  comment     text check (comment is null or char_length(comment) <= 1000),
  created_at  timestamptz not null default now()
);
create index if not exists app_feedback_created_idx on public.app_feedback (created_at desc);

alter table public.app_feedback enable row level security;

drop policy if exists app_feedback_insert_own on public.app_feedback;
create policy app_feedback_insert_own on public.app_feedback
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (family_id is null or family_id = public.current_family_id())
  );

revoke all on public.app_feedback from anon, authenticated;
grant insert (user_id, family_id, rating, category, comment) on public.app_feedback to authenticated;

-- Soft spam guard: at most 10 feedback messages per user per day.
create or replace function public.app_feedback_limit()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if (select count(*) from public.app_feedback
       where user_id = new.user_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'FEEDBACK_LIMIT' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists app_feedback_limit_trg on public.app_feedback;
create trigger app_feedback_limit_trg before insert on public.app_feedback
  for each row execute function public.app_feedback_limit();
