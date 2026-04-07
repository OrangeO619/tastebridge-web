const fs=require("fs");
const sql=[
  "-- 005_follows: 关注关系表",
  "create table if not exists public.follows (",
  "  id bigserial primary key,",
  "  follower_id uuid not null references auth.users(id) on delete cascade,",
  "  following_id uuid not null references auth.users(id) on delete cascade,",
  "  created_at timestamptz not null default now(),",
  "  unique(follower_id, following_id)",
  ");",
  "",
  "alter table public.follows enable row level security;",
  "create policy if not exists follows_read on public.follows for select using (true);",
  "create policy if not exists follows_write on public.follows for all using (auth.uid() = follower_id);",
].join("\n");
fs.writeFileSync("supabase/migrations/005_follows.sql",sql,"utf8");
console.log("005_follows.sql ok");
