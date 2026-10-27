create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id) on delete cascade,
  player_name text not null check (char_length(player_name) between 1 and 10),
  score       int  not null check (score between 0 and 10000000),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);

alter table public.scores enable row level security;

create policy "scores_select_anon" on public.scores
  for select to anon, authenticated using (true);

create policy "scores_insert_anon" on public.scores
  for insert to anon, authenticated with check (true);

create view public.leaderboard with (security_invoker = true) as
select game_id, player_name, best_score, achieved_at,
       rank() over (partition by game_id order by best_score desc) as rank
from (
  select distinct on (game_id, player_name)
         game_id, player_name, score as best_score, created_at as achieved_at
  from public.scores
  order by game_id, player_name, score desc, created_at asc
) b;
