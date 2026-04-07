-- 005_follows: 关注关系表
create table if not exists public.follows (
  id bigserial primary key,
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id, following_id)
);

alter table public.follows enable row level security;

drop policy if exists follows_read on public.follows;
create policy follows_read on public.follows for select using (true);

drop policy if exists follows_write on public.follows;
create policy follows_write on public.follows for all using (auth.uid() = follower_id);